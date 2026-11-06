#!/usr/bin/env python3
"""Primary publication refresh: private acquisition and offline staging are separate.

Never starts acquisition when staging. No cron, deployment, Slack, or publication.
"""
from __future__ import annotations

import argparse
from contextlib import closing
from collections import defaultdict
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
import acquire
import derive
import matched_baselines

ROOT = Path(__file__).resolve().parents[2]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def jsonl_hash(rows):
    digest = hashlib.sha256()
    for row in rows:
        digest.update(acquire.canonical(row))
        digest.update(b'\n')
    return digest.hexdigest()


def documented_history_coverage(manifest_bytes, *, test_only=False):
    """Reviewed source contract, reconfirmed Nov 6 2026; no network during stage.

    The official common-attributes contract covers every author publication year
    and citation years from 2012, not the stale ten-year-window search snippet.
    Missing successful sparse bins are zero ONLY under that documented contract.
    """
    return {'schemaVersion': 1, 'testOnly': test_only,
            'acquisitionManifestSha256': sha(manifest_bytes), 'publicationHistoryComplete': True,
            'citationYearsComplete': list(range(2012, 2026)),
            'basis': 'https://help.openalex.org/data/common-attributes ; direct author counts_by_year covers every publication year and citations from 2012; missing profiles use separately receipted complete all-corpus all-type work reconstruction, never zeros; source contract reconfirmed 2026-11-06'}


