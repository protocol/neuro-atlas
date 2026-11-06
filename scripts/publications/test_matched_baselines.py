"""Run: python3 -m unittest discover -s scripts/publications -p 'test_matched_baselines.py'."""
import copy
import hashlib
import json
import subprocess
import tempfile
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODULE = Path(__file__).with_name('matched_baselines.py')
SPEC = importlib.util.spec_from_file_location('matched', MODULE)
assert SPEC is not None and SPEC.loader is not None

def adapter():
    mod = importlib.util.module_from_spec(SPEC)
    SPEC.loader.exec_module(mod)
    return mod


class MatchedBaselinesTests(unittest.TestCase):
    def test_real_receipts_produce_six_independent_pairs_and_21_explicit_states(self):
        self.assertTrue(Path(SPEC.origin).exists(), 'matched baseline adapter is missing')
        mod = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(mod)
        receipts = mod.load_receipts(ROOT / 'docs/publications/matched-baselines-fixtures.json')
        output = mod.derive(receipts)
        rows = {r['id']: r for r in output['rows']}
        self.assertEqual(len(rows), 21)
        self.assertEqual(sum(r['baselineStatus'] == 'matched' for r in rows.values()), 6)
        asia = rows['asia']
        self.assertEqual(asia['numeratorCounts'], {'2022': 3305, '2025': 5581})
        self.assertEqual(asia['referenceCounts'], {'2022': 2632284, '2025': 3743357})
        self.assertAlmostEqual(asia['relativeShareGrowthPct'], ((5581 / 3743357) / (3305 / 2632284) - 1) * 100)
        self.assertNotEqual(asia['neuroGrowthPct'], 68.9)
        self.assertEqual(rows['government-facility']['numeratorCounts']['2025'], 1523)
        self.assertIsNone(rows['journal']['numeratorCounts'])
        self.assertEqual(rows['journal']['referenceCounts']['2022'], 5171986)
        self.assertTrue(all(r['reason'] and r['denominatorUniverse'] for r in rows.values()))


    def test_injected_caller_acquires_fixed_plan_without_a_transport_dependency(self):
        m = adapter()
        original = m.load_receipts(ROOT / 'docs/publications/matched-baselines-fixtures.json')
        expected = m.acquisition_plan()
        calls = []
        def request(path, params):
            q = expected[len(calls)]
            self.assertEqual((path, params), (q['path'], q['params']))
            calls.append(q['id'])
            return original[q['id']]['response'], {'X-RateLimit-Credits-Used': '1'}
        fresh = m.acquire(request)
        self.assertEqual(len(calls), 11)
        self.assertEqual(m.derive(fresh)['rows'][9]['numeratorCounts']['2022'], 3305)

    def test_complete_owned_nt10_numerator_promotes_only_venue_rows(self):
        m = adapter()
        receipts = m.load_receipts(ROOT / 'docs/publications/matched-baselines-fixtures.json')
        works = [{'id': f'https://openalex.org/W{i}', 'publication_year': year, 'type': kind,
                  'primary_source_type': source, 'primary_topic_id': 'T10429', 'title': '', 'abstract': ''}
                 for i, (year, kind, source) in enumerate([(2022, 'article', None),
                     (2025, 'article', 'journal'), (2022, 'conference-paper', 'repository'),
                     (2025, 'conference-paper', 'conference')], 1)]
        n = {'measurement': m.COUNTING, 'selection': 'NT10-v1',
             'completeYears': ['2022', '2025'], 'works': works}
        result = m.derive(receipts, venue_numerator=n)
        rows = {r['id']: r for r in result['rows']}
        self.assertEqual(rows['journal']['baselineStatus'], 'matched')
        self.assertIn('venue-n', rows['journal']['evidence'])
        self.assertEqual(result['evidence']['venue-n']['workCount'], 4)
        self.assertEqual(rows['journal']['numeratorCounts'], {'2022': 1, '2025': 1})
        self.assertEqual(rows['preprint']['numeratorCounts']['2022'], 1)
        n['works'].append(dict(works[0]))
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            m.derive(receipts, venue_numerator=n)

    def test_government_facility_union_must_fit_overlapping_bucket_bounds(self):
        m = adapter()
        receipts = m.load_receipts(ROOT / 'docs/publications/matched-baselines-fixtures.json')
        bad = copy.deepcopy(receipts)
        body = bad['government-facility-n']['response']
        body['group_by'][0]['count'] = 1
        body['meta']['count'] = sum(c['count'] for c in body['group_by'])
        with self.assertRaisesRegex(ValueError, 'union'):
            m.derive(bad)

    def test_core_numerator_is_optional_and_does_not_invent_a_denominator(self):
        m = adapter()
        receipts = m.load_receipts(ROOT / 'docs/publications/matched-baselines-fixtures.json')
        supplied = {'early': {'counts': {'2022': 1.25, '2025': 2.75},
            'countUnit': 'author-fractional works', 'countingMethod': 'primary-independent-v1',
            'numeratorUniverse': 'P2 active-author fractional output', 'evidence': ['owned-primary-derive']}}
        row = next(r for r in m.derive(receipts, numerators=supplied)['rows'] if r['id'] == 'early')
        self.assertEqual(row['neuroGrowthPct'], 120.0)
        self.assertEqual(row['baselineStatus'], 'unavailable')
        self.assertIsNone(row['referenceCounts'])
        self.assertIsNone(row['relativeShareGrowthPct'])
        self.assertEqual(row['countUnit'], 'author-fractional works')

    def test_cli_combined_primary_input_preserves_supplied_numerator(self):
        m = adapter()
        combined = json.loads((ROOT / 'docs/publications/matched-baselines-fixtures.json').read_text())
        combined['numerators'] = {'eeg': {'counts': {'2022': 10, '2025': 15},
            'countUnit': 'OpenAlex work ID', 'countingMethod': 'owned-primary-v1',
            'numeratorUniverse': 'NT10 primary works', 'evidence': ['owned-primary']}}
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'combined.json'
            path.write_text(json.dumps(combined))
            result = subprocess.run(['python3', str(MODULE), '--input', str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            row = next(r for r in json.loads(result.stdout)['rows'] if r['id'] == 'eeg')
            self.assertEqual(row['numeratorCounts'], {'2022': 10, '2025': 15})

    def test_zero_and_negative_counts_are_not_growth_or_missing_data(self):
        m = adapter()
        self.assertIsNone(m.metrics({'2022': 0, '2025': 1}, {'2022': 10, '2025': 10})['relativeShareGrowthPct'])
        self.assertIsNone(m.metrics({'2022': '0', '2025': '1'}, None)['neuroGrowthPct'])
        with self.assertRaises(ValueError):
            m.metrics({'2022': -1, '2025': 1}, None)

    def test_receipt_fixture_is_traceable_to_verified_primary_bytes(self):
        m = adapter()
        source = Path('/opt/data/tmp/atlas-matched-growth-baselines-20261106-receipts')
        if not source.is_dir():
            self.skipTest('Original acquisition receipts not present; checked-in public subset remains portable')
        fixture = m.load_receipts(ROOT / 'docs/publications/matched-baselines-fixtures.json')
        actual = m.load_receipts(source)
        for q in m.acquisition_plan():
            with self.subTest(query=q['id']):
                self.assertEqual(fixture[q['id']]['sourceSha256'], hashlib.sha256((source / q['filename']).read_bytes()).hexdigest())
                self.assertEqual(fixture[q['id']]['response']['group_by'], actual[q['id']]['response']['group_by'])
                self.assertEqual(fixture[q['id']]['request_parameters'], actual[q['id']]['request_parameters'])
        self.assertEqual(m.derive(fixture)['rows'], m.derive(actual)['rows'])

    def test_all_six_real_pairs_keep_actual_counts(self):
        m = adapter()
        rows = {r['id']: r for r in m.derive(m.load_receipts(ROOT / 'docs/publications/matched-baselines-fixtures.json'))['rows']}
        expected = {'asia': (3305, 5581, 2632284, 3743357),
            'europe': (1797, 2094, 1646031, 1758415), 'us-canada': (1101, 1487, 925664, 1028663),
            'education': (5622, 8335, 4788725, 6151131), 'company': (163, 224, 185364, 213800),
            'government-facility': (1251, 1523, 1091879, 1140323)}
        for gid, values in expected.items():
            row = rows[gid]
            self.assertEqual(tuple(row['numeratorCounts'][y] for y in m.YEARS) + tuple(row['referenceCounts'][y] for y in m.YEARS), values)
            self.assertAlmostEqual(row['neuroGrowthPct'], (values[1] / values[0] - 1) * 100)

    def test_fail_closed_receipt_mutations(self):
        m = adapter()
        receipts = m.load_receipts(ROOT / 'docs/publications/matched-baselines-fixtures.json')
        mutations = {
            'year': lambda r: r['asia-n']['response']['group_by'].pop(),
            'duplicate': lambda r: r['asia-n']['response']['group_by'].append(copy.deepcopy(r['asia-n']['response']['group_by'][0])),
            'filter': lambda r: r['asia-n']['request_parameters'].update(filter='publication_year:2025'),
            'unit': lambda r: r['asia-n'].update(measurement={'countUnit': 'author-fractional works'}),
            'http': lambda r: r['asia-n'].update(http_status=429),
            'negative': lambda r: r['asia-n']['response']['group_by'][0].update(count=-1),
            'venue-leaf': lambda r: r['venue-d']['response']['group_by'][0]['groups'][0]['groups'].pop(),
            'venue-type': lambda r: r['venue-d']['response']['group_by'][0]['groups'].pop(),
            'truncated': lambda r: r['venue-d']['response']['meta'].update(groups_count=3),
        }
        for label, mutate in mutations.items():
            with self.subTest(case=label):
                bad = copy.deepcopy(receipts)
                mutate(bad)
                with self.assertRaises(ValueError):
                    m.derive(bad)
        with self.assertRaisesRegex(ValueError, 'subset'):
            m.metrics({'2022': 11, '2025': 1}, {'2022': 10, '2025': 10})
        self.assertEqual(m.venue('conference-paper', 'repository'), 'Preprint')
        self.assertEqual(m.venue('book-chapter', 'conference'), 'Conference')
        self.assertEqual(m.venue('article', None), 'Journal')

if __name__ == '__main__':
    unittest.main()
