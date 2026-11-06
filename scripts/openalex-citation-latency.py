#!/usr/bin/env python3
"""Frozen PLRD method; private fresh receipts, free-only acquisition, exact replay.

Default is replay. Live acquisition requires --acquire, a fresh --run directory,
--max-credits and --reserve-credits. No publish or network in replay mode.
"""
import argparse
from contextlib import ExitStack
import datetime as dt
from decimal import Decimal, InvalidOperation
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import time
import types
import urllib.error
import urllib.parse
import subprocess

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'vendor/field_velocity_openalex.py'
SOURCE_REVISION = '0d91734795f7a62394d2047a8f95384bbeae41f4'
GENERATOR_BLOB = '87a4e15fa4f957ca980a056d949b72cfc353b615'
QUERY = 'brain-computer interface|connectome|neural implant|whole brain emulation'
METHOD = 'openalex-neurotech-reference-age-v1'
API = 'https://api.openalex.org'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def generator_blob():
    data = SOURCE.read_bytes()
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def free_remaining(report):
    """Only separately identified DAILY FREE allowance; never combined/prepaid.

    Unknown provider schemas fail closed and require reviewed adapter changes.
    """
    try:
        rate = report['rate_limit']
        limit = Decimal(str(rate['daily_budget_usd']))
        used = Decimal(str(rate['daily_used_usd']))
        remaining = Decimal(str(rate['daily_remaining_usd']))
        prepaid = Decimal(str(rate['prepaid_remaining_usd']))
        if not limit.is_finite() or not used.is_finite() or not 0 < limit <= 1 or not 0 <= used <= limit:
            raise ValueError()
        if not remaining.is_finite() or remaining != limit - used or prepaid != 0:
            raise ValueError()
        return int(remaining * 10000)
    except (KeyError, InvalidOperation, ValueError, TypeError):
        raise RuntimeError('Cannot establish separate remaining daily free allowance') from None


class Budget:
    def __init__(self, remaining, reserve, cap):
        if any(type(x) is not int or x < 0 for x in (remaining, reserve, cap)) or remaining > 10000:
            raise RuntimeError('Invalid free allowance budget')
        self.remaining, self.reserve, self.cap, self.spent = remaining, reserve, cap, 0

    def charge(self, credits):
        if credits + self.spent > self.cap or self.remaining - credits < self.reserve:
            raise RuntimeError('Free allowance/run budget exhausted; no prepaid spill')
        self.remaining -= credits  # Charge BEFORE transport, including failed attempts.
        self.spent += credits

    def observe(self, headers):
        try:
            remaining = int(headers['X-RateLimit-Remaining'])
            limit = int(headers['X-RateLimit-Limit'])
            if not 0 <= remaining <= limit <= 10000: raise ValueError()
        except (KeyError, TypeError, ValueError):
            raise RuntimeError('Missing or changed daily quota headers') from None
        self.remaining = min(self.remaining, remaining)
        if self.remaining < self.reserve:
            raise RuntimeError('Shared free allowance crossed reserve; stop')


class SourceHTTPError(Exception):
    def __init__(self, code):
        self.code = code


def request(path, params):
    """curl imports the credential handle natively; Python never reads its value."""
    if path not in ('/rate-limit', '/works') or any(k in params for k in ('api_key', 'mailto')):
        raise RuntimeError('Unapproved OpenAlex request shape')
    query = urllib.parse.urlencode(params, safe='|:,')
    argv = ['curl', '-q', '--silent', '--show-error', '--proto', '=https',
            '--max-redirs', '0', '--connect-timeout', '10', '--max-time', '30',
            '--max-filesize', '2000000', '--suppress-connect-headers', '--include',
            '--variable', '%OPENALEX_API_KEY', '--expand-header',
            'Authorization: Bearer {{OPENALEX_API_KEY}}', '--header', 'Accept: application/json',
            '--user-agent', 'neuro-atlas-citation-feed/1',
            API + path + ('?' + query if query else '')]
    try:
        result = subprocess.run(argv, capture_output=True, timeout=35, check=False)
    except Exception:
        raise RuntimeError('OpenAlex native transport failed') from None
    if result.returncode != 0:
        # Do not render curl stderr: it can contain provider-controlled text.
        raise OSError('OpenAlex native transport failed') from None
    header, separator, body = result.stdout.partition(b'\r\n\r\n')
    if not separator or len(header) > 65536 or len(body) > 2000000:
        raise RuntimeError('OpenAlex response exceeded caps or header framing changed')
    lines = header.decode('ascii', errors='strict').split('\r\n')
    status = lines[0].split(' ')
    if len(status) < 2 or not status[1].isdigit():
        raise RuntimeError('OpenAlex status framing changed')
    code = int(status[1])
    if code != 200:
        raise SourceHTTPError(code)
    # Retain ONLY selected non-secret numeric quota headers, in memory.
    selected = {}
    content_type = ''
    allowed = {'x-ratelimit-limit':'X-RateLimit-Limit',
               'x-ratelimit-remaining':'X-RateLimit-Remaining',
               'x-ratelimit-credits-used':'X-RateLimit-Credits-Used'}
    for line in lines[1:]:
        name, _, value = line.partition(':')
        if name.lower() == 'content-type': content_type = value.strip().lower()
        if name.lower() in allowed:
            value = value.strip()
            if not value.isdigit(): raise RuntimeError('Invalid numeric quota header')
            selected[allowed[name.lower()]] = value
    if not content_type.startswith('application/json'):
        raise RuntimeError('OpenAlex content type changed')
    data = json.loads(body)
    if path == '/rate-limit':
        # The endpoint also returns an api_key field. Never access, retain or
        # expose it: immediately select only reviewed numeric quota fields.
        rate = data.get('rate_limit', {})
        fields = ('daily_budget_usd', 'daily_used_usd', 'daily_remaining_usd', 'prepaid_remaining_usd')
        data = {'rate_limit': {name: rate.get(name) for name in fields}}
    return data, selected