def adapt_primary(source, history_coverage, minimum_known_share, *, test_only=False):
    """Replay complete source receipts without sockets/locks; export canonical IDs.

    counts_by_year is NOT lifetime completeness proof. A separately substantiated,
    manifest-bound coverage attestation is mandatory; no default is manufactured.
    """
    source = Path(source).resolve()
    manifest_bytes = (source / 'manifest.json').read_bytes()
    receipt = derive.parse_json(manifest_bytes.decode())
    contract = {'method': acquire.METHOD,
                'required_slices': [{'topic': t, 'year': y} for t, y in acquire.slices()]}
    derive.require(receipt['status'] == 'complete' and receipt['schema'] == 'atlas.openalex-primary.manifest.v1', 'complete primary receipt required')
    derive.require((source / 'method.json').read_bytes() == acquire.canonical(contract), 'reviewed complete acquisition method required')
    derive.require(receipt['method_sha256'] == sha(acquire.canonical(contract)), 'acquisition method hash mismatch')
    derive.require(receipt['normalized_file'] == 'normalized.sqlite' and receipt['method_file'] == 'method.json', 'unapproved source filenames')
    derive.require(acquire.sha_file(source / 'normalized.sqlite') == receipt['normalized_sha256'], 'normalized input checksum mismatch')
    derive.require(0 < minimum_known_share <= 1 and type(minimum_known_share) in (int, float), 'explicit positive coverage threshold required')
    derive.keys(history_coverage, ('schemaVersion', 'testOnly', 'acquisitionManifestSha256', 'publicationHistoryComplete', 'citationYearsComplete', 'basis'))
    derive.require(history_coverage['schemaVersion'] == 1 and history_coverage['testOnly'] is test_only and
                   history_coverage['acquisitionManifestSha256'] == sha(manifest_bytes), 'history attestation must bind this acquisition and test mode')
    derive.require(history_coverage['publicationHistoryComplete'] is True and
                   set(range(2017, 2025)) <= set(history_coverage['citationYearsComplete']) and
                   isinstance(history_coverage['basis'], str) and 0 < len(history_coverage['basis']) <= 1000,
                   'substantiated lifetime publication/prior-five citation coverage required')
    raw = acquire.Receipts(source, None, offline=True)
    derive.require(raw.inventory() == receipt['raw_receipts'], 'raw receipt inventory mismatch')
    (ROOT / '.qa').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='publications-replay-', dir=ROOT / '.qa') as temporary:
        replay_root = Path(temporary) / 'replay'
        replay = acquire.run_acquisition(replay_root, raw)
        for field in ('required_slices', 'completed_slices', 'works_count', 'authors_count',
                      'acquisition_started_at', 'acquisition_completed_at', 'source_max_updated_date', 'author_history_reconstructions'):
            derive.require(replay[field] == receipt[field], 'offline source replay disagrees with receipt: ' + field)
        def read_db(path):
            with closing(sqlite3.connect(path.as_uri() + '?mode=ro&immutable=1', uri=True)) as db:
                return ([derive.parse_json(row[0]) for row in db.execute('select payload from works order by id')],
                        [derive.parse_json(row[0]) for row in db.execute('select payload from authors order by id')])
        with closing(sqlite3.connect((source / 'normalized.sqlite').as_uri() + '?mode=ro&immutable=1', uri=True)) as original, \
             closing(sqlite3.connect((replay_root / 'normalized.sqlite').as_uri() + '?mode=ro&immutable=1', uri=True)) as repeated:
            for table in ('works', 'authors'):
                for left, right in zip(original.execute('select id,payload from ' + table + ' order by id'),
                                       repeated.execute('select id,payload from ' + table + ' order by id'), strict=True):
                    derive.require(left == right, 'normalized rows disagree with independent raw replay')
        works, histories = read_db(source / 'normalized.sqlite')
    def full(value, kind):
        derive.require(isinstance(value, str) and re.fullmatch(kind + r'[1-9][0-9]*', value), 'invalid acquisition short identifier')
        return 'https://openalex.org/' + value
    for w in works:
        w['id'] = full(w['id'], 'W')
        for a in w['authorships']:
            if a['author_id'] is not None:
                a['author_id'] = full(a['author_id'], 'A')
            for institution in a['institutions']:
                if institution['id'] is not None:
                    institution['id'] = full(institution['id'], 'I')
    for h in histories:
        h['author_id'] = full(h['author_id'], 'A')
    ids = sorted(h['author_id'] for h in histories)
    captured = receipt['acquisition_completed_at']
    receipt_times = defaultdict(list)
    for entry in receipt['raw_receipts']:
        raw_receipt = derive.read_json(source / 'raw' / entry['receipt'])
        request = raw_receipt['request']
        is_author = request['path'] == '/authors' or request['params'].get('filter', '').startswith('author.id:')
        receipt_times['authors' if is_author else 'works'].append(raw_receipt['completed_at'])
    work_captured = max(receipt_times['works'], key=derive.timestamp)
    author_captured = max(receipt_times['authors'], key=derive.timestamp) if histories else work_captured
    manifest = {'schema_version': 1, 'source_url': 'https://api.openalex.org', 'corpus': 'core',
                'test_only': test_only, 'complete_years': list(range(2000, 2026)),
                'observed_through': acquire.METHOD['end_date'],
                'works': {'sha256': jsonl_hash(works), 'complete': True, 'acquired_at': work_captured,
                          'full_bylines': True, 'slices': [{'topic_id': s['topic'], 'year': s['year'],
                          'row_count': s['seen'], 'complete': True} for s in receipt['completed_slices']]},
                'author_histories': {'sha256': jsonl_hash(histories), 'complete': True, 'acquired_at': author_captured,
                                    'expected_author_ids': ids, 'completed_author_ids': ids,
                                    'publication_history_complete': history_coverage['publicationHistoryComplete'],
                                    'citation_years_complete': history_coverage['citationYearsComplete']},
                'coverage_policy': {'minimum_known_share': {dim: minimum_known_share for dim in derive.AUTHOR_DIMS.values()}}}
    derive.validate_inputs(works, histories, manifest)
    derive.require((source / 'manifest.json').read_bytes() == manifest_bytes and
                   acquire.sha_file(source / 'normalized.sqlite') == receipt['normalized_sha256'], 'source changed while staging')
    proof = {'acquisitionManifestSha256': sha(manifest_bytes), 'normalizedSha256': receipt['normalized_sha256'],
             'acquisitionMethodSha256': receipt['method_sha256'], 'historyCoverageSha256': derive.digest(history_coverage),
             'acquisitionStartedAt': receipt['acquisition_started_at'], 'acquisitionCompletedAt': captured,
             'rawReceiptCount': len(receipt['raw_receipts'])}
    return works, histories, manifest, proof


DOMAINS = (('all', 'All science', None), ('life', 'Life sciences', '1'),
           ('social', 'Social sciences', '2'), ('physical', 'Physical sciences', '3'),
           ('health', 'Health sciences', '4'))


def science_plan():
    return [(ident, label, {'filter': 'publication_year:2022-2025,type:article|review|conference-paper|book-chapter|preprint' +
             (',primary_topic.domain.id:' + domain if domain else ''),
             'group_by': 'publication_year', 'per_page': '100', 'corpus': 'core'})
            for ident, label, domain in DOMAINS]


