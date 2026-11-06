"""Offline, explicitly test-only acquisition replay; never source observations."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/publications'))
from test_primary_publications import fixture
import acquire


def refresh():
    path = ROOT / 'scripts/publications/refresh.py'
    assert path.exists(), 'offline refresh adapter is not implemented'
    spec = importlib.util.spec_from_file_location('refresh', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def synthetic_run(root, fallback=False):
    works, histories, _ = fixture()
    def raw(w):
        return {**w, 'primary_topic': {'id': w['primary_topic_id']},
                'primary_location': {'source': {'type': w['primary_source_type']}},
                'abstract_inverted_index': None,
                'authorships': [{'author': {'id': a['author_id']}, 'author_position': a['author_position'],
                                 'institutions': a['institutions'], 'countries': a['countries']}
                                for a in w['authorships']]}
    class TestOnlySource:
        def get(self, path, params):
            if path == '/authors':
                ids = params['filter'].removeprefix('openalex:').split('|')
                rows = [{**h, 'id': h['author_id']} for h in histories if h['author_id'].split('/')[-1] in ids
                        and not (fallback and h['author_id'].endswith('/A1'))]
            elif params.get('filter') == 'author.id:A1':
                rows = [{'id': w['id'], 'publication_year': w['publication_year'], 'updated_date': w['updated_date'],
                         'counts_by_year': []} for w in works if any(a['author_id'] == 'https://openalex.org/A1' for a in w['authorships'])]
                rows.append({'id': 'https://openalex.org/W999', 'publication_year': 2000, 'updated_date': '2026-11-01',
                             'counts_by_year': [{'year': 2024, 'cited_by_count': 10}]})
            else:
                topic = params['filter'].split(',')[0].split(':')[1]
                year = int(params['filter'].split('from_publication_date:')[1][:4])
                rows = [raw(w) for w in works if w['primary_topic_id'] == topic and w['publication_year'] == year]
            return json.dumps({'results': rows, 'meta': {'count': len(rows), 'next_cursor': None}}).encode()
    manifest = acquire.run_acquisition(root, acquire.Receipts(root, TestOnlySource()))
    coverage = {'schemaVersion': 1, 'testOnly': True,
                'acquisitionManifestSha256': hashlib.sha256((root / 'manifest.json').read_bytes()).hexdigest(),
                'publicationHistoryComplete': True, 'citationYearsComplete': list(range(2017, 2025)),
                'basis': 'Synthetic complete histories; test-only, not OpenAlex coverage evidence.'}
    return manifest, coverage


def synthetic_science(root):
    root.mkdir()
    for ident, label, domain in [('all', 'All science', None), ('life', 'Life sciences', '1'),
                                  ('social', 'Social sciences', '2'), ('physical', 'Physical sciences', '3'),
                                  ('health', 'Health sciences', '4')]:
        params = {'filter': 'publication_year:2022-2025,type:article|review|conference-paper|book-chapter|preprint' +
                  (',primary_topic.domain.id:' + domain if domain else ''),
                  'group_by': 'publication_year', 'per_page': '100', 'corpus': 'core'}
        body = json.dumps({'meta': {'count': 460, 'groups_count': 4, 'per_page': 100},
                           'group_by': [{'key': str(y), 'count': 100 + (y - 2022) * 10} for y in range(2022, 2026)]}).encode()
        (root / (ident + '.response.json')).write_bytes(body)
        (root / (ident + '.request.json')).write_text(json.dumps({
            'url': 'https://api.openalex.org/works', 'params': params, 'complete': True,
            'retrievedAt': '2026-11-03T11:00:00Z', 'responseSha256': hashlib.sha256(body).hexdigest()}))


class RefreshTests(unittest.TestCase):
    def test_private_reconstruction_ledger_must_exactly_match_offline_replay(self):
        r = refresh()
        with tempfile.TemporaryDirectory(dir=ROOT / '.qa') as directory:
            root = Path(directory) / 'test-only'
            manifest, coverage = synthetic_run(root, fallback=True)
            manifest['author_history_reconstructions'][0]['works_count'] += 1
            raw = json.dumps(manifest).encode()
            (root / 'manifest.json').write_bytes(raw)
            coverage['acquisitionManifestSha256'] = hashlib.sha256(raw).hexdigest()
            with self.assertRaisesRegex(ValueError, 'author_history_reconstructions'):
                r.adapt_primary(root, coverage, 0.1, test_only=True)

    def test_reconstructed_author_work_receipts_do_not_relabel_paper_acquisition_time(self):
        r = refresh()
        with tempfile.TemporaryDirectory(dir=ROOT / '.qa') as directory:
            root = Path(directory) / 'test-only'
            _, coverage = synthetic_run(root, fallback=True)
            _, histories, manifest, _ = r.adapt_primary(root, coverage, 0.1, test_only=True)
            receipts = [json.loads(p.read_bytes()) for p in (root / 'raw').glob('*.json')]
            paper_time = max(x['completed_at'] for x in receipts if x['request']['path'].startswith('/works')
                             and not x['request']['params'].get('filter', '').startswith('author.id:'))
            author_time = max(x['completed_at'] for x in receipts if x['request']['path'] == '/authors'
                              or x['request']['params'].get('filter', '').startswith('author.id:'))
            self.assertEqual(manifest['works']['acquired_at'], paper_time)
            self.assertEqual(manifest['author_histories']['acquired_at'], author_time)
            self.assertEqual(len(histories), 3)


    def test_cli_plan_and_offline_stage_are_executed_and_production_gate_keeps_last_good(self):
        import subprocess
        path = ROOT / 'scripts/publications/refresh.py'
        process = subprocess.run([sys.executable, str(path), 'plan'], capture_output=True, text=True)
        self.assertEqual(process.returncode, 0)
        self.assertTrue(process.stdout.strip(), 'refresh CLI is not implemented')
        self.assertFalse(json.loads(process.stdout)['cronActivated'])
        with tempfile.TemporaryDirectory(dir=ROOT / '.qa') as directory:
            root = Path(directory)
            synthetic_run(root / 'test-only')
            synthetic_science(root / 'science')
            command = [sys.executable, str(path), 'stage', '--source', str(root / 'test-only'),
                       '--science', str(root / 'science'), '--matched', str(ROOT / 'docs/publications/matched-baselines-fixtures.json'),
                       '--out', str(root / 'stage'), '--minimum-known-share', '0.1', '--allow-test-fixture']
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertIn('production snapshot parser/staging gate refused', result.stderr)
            self.assertFalse((root / 'stage').exists())

    def test_weekly_lane_is_independent_and_reports_transport_baseline_blocker(self):
        r = refresh()
        self.assertTrue(callable(getattr(r, 'refresh_plan', None)), 'weekly plan seam missing')
        plan = r.refresh_plan()
        self.assertEqual(plan['workers'], 4)
        self.assertEqual(plan['capCredits'], 7000)
        self.assertEqual(plan['reserveCredits'], 1000)
        self.assertEqual(len(plan['baselineQueries']), 16)
        self.assertTrue(plan['canAcquireBaselines'])
        self.assertEqual(plan['blockers'], [])
        self.assertFalse(plan['cronActivated'])

    def test_offline_stage_calls_only_local_validator_and_never_overwrites_source(self):
        r = refresh()
        self.assertTrue(callable(getattr(r, 'stage_refresh', None)), 'offline orchestration missing')
        with tempfile.TemporaryDirectory(dir=ROOT / '.qa') as directory:
            root = Path(directory)
            _, coverage = synthetic_run(root / 'test-only')
            synthetic_science(root / 'science')
            seen = []
            def validate(snapshot, proof, out):
                self.assertTrue(snapshot['source']['testOnly'])
                self.assertEqual(len(snapshot['matchedGrowth']['rows']), 21)
                self.assertEqual(out, root / 'stage')
                self.assertNotIn(str(root), json.dumps(proof))
                seen.append(out)
                return {'published': False, 'testOnly': True}
            result = r.stage_refresh(root / 'test-only', root / 'science',
                ROOT / 'docs/publications/matched-baselines-fixtures.json', root / 'stage', 0.1,
                history_coverage=coverage, test_only=True, validator=validate)
            self.assertEqual(result, {'published': False, 'testOnly': True})
            self.assertEqual(len(seen), 1)
            self.assertFalse((root / 'stage').exists())
            with self.assertRaises(ValueError):
                r.stage_refresh(root / 'test-only', root / 'science',
                    ROOT / 'docs/publications/matched-baselines-fixtures.json', root / 'test-only', 0.1,
                    history_coverage=coverage, test_only=True, validator=validate)

    def test_official_history_contract_is_versioned_not_a_fake_ten_year_window(self):
        r = refresh()
        self.assertTrue(callable(getattr(r, 'documented_history_coverage', None)), 'official history adapter missing')
        coverage = r.documented_history_coverage(b'complete acquisition receipt', test_only=True)
        self.assertTrue(coverage['publicationHistoryComplete'])
        self.assertEqual(coverage['citationYearsComplete'], list(range(2012, 2026)))
        self.assertIn('https://help.openalex.org/data/common-attributes', coverage['basis'])
        self.assertTrue(coverage['testOnly'])

    def test_full_snapshot_attaches_exact_local_n_without_inventing_missing_d(self):
        r = refresh()
        self.assertTrue(callable(getattr(r, 'build_snapshot', None)), 'science/matched staging is not implemented')
        with tempfile.TemporaryDirectory(dir=ROOT / '.qa') as directory:
            root = Path(directory)
            _, coverage = synthetic_run(root / 'test-only')
            synthetic_science(root / 'science')
            result, proof = r.build_snapshot(root / 'test-only', root / 'science',
                ROOT / 'docs/publications/matched-baselines-fixtures.json', coverage, 0.1, test_only=True)
            rows = result['matchedGrowth']['rows']
            self.assertEqual(len(rows), 21)
            self.assertEqual(sum(row['baselineStatus'] == 'matched' for row in rows), 9)
            self.assertEqual(sum(row['referenceCounts'] is None for row in rows), 12)
            eeg = next(row for row in rows if row['id'] == 'eeg')
            self.assertEqual(eeg['numeratorCounts'], {'2022': 4, '2025': 3})
            author = next(row for row in rows if row['id'] == 'late')
            self.assertEqual(author['countUnit'], 'author-fractional works')
            self.assertEqual(author['numeratorCounts'], {'2022': '3/2', '2025': '1'})
            self.assertIsNone(author['relativeShareGrowthPct'])
            self.assertEqual(len(result['tables']['nt_yearly']['rows']), 28)
            self.assertIn('scienceInputSha256', proof)
            self.assertIn('matchedInputSha256', proof)
            self.assertNotIn('https://openalex.org/A', json.dumps(result))
            self.assertNotIn('Synthetic complete histories', json.dumps(result))

    def test_complete_receipts_export_dynamic_ids_and_real_capture_time_offline(self):
        r = refresh()
        with tempfile.TemporaryDirectory(dir=ROOT / '.qa') as directory:
            root = Path(directory) / 'test-only'
            source, coverage = synthetic_run(root)
            works, histories, manifest, proof = r.adapt_primary(root, coverage, 0.1, test_only=True)
            self.assertEqual(len(works), 9)
            self.assertEqual(len(histories), 3)
            work_times = [json.loads(p.read_bytes())['completed_at'] for p in (root / 'raw').glob('*.json')
                          if json.loads(p.read_bytes())['request']['path'].startswith('/works')]
            self.assertEqual(manifest['works']['acquired_at'], max(work_times))
            self.assertEqual(manifest['author_histories']['acquired_at'], source['acquisition_completed_at'])
            self.assertEqual(manifest['author_histories']['expected_author_ids'],
                             sorted(h['author_id'] for h in histories))
            self.assertTrue(all(w['id'].startswith('https://openalex.org/W') for w in works))
            self.assertTrue(all(a['author_id'].startswith('https://openalex.org/A')
                                for w in works for a in w['authorships'] if a['author_id']))
            self.assertEqual(manifest['works']['sha256'], r.jsonl_hash(works))
            self.assertEqual(proof['acquisitionManifestSha256'], coverage['acquisitionManifestSha256'])
            self.assertTrue(manifest['test_only'])


if __name__ == '__main__':
    (ROOT / '.qa').mkdir(exist_ok=True)
    unittest.main()