def atomic_json(path, value):
    data = (json.dumps(value, sort_keys=True, indent=2) + '\n').encode()
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_bytes(data)
    os.replace(temporary, path)
    return digest(data)


def run(args):
    with ExitStack() as resources:
        return _run(args, resources)


def _run(args, resources):
    if generator_blob() != GENERATOR_BLOB: raise RuntimeError('Pinned generator hash mismatch')
    spec = importlib.util.spec_from_file_location('pinned_generator', SOURCE)
    assert spec and spec.loader
    gen = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gen)
    folder = Path(args.run).resolve()
    if args.acquire:
        folder.mkdir(mode=0o700, parents=True, exist_ok=False)
        started = dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
        year = dt.datetime.fromisoformat(started).year
        no_retry_bound = (year - 1999) * 101
        # Shared lock must also be used by the parent's other OpenAlex producer.
        lock_path = Path(args.lock).resolve()
        lock_path.parent.mkdir(parents=True, exist_ok=True)
        lock = resources.enter_context(lock_path.open('a'))
        try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: raise RuntimeError('Shared OpenAlex acquisition lock is busy') from None
        try: report, _ = request('/rate-limit', {})
        except Exception: raise RuntimeError('Free-budget preflight failed; no acquisition attempted') from None
        budget = Budget(free_remaining(report), args.reserve_credits, args.max_credits)
        if budget.remaining - budget.reserve < no_retry_bound or budget.cap < no_retry_bound:
            raise RuntimeError('Free allowance cannot cover conservative no-retry run bound')
        manifest = {'version': 1, 'method': METHOD, 'sourceRevision': SOURCE_REVISION,
                    'generatorBlob': GENERATOR_BLOB, 'startedAt': started, 'generatedAt': None,
                    'complete': False, 'receipts': [], 'attempts': []}
        deadline = time.monotonic() + args.max_seconds
        day = started[:10]

        def captured(params, email, api_key, tries=6):
            public = {k: v for k, v in params.items() if k not in ('api_key', 'mailto')}
            cost = 10 if 'title_and_abstract.search:' in str(public.get('filter', '')) else 1
            for attempt in range(3):
                if time.monotonic() >= deadline or dt.datetime.now(dt.timezone.utc).date().isoformat() != day:
                    raise RuntimeError('Acquisition time/day budget exhausted')
                budget.charge(cost)
                event = {'request': public, 'worstCaseCredits': cost, 'status': 'attempted'}
                manifest['attempts'].append(event)
                atomic_json(folder / 'manifest.json', manifest)
                try:
                    response, headers = request('/works', public)
                    budget.observe(headers)
                    # Retain exact successful JSON response privately, never publish identities.
                    receipt = {'request': public, 'response': response}
                    filename = f'{len(manifest["receipts"]):05d}.json'
                    sha = atomic_json(folder / filename, receipt)
                    manifest['receipts'].append({'file': filename, 'sha256': sha})
                    event['status'] = 'ok'
                    atomic_json(folder / 'manifest.json', manifest)
                    time.sleep(.2)
                    return response
                except SourceHTTPError as error:
                    code = error.code
                    event['status'] = str(code)
                    # Quota/permanent errors stop immediately; no 429 retry to next day.
                    if code not in (500, 502, 503, 504):
                        raise RuntimeError(f'OpenAlex HTTP {code}; acquisition stopped') from None
                except RuntimeError:
                    raise
                except Exception:
                    event['status'] = 'transport-failed'
                finally:
                    manifest['worstCaseCredits'] = budget.spent
                    atomic_json(folder / 'manifest.json', manifest)
                if attempt == 2: raise RuntimeError('OpenAlex bounded retries exhausted') from None
                time.sleep(2 ** (attempt + 1))
            raise RuntimeError('OpenAlex acquisition stopped')
    else:
        manifest = json.loads((folder / 'manifest.json').read_text())
        if (manifest.get('version'), manifest.get('method'), manifest.get('sourceRevision'), manifest.get('generatorBlob'), manifest.get('complete')) != (1, METHOD, SOURCE_REVISION, GENERATOR_BLOB, True):
            raise RuntimeError('Replay requires a complete pinned source run')
        started = manifest['startedAt']
        year = dt.datetime.fromisoformat(started).year
        cursor = 0

        def captured(params, email, api_key, tries=6):
            nonlocal cursor
            public = {k: v for k, v in params.items() if k not in ('api_key', 'mailto')}
            if cursor >= len(manifest['receipts']): raise RuntimeError('Replay missing source receipt')
            entry = manifest['receipts'][cursor]
            filename = entry['file']
            if filename != f'{cursor:05d}.json': raise RuntimeError('Invalid receipt path/order')
            raw = (folder / filename).read_bytes()
            if digest(raw) != entry['sha256']: raise RuntimeError('Replay receipt hash mismatch')
            receipt = json.loads(raw)
            if receipt['request'] != public: raise RuntimeError('Replay request/method mismatch')
            cursor += 1
            return receipt['response']

    setattr(gen, 'fetch', captured)
    # The unchanged generator must not inspect the credential environment either.
    setattr(gen, 'os', types.SimpleNamespace(environ={}, path=os.path, fsync=os.fsync, replace=os.replace, unlink=os.unlink))
    # main() preserves all original statistical/formatting code; only clock/I/O are adapted.
    generated = dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds') if args.acquire else manifest['generatedAt']
    class FrozenDatetime(dt.datetime):
        @classmethod
        def now(cls, tz=None): return dt.datetime.fromisoformat(generated)
    setattr(gen, 'dt', types.SimpleNamespace(date=dt.date, datetime=dt.datetime if args.acquire else FrozenDatetime, timezone=dt.timezone))
    setattr(gen, 'time', types.SimpleNamespace(sleep=lambda _: None))
    output = Path(args.out).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    previous = sys.argv
    try:
        sys.argv = ['pinned', '--search', QUERY, '--from-year', '2000', '--to-year', str(year),
                    '--works-per-year', '80', '--max-refs-per-work', '50',
                    '--reliable-cutoff-year', str(year - 2), '--out', str(output)]
        gen.main()
    finally: sys.argv = previous
    if not args.acquire:
        if cursor != len(manifest['receipts']) or digest(output.read_bytes()) != manifest['csvSha256']:
            raise RuntimeError('Replay did not reproduce complete exact CSV')
        return
    generated = output.read_text().splitlines()[0].removeprefix('# generated: ')
    manifest.update(complete=True, generatedAt=generated,
                    finishedAt=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
                    csvSha256=digest(output.read_bytes()))
    manifest_hash = atomic_json(folder / 'manifest.json', manifest)
    provenance = {'version': 1, 'method': METHOD, 'sourceRevision': SOURCE_REVISION,
                  'generatorBlob': GENERATOR_BLOB, 'directionBlob': 'a63c91f2a196f8a542e9341f30eefcaeefe2ccec',
                  'startedAt': started, 'finishedAt': manifest['finishedAt'], 'generatedAt': generated,
                  'manifestSha256': manifest_hash, 'csvSha256': manifest['csvSha256'],
                  'receiptCount': len(manifest['receipts']), 'complete': True,
                  'settings': {'query': QUERY, 'fromYear': 2000, 'through': 'acquisition-year',
                    'worksPerYear': 80, 'maxRefsPerWork': 50, 'sampleSeed': 42, 'batchSize': 50,
                    'clusterIterations': 500, 'clusterSeed': 42, 'referenceFromYear': 1900,
                    'referenceThrough': 'publication-year', 'reliableRule': 'year < acquisition-year - 2'}}
    atomic_json(folder / 'provenance.json', provenance)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--acquire', action='store_true')
    parser.add_argument('--max-credits', type=int, default=3000)
    parser.add_argument('--reserve-credits', type=int, default=1000)
    parser.add_argument('--max-seconds', type=int, default=7200)
    parser.add_argument('--lock', default='/opt/data/automations/openalex-acquisition.lock')
    args = parser.parse_args()
    try: run(args)
    except Exception as error:
        # RuntimeError messages above are our fixed text; never render provider exception/URL.
        print(str(error) if type(error) is RuntimeError else 'Citation acquisition/replay failed; inspect private receipts', file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__': raise SystemExit(main())