def read_science(source):
    """Exact actual request/response contract, never relabel a rows.json export."""
    rows, times, evidence = [], [], {}
    for ident, label, params in science_plan():
        response_bytes = (Path(source) / (ident + '.response.json')).read_bytes()
        receipt = derive.read_json(Path(source) / (ident + '.request.json'))
        derive.require(receipt['url'] == 'https://api.openalex.org/works' and receipt['params'] == params and
                       receipt['complete'] is True and receipt['responseSha256'] == sha(response_bytes), 'science source scope/hash mismatch')
        derive.timestamp(receipt['retrievedAt'])
        body = derive.parse_json(response_bytes.decode())
        groups = body['group_by']
        derive.require(body['meta']['groups_count'] == 4 and body['meta']['per_page'] == 100 and
                       len(groups) == 4 and {g['key'] for g in groups} == {'2022', '2023', '2024', '2025'}, 'incomplete science year cells')
        for group in groups:
            derive.integer(group['count'])
            rows.append({'group': label, 'year': int(group['key']), 'papers': group['count']})
        derive.integer(body['meta']['count'])
        derive.require(sum(g['count'] for g in groups) == body['meta']['count'], 'science totals mismatch')
        times.append(receipt['retrievedAt'])
        evidence[ident] = {'responseSha256': sha(response_bytes), 'requestSha256': derive.digest(receipt),
                           'retrievedAt': receipt['retrievedAt']}
    baseline = {'schema_version': 1, 'source_url': 'https://api.openalex.org', 'corpus': 'core',
                'types': list(derive.TYPES), 'acquired_at': max(times, key=derive.timestamp),
                'observed_through': '2025-12-31', 'complete': True,
                'method_id': 'openalex-primary-domain-work-count-v1', 'rows': sorted(rows, key=lambda r: (r['group'], r['year']))}
    return baseline, evidence


def build_snapshot(source, science, matched, history_coverage, minimum_known_share, *, test_only=False):
    works, histories, manifest, proof = adapt_primary(source, history_coverage, minimum_known_share, test_only=test_only)
    baseline, science_evidence = read_science(science)
    result = derive.derive(works, histories, manifest, science_baseline=baseline)
    selected = [w for w in derive.deduplicate(works) if derive.selected(w) and str(w['publication_year']) in matched_baselines.YEARS]
    venue_input = {'measurement': matched_baselines.COUNTING, 'selection': 'NT10-v1',
                   'completeYears': list(matched_baselines.YEARS), 'works': [
                       {k: w[k] for k in ('id', 'publication_year', 'type', 'primary_source_type', 'primary_topic_id', 'title', 'abstract')}
                       for w in selected]}
    numerators = {}
    method_ids = ('invasive', 'high', 'eeg', 'no-technique', 'bci', 'not-bci')
    method_rows = [r for t in ('neurotech_topics_table', 'neurotech_bciflag_table') for r in result['tables'][t]['rows']]
    evidence_id = 'owned-primary:' + result['source']['sourceHash']
    for gid, row in zip(method_ids, method_rows, strict=True):
        numerators[gid] = {'countUnit': 'OpenAlex work ID', 'counts': dict(zip(matched_baselines.YEARS, row[1:3])),
                           'countingMethod': derive.METHOD_ID, 'numeratorUniverse': 'NT10', 'evidence': [evidence_id]}
    for gid, label, dim in matched_baselines.GROUPS:
        if dim != 'author':
            continue
        dimension = 'career_stage' if gid in ('early', 'mid', 'late') else 'pedigree'
        counts = {year: sum((Fraction(*(int(v) for v in r['scaledFraction'])) for r in result['audit']['quarterlyFractionalOutput']
                  if r['dimension'] == dimension and r['group'] == label and str(r['year']) == year), Fraction())
                  for year in matched_baselines.YEARS}
        numerators[gid] = {'countUnit': 'author-fractional works', 'counts': {y: str(n) for y, n in counts.items()},
                           'countingMethod': derive.METHOD_ID + ':quarterly-known-scaled-exact',
                           'numeratorUniverse': 'P2 author-fractional', 'evidence': [evidence_id]}
    receipts = matched_baselines.load_receipts(matched)
    result['matchedGrowth'] = matched_baselines.derive(receipts, venue_numerator=venue_input, numerators=numerators)
    result['audit']['matchedBaselineStatus'] = 'partial-primary-matched-inventory'
    proof.update(scienceInputSha256=derive.digest(science_evidence), matchedInputSha256=derive.digest(receipts))
    proof['scienceEvidence'] = science_evidence
    proof['derivationManifestSha256'] = derive.digest(manifest)
    return result, proof



