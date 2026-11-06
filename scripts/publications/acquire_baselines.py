#!/usr/bin/env python3
"""Private, bounded baseline acquisition; offline replay never opens a socket.

Exactly the reviewed eleven matched queries plus five science queries. No stage,
publication, scheduling, account writes, credential values or anonymous fallback.
"""
from __future__ import annotations

import datetime as dt
import gzip
import hashlib
import json
import os
from pathlib import Path
import sys
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).resolve().parent))
import acquire
import matched_baselines
import refresh
from transport import CurlTransport, curl_command

ROOT = Path(__file__).resolve().parents[2]
CONTRACT_VERSION = 'atlas.openalex-baseline-acquisition.v1'
CAP_CREDITS = 50
RESERVE_CREDITS = 1000


def plan():
    # Do not retype/normalize filters, types, corpus defaults or parameter types.
    queries = matched_baselines.acquisition_plan() + [
        {'id': 'science-' + ident, 'path': '/works', 'params': params, 'label': label}
        for ident, label, params in refresh.science_plan()]
    if len(queries) != 16 or len({q['id'] for q in queries}) != 16:
        raise ValueError('Reviewed sixteen-query contract required')
    for query in queries:
        curl_command(query['path'], query['params'])
    return {'version': CONTRACT_VERSION, 'queries': queries,
            'matchedMethod': matched_baselines.METHOD, 'primaryMethod': refresh.derive.METHOD_ID,
            'completeThrough': '2025-12-31', 'capCredits': CAP_CREDITS,
            'reserveCredits': RESERVE_CREDITS}


def fresh_private_root(path):
    root = Path(path).resolve()
    if root.exists() or root == ROOT or ROOT in root.parents or root in ROOT.parents:
        raise ValueError('Fresh private output outside repository required')
    return root


def verified_receipt(receipts, query):
    """Read the original verified body and its actual acquisition metadata."""
    value = receipts.get(query['path'], query['params'])
    request = {'method': 'GET', 'origin': 'https://api.openalex.org',
               'path': query['path'], 'params': query['params']}
    key = hashlib.sha256(acquire.canonical(request)).hexdigest()
    metadata_bytes = (receipts.raw / (key + '.json')).read_bytes()
    receipt = json.loads(metadata_bytes)
    required = {'request', 'http_status', 'started_at', 'completed_at',
                'body_sha256', 'body_file', 'quota'}
    if set(receipt) != required or type(receipt['http_status']) is not int or receipt['http_status'] != 200:
        raise ValueError('Incomplete/invalid original receipt metadata')
    try:
        start, end = (dt.datetime.fromisoformat(receipt[k]) for k in ('started_at', 'completed_at'))
        if start.utcoffset() is None or end.utcoffset() is None or start > end:
            raise ValueError('Invalid acquisition interval')
    except (TypeError, ValueError):
        raise ValueError('Invalid original acquisition timestamps') from None
    quota = receipt['quota']
    if not isinstance(quota, dict) or set(quota) - {'credits_remaining', 'credits_used_this_request'} or any(
            type(v) is not int or v < 0 for v in quota.values()):
        raise ValueError('Invalid allowlisted quota metadata')
    if receipt['request'] != request or receipt['body_file'] != key + '.json.gz':
        raise ValueError('Original receipt identity mismatch')
    body = gzip.decompress((receipts.raw / receipt['body_file']).read_bytes())
    if hashlib.sha256(body).hexdigest() != receipt['body_sha256'] or json.loads(body) != value:
        raise ValueError('Original receipt checksum mismatch')
    return receipt, body, hashlib.sha256(metadata_bytes).hexdigest()


def export(root, receipts):
    contract = plan()
    raw_inventory, outputs = [], []
    (root / 'science').mkdir(mode=0o700)
    (root / 'matched').mkdir(mode=0o700)
    for q in contract['queries']:
        receipt, body, metadata_sha = verified_receipt(receipts, q)
        common = {'http_status': receipt['http_status'], 'rawBodySha256': receipt['body_sha256'],
                  'rawReceiptSha256': metadata_sha, 'started_at': receipt['started_at'],
                  'completed_at': receipt['completed_at']}
        key = receipt['body_file'].removesuffix('.json.gz')
        raw_inventory.append({'id': q['id'], 'receipt': key + '.json',
                              'receiptSha256': metadata_sha, 'bodySha256': receipt['body_sha256'],
                              'http_status': receipt['http_status'], 'started_at': receipt['started_at'],
                              'completed_at': receipt['completed_at']})
        if q['id'].startswith('science-'):
            ident = q['id'].removeprefix('science-')
            target = root / 'science' / (ident + '.response.json')
            target.write_bytes(body)
            request = {**common, 'url': 'https://api.openalex.org' + q['path'],
                       'params': q['params'], 'complete': True,
                       'responseSha256': receipt['body_sha256'], 'retrievedAt': receipt['completed_at']}
            acquire.atomic_json(root / 'science' / (ident + '.request.json'), request)
        else:
            envelope = {**common, 'request_parameters': q['params'],
                        'url': 'https://api.openalex.org' + q['path'] + '?' + urlencode(q['params']),
                        'retrieved_at': receipt['completed_at'], 'response': json.loads(body),
                        'response_headers': {}, 'measurement': q['measurement']}
            matched_baselines._validated(envelope, q)
            acquire.atomic_json(root / 'matched' / q['filename'], envelope)
    # Use the actual consumers as completeness gates before finalizing success.
    refresh.read_science(root / 'science')
    matched_baselines.derive(matched_baselines.load_receipts(root / 'matched'))
    for directory in ('science', 'matched'):
        for path in sorted((root / directory).glob('*.json')):
            outputs.append({'file': directory + '/' + path.name, 'sha256': acquire.sha_file(path)})
    manifest = {'schema': CONTRACT_VERSION, 'status': 'complete', 'query_count': len(raw_inventory),
                'contract': contract, 'contract_sha256': hashlib.sha256(acquire.canonical(contract)).hexdigest(),
                'acquisition_started_at': min(r['started_at'] for r in raw_inventory),
                'acquisition_completed_at': max(r['completed_at'] for r in raw_inventory),
                'raw_receipts': raw_inventory, 'outputs': outputs}
    acquire.atomic_json(root / 'manifest.json', manifest)
    return manifest


