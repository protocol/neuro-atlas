"""Synthetic transport fixtures only; never evidence of actual source acquisition."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/publications'))
import transport


class GroupByTests(unittest.TestCase):
    def test_only_three_reviewed_works_groupings_are_admitted(self):
        allowed = ('publication_year',
                   'publication_year,authorships.institutions.type:include_unknown',
                   'publication_year,type,primary_location.source.type:include_unknown')
        for grouping in allowed:
            with self.subTest(grouping=grouping):
                cmd = transport.curl_command('/works', {'group_by': grouping, 'per_page': 100})
                self.assertIn('--request', cmd)
                self.assertEqual(cmd[cmd.index('--request') + 1], 'GET')
                self.assertIn('%OPENALEX_API_KEY', cmd)
                self.assertNotIn('--location', cmd)
        for params in ({'group_by': 'type'}, {'group_by': 'publication_year,type'},
                       {'group_by': 'publication_year,authorships.institutions.type'},
                       {'group_by': 'publication_year '}, {'group_by': 1},
                       {'group_by': 'publication_year', 'unknown': 'x'},
                       {'group_by': 'publication_year', 'api_key': 'SYNTHETIC'},
                       {'group_by': 'publication_year', 'token': 'SYNTHETIC'}):
            with self.subTest(params=params), self.assertRaises(ValueError):
                transport.curl_command('/works', params)
        for path in ('/authors', '/works/W1', '/rate-limit'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                transport.curl_command(path, {'group_by': 'publication_year'})


import hashlib
import importlib
import json
import tempfile
from unittest.mock import patch


def producer():
    path = ROOT / 'scripts/publications/acquire_baselines.py'
    assert path.exists(), 'safe baseline acquisition producer is missing'
    return importlib.import_module('acquire_baselines')


class FixtureSource:
    """Offline injected public-response fixtures, not a network acquisition."""
    def __init__(self, remaining=3132):
        import matched_baselines
        import refresh
        self.queries = matched_baselines.acquisition_plan() + [
            {'id': 'science-' + ident, 'path': '/works', 'params': params}
            for ident, _, params in refresh.science_plan()]
        self.responses = matched_baselines.load_receipts(ROOT / 'docs/publications/matched-baselines-fixtures.json')
        self.calls = []
        self.remaining = remaining
        self.bodies = {}

    def get(self, path, params):
        self.calls.append((path, dict(params)))
        if path == '/rate-limit':
            return json.dumps({'rate_limit': {'credits_remaining': self.remaining,
                'credits_limit': 10000, 'credits_used': 10000 - self.remaining,
                'daily_remaining_usd': self.remaining / 10000,
                'credit_costs': {'list': 1, 'singleton': 0}}}).encode()
        q = self.queries[len(self.calls) - 2]
        assert (path, params) == (q['path'], q['params'])
        if q['id'].startswith('science-'):
            body = {'meta': {'count': 1600, 'per_page': 100, 'groups_count': 16},
                    'group_by': [{'key': str(y), 'count': 100} for y in range(2010, 2026)]}
        else:
            body = self.responses[q['id']]['response']
        # Deliberately noncanonical: exact original bytes must survive.
        raw = json.dumps(body, indent=2).encode() + b'\n'
        self.bodies[q['id']] = raw
        return raw

    def response_metadata(self):
        return {'credits_remaining': self.remaining - len(self.calls), 'credits_used_this_request': 1}


class ProducerTests(unittest.TestCase):
    def test_verified_receipt_rejects_incomplete_or_invalid_acquisition_metadata(self):
        p = producer()
        import acquire
        for field, value in [('http_status', 201), ('http_status', True),
                             ('started_at', '2026-11-03T11:00:00'),
                             ('completed_at', '2000-01-01T00:00:00+00:00'),
                             ('completed_at', None), ('unexpected', 'SYNTHETIC')]:
            with self.subTest(field=field, value=value), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                source = FixtureSource()
                # Prime fixture ordering without any real network.
                source.calls.append(('/rate-limit', {}))
                receipts = acquire.Receipts(root, source)
                q = p.plan()['queries'][0]
                receipts.get(q['path'], q['params'])
                metadata = next(receipts.raw.glob('*.json'))
                data = json.loads(metadata.read_bytes())
                data[field] = value
                metadata.write_bytes(acquire.canonical(data))
                with self.assertRaises(ValueError):
                    p.verified_receipt(receipts, q)

    def test_replay_rejects_manifest_path_redirection_before_reading_target(self):
        p = producer()
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / 'source'
            p.run(source, transport=FixtureSource())
            data = json.loads((source / 'manifest.json').read_bytes())
            data['outputs'][0]['file'] = '../unexpected-private-file'
            (source / 'manifest.json').write_bytes(json.dumps(data).encode())
            out = Path(temporary) / 'replay'
            with self.assertRaises(ValueError):
                p.replay(source, out)
            self.assertFalse(out.exists())

    def test_safety_stops_before_network_or_write_and_free_quota_is_enforced(self):
        p = producer()
        import acquire
        with tempfile.TemporaryDirectory() as temporary:
            source = FixtureSource()
            for root in (ROOT / '.qa' / 'must-not-create-baselines', ROOT, ROOT.parent):
                with self.assertRaises(ValueError):
                    p.run(root, transport=source)
            self.assertEqual(source.calls, [])
            root = Path(temporary) / 'locked'
            with acquire.acquisition_lock():
                with self.assertRaises(acquire.BudgetStop):
                    p.run(root, transport=source)
            self.assertEqual(source.calls, [])
            self.assertFalse(root.exists())
            low = FixtureSource(remaining=1015)
            with self.assertRaises(acquire.BudgetStop):
                p.run(root, transport=low)
            self.assertEqual(low.calls, [('/rate-limit', {})])
            self.assertFalse(root.exists())
            exhausted = FixtureSource()
            original = exhausted.get
            def drops_after_first(path, params):
                body = original(path, params)
                if path == '/works':
                    exhausted.free_credits_remaining = 1000
                return body
            exhausted.get = drops_after_first
            with self.assertRaises(acquire.BudgetStop):
                p.run(root, transport=exhausted)
            self.assertEqual(len(exhausted.calls), 2)
            self.assertFalse((root / 'manifest.json').exists())
            # Existing output is never resumed or overwritten by this producer.
            with self.assertRaises(ValueError):
                p.run(root, transport=FixtureSource())

    def test_incomplete_responses_and_corrupt_body_or_metadata_never_finalize(self):
        p = producer()
        for kind in ('science', 'matched'):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as temporary:
                source = FixtureSource()
                original = source.get
                def incomplete(path, params):
                    body = original(path, params)
                    if path == '/works' and ((kind == 'science') == ('corpus' in params)):
                        value = json.loads(body)
                        value['group_by'].pop()
                        return json.dumps(value).encode()
                    return body
                source.get = incomplete
                root = Path(temporary) / 'bad'
                with self.assertRaises(ValueError):
                    p.run(root, transport=source)
                self.assertFalse((root / 'manifest.json').exists())
        for kind in ('body', 'metadata', 'missing-metadata'):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary) / 'original'
                p.run(root, transport=FixtureSource())
                entry = json.loads((root / 'manifest.json').read_bytes())['raw_receipts'][0]
                metadata_path = root / 'raw' / entry['receipt']
                data = json.loads(metadata_path.read_bytes())
                if kind == 'body':
                    (root / 'raw' / data['body_file']).write_bytes(b'corrupt')
                elif kind == 'missing-metadata':
                    metadata_path.unlink()
                else:
                    data['started_at'] = '2000-01-01T00:00:00+00:00'
                    metadata_path.write_bytes(json.dumps(data).encode())
                out = Path(temporary) / 'replay'
                with self.assertRaises((ValueError, OSError)):
                    p.replay(root, out)
                self.assertFalse((out / 'manifest.json').exists())

    def test_exact_16_queries_export_original_bytes_times_and_deterministic_offline_replay(self):
        p = producer()
        source = FixtureSource()
        import acquire
        import refresh
        import matched_baselines
        observed = '2026-11-03T11:00:00+00:00'
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'private'
            with patch.object(acquire, 'utcnow', return_value=observed):
                manifest = p.run(root, transport=source)
            self.assertEqual(manifest['status'], 'complete')
            self.assertEqual(manifest['query_count'], 16)
            self.assertEqual(source.calls, [('/rate-limit', {})] + [(q['path'], q['params']) for q in source.queries])
            self.assertEqual(json.loads((root / 'budget.json').read_bytes())['attempted_credits'], 16)
            self.assertEqual(len(list((root / 'raw').glob('*.json'))), 16)
            baseline, evidence = refresh.read_science(root / 'science')
            self.assertEqual(baseline['acquired_at'], observed)
            for ident, _, _ in refresh.science_plan():
                raw = (root / 'science' / (ident + '.response.json')).read_bytes()
                self.assertEqual(raw, source.bodies['science-' + ident])
                request = json.loads((root / 'science' / (ident + '.request.json')).read_bytes())
                self.assertEqual(request['retrievedAt'], observed)
                self.assertEqual(request['http_status'], 200)
                self.assertEqual(request['responseSha256'], hashlib.sha256(raw).hexdigest())
            receipts = matched_baselines.load_receipts(root / 'matched')
            result = matched_baselines.derive(receipts)
            self.assertFalse(result['completeMatchedInventory'])
            self.assertIsNone(next(r for r in result['rows'] if r['id'] == 'early')['referenceCounts'])
            for q in matched_baselines.acquisition_plan():
                self.assertEqual(receipts[q['id']]['retrieved_at'], observed)
                self.assertEqual(receipts[q['id']]['rawBodySha256'], hashlib.sha256(source.bodies[q['id']]).hexdigest())
            replay = Path(temporary) / 'replay'
            with acquire.acquisition_lock():
                with patch.object(p, 'CurlTransport', side_effect=AssertionError('offline must not instantiate transport')):
                    self.assertEqual(p.replay(root, replay), manifest)
            self.assertEqual((root / 'manifest.json').read_bytes(), (replay / 'manifest.json').read_bytes())
            self.assertEqual(len(source.calls), 17)


if __name__ == '__main__':
    unittest.main()