def validate_and_stage(snapshot, proof, out):
    """No network: production parser is imported locally by the TypeScript gate."""
    with tempfile.TemporaryDirectory(prefix='publications-candidate-', dir=ROOT / '.qa') as temporary:
        candidate, evidence = Path(temporary) / 'snapshot.json', Path(temporary) / 'proof.json'
        candidate.write_bytes(acquire.canonical(snapshot))
        evidence.write_bytes(acquire.canonical(proof))
        result = subprocess.run(['node', '--import', 'tsx', str(ROOT / 'scripts/weekly-publications-feed.ts'),
                                 '--stage-json', str(candidate), '--proof-json', str(evidence), '--out', str(out)],
                                cwd=ROOT, capture_output=True, timeout=300, check=False)
        derive.require(result.returncode == 0, 'production snapshot parser/staging gate refused; no feed written')
        return derive.parse_json(result.stdout.decode())


def stage_refresh(source, science, matched, out, minimum_known_share, *, history_coverage=None,
                  test_only=False, validator=validate_and_stage):
    """Independent weekly derivation lane; no acquisition, quota probe or lock."""
    source, science, matched, out = map(lambda p: Path(p).resolve(), (source, science, matched, out))
    derive.require(not out.exists() and (ROOT / '.qa') in out.parents, 'fresh .qa output required; never overwrite last-good/source')
    for path in (source, science, matched):
        derive.require(out != path and out not in path.parents and path not in out.parents, 'stage and source must be disjoint')
    if history_coverage is None:
        history_coverage = documented_history_coverage((source / 'manifest.json').read_bytes(), test_only=test_only)
    snapshot, proof = build_snapshot(source, science, matched, history_coverage, minimum_known_share, test_only=test_only)
    return validator(snapshot, proof, out)



def refresh_plan():
    """Reviewed source plan; transport compatibility is checked without dispatch."""
    from transport import curl_command
    queries = matched_baselines.acquisition_plan() + [
        {'id': 'science-' + ident, 'path': '/works', 'params': params, 'label': label}
        for ident, label, params in science_plan()]
    blockers = []
    try:
        for query in queries:
            curl_command(query['path'], query['params'])
    except ValueError:
        blockers.append('Shared transport.py allowlist does not permit group_by; parent must review this narrow baseline acquisition seam. No calls attempted.')
    return {'method': derive.METHOD_ID, 'source': 'https://api.openalex.org', 'completeThrough': '2025-12-31',
            'workers': 4, 'capCredits': 7000, 'reserveCredits': 1000,
            'baselineQueries': queries, 'canAcquireBaselines': not blockers, 'blockers': blockers,
            'cronActivated': False, 'publishes': False,
            'notificationPolicy': {'changedChannel': 'C0CFPQGLVKJ', 'screenshotsInPostThread': True, 'unchanged': 'quiet'}}



def main(argv=None):
    parser = acquire.SafeParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True, parser_class=acquire.SafeParser)
    sub.add_parser('plan')
    stage = sub.add_parser('stage')
    for name in ('source', 'science', 'matched', 'out'):
        stage.add_argument('--' + name, type=Path, required=True)
    stage.add_argument('--minimum-known-share', type=float, required=True)
    stage.add_argument('--history-coverage', type=Path)
    stage.add_argument('--allow-test-fixture', action='store_true')
    args = parser.parse_args(argv)
    try:
        if args.command == 'plan':
            result = refresh_plan()
        else:
            coverage = derive.read_json(args.history_coverage) if args.history_coverage else None
            result = stage_refresh(args.source, args.science, args.matched, args.out, args.minimum_known_share,
                                   history_coverage=coverage, test_only=args.allow_test_fixture)
        print(json.dumps(result, allow_nan=False))
        return 0
    except (ValueError, KeyError, TypeError, OSError, sqlite3.Error, subprocess.SubprocessError) as error:
        # Never echo arbitrary source values, raw response bodies or subprocess stderr.
        print('Primary refresh refused (' + type(error).__name__ + '): source integrity/coverage or production snapshot parser/staging gate refused; no feed published', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