def run(out, *, transport=None):
    root = fresh_private_root(out)
    with acquire.acquisition_lock():
        transport = CurlTransport() if transport is None else transport
        budget = acquire.Budget(transport, root / 'budget.json', cap=CAP_CREDITS, reserve=RESERVE_CREDITS)
        if budget.available - RESERVE_CREDITS < len(plan()['queries']):
            raise acquire.BudgetStop('Insufficient free quota for complete baseline acquisition')
        root.mkdir(parents=True, mode=0o700)
        receipts = acquire.Receipts(root, transport, budget)
        return export(root, receipts)


def replay(source, out):
    """Deterministic, self-contained replay. Source is read-only; no quota/lock."""
    source, root = Path(source).resolve(), fresh_private_root(out)
    if root == source or source in root.parents or root in source.parents:
        raise ValueError('Source and output must be disjoint')
    manifest_bytes = (source / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    if manifest['contract'] != plan() or manifest['status'] != 'complete':
        raise ValueError('Reviewed complete baseline contract required')
    expected_outputs = sorted(['matched/' + q['filename'] for q in matched_baselines.acquisition_plan()] + [
        'science/' + ident + suffix for ident, _, _ in refresh.science_plan()
        for suffix in ('.request.json', '.response.json')])
    if sorted(o['file'] for o in manifest['outputs']) != expected_outputs or manifest['query_count'] != 16:
        raise ValueError('Exact baseline output inventory required')
    if len(manifest['raw_receipts']) != 16:
        raise ValueError('Exact raw baseline receipt inventory required')
    for q, entry in zip(plan()['queries'], manifest['raw_receipts'], strict=True):
        request = {'method': 'GET', 'origin': 'https://api.openalex.org', 'path': q['path'], 'params': q['params']}
        filename = hashlib.sha256(acquire.canonical(request)).hexdigest() + '.json'
        if entry['id'] != q['id'] or entry['receipt'] != filename:
            raise ValueError('Raw receipt path/identity mismatch')
    for output in manifest['outputs']:
        if acquire.sha_file(source / output['file']) != output['sha256']:
            raise ValueError('Source output integrity mismatch')
    receipts = acquire.Receipts(source, None, offline=True)
    for q, entry in zip(plan()['queries'], manifest['raw_receipts'], strict=True):
        receipt, _, metadata_sha = verified_receipt(receipts, q)
        if metadata_sha != entry['receiptSha256'] or receipt['body_sha256'] != entry['bodySha256']:
            raise ValueError('Original receipt metadata integrity mismatch')
    root.mkdir(parents=True, mode=0o700)
    raw = root / 'raw'
    raw.mkdir(mode=0o700)
    for entry in manifest['raw_receipts']:
        filename = entry['receipt']
        (raw / filename).write_bytes((source / 'raw' / filename).read_bytes())
        body_file = filename.removesuffix('.json') + '.json.gz'
        (raw / body_file).write_bytes((source / 'raw' / body_file).read_bytes())
    result = export(root, acquire.Receipts(root, None, offline=True))
    if acquire.canonical(result) != manifest_bytes or (source / 'manifest.json').read_bytes() != manifest_bytes:
        (root / 'manifest.json').unlink()
        raise ValueError('Offline baseline replay disagrees with original manifest')
    return result


def main(argv=None):
    os.umask(0o077)
    parser = acquire.SafeParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True, parser_class=acquire.SafeParser)
    sub.add_parser('plan')
    for command in ('acquire', 'replay'):
        cli = sub.add_parser(command)
        cli.add_argument('--private-run-dir', type=Path, required=True)
        if command == 'replay':
            cli.add_argument('--source-run-dir', type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == 'plan':
            result = plan()
        elif args.command == 'acquire':
            result = run(args.private_run_dir)
        else:
            result = replay(args.source_run_dir, args.private_run_dir)
        # No arbitrary response/exception text, private paths, quota account fields or auth.
        print(json.dumps(result if args.command == 'plan' else {
            k: result[k] for k in ('status', 'query_count', 'contract_sha256',
                                  'acquisition_started_at', 'acquisition_completed_at')}))
        return 0
    except acquire.BudgetStop:
        print('Baseline acquisition stopped: free budget or shared lock; no success manifest', file=sys.stderr)
        return 3
    except Exception as error:
        print('Baseline acquisition refused (' + type(error).__name__ + '); no success manifest', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
