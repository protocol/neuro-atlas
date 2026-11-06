"""Acquisition contract; fixtures are deliberately synthetic, never source evidence."""
import importlib.util
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / 'scripts' / 'publications'


def load(name):
    spec = importlib.util.spec_from_file_location(name, SRC / (name + '.py'))
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    import sys
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class TransportTests(unittest.TestCase):
    def test_body_and_content_type_bounds_and_numeric_quota_receipt(self):
        transport = load('transport')
        from unittest.mock import patch
        from types import SimpleNamespace
        client = transport.CurlTransport()
        cmd = transport.curl_command('/works',{'per_page':1})
        self.assertIn('--max-filesize',cmd)
        with patch.object(transport.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout=b'{"results":[]}\n200\tapplication/json\t8000\t0.8000\t1')):
            self.assertEqual(client.get('/works',{'per_page':1}),b'{"results":[]}')
        self.assertEqual(client.free_credits_remaining,8000)
        self.assertEqual(client.response_metadata()['credits_remaining'],8000)
        with patch.object(transport.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout=b'{}\n200\ttext/html\t8000\t0.8\t1')):
            with self.assertRaises(transport.TransportError):
                client.get('/works',{'per_page':1})

    def test_transport_uses_handle_and_rejects_untrusted_routes_and_secret_params(self):
        transport = load('transport')
        command = transport.curl_command('/works', {'per_page': 100, 'cursor': '*'})
        self.assertEqual(command[:2], ['curl', '-q'])
        self.assertIn('%OPENALEX_API_KEY', command)
        self.assertIn('Authorization: Bearer {{OPENALEX_API_KEY}}', command)
        self.assertNotIn('--location', command)
        for path in ('https://evil.test/works', '//evil.test', '/authors/A1', '/works/W1/extra', '/rate-limit?x=1', '/works/../authors'):
            with self.assertRaises(ValueError):
                transport.curl_command(path, {})
        for params in ({'api_key': 'hidden'}, {'mailto': 'a@b.test'}, {'cursor': 'https://evil.test/'}, {'per_page': 101}):
            with self.assertRaises(ValueError):
                transport.curl_command('/works', params)


class AcquisitionTests(unittest.TestCase):
    def test_bounded_parallel_preload_and_thread_safe_budget(self):
        acquire = load('acquire')
        import json, threading, concurrent.futures
        barrier = threading.Barrier(2)
        class Source:
            def get(self,path,params):
                barrier.wait(timeout=3)
                return b'{"meta":{"count":0,"next_cursor":null},"results":[]}'
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            receipts = acquire.Receipts(root,Source())
            required = [('T10429',2000),('T11601',2000)]
            self.assertEqual(list(acquire.prefetched_slices(required,receipts,2)),required)
            batches = [['A1'],['A2']]
            self.assertEqual(len(acquire.author_responses(receipts,batches,2)),2)
            class Quota:
                def get(self,path,params):
                    return b'{"rate_limit":{"credits_remaining":9999,"credits_limit":10000,"credits_used":1,"daily_remaining_usd":0.9999,"resets_at":"2099-01-01T00:00:00Z","credit_costs":{"list":1,"singleton":0}}}'
            budget = acquire.Budget(Quota(),root/'budget.json',cap=3,reserve=0)
            def charge(_):
                try:
                    budget.charge('/works')
                    return 1
                except acquire.BudgetStop:
                    return 0
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                self.assertEqual(sum(pool.map(charge,range(12))),3)
            self.assertEqual(json.loads((root/'budget.json').read_bytes())['attempted_credits'],3)

    def test_interrupted_run_resume_keeps_successful_cache(self):
        acquire = load('acquire')
        import json
        class Source:
            fail = True
            calls = []
            def get(self, path, params):
                self.calls.append((path,dict(params)))
                if path == '/authors':
                    return b'{"meta":{"count":1},"results":[{"id":"https://openalex.org/A1","counts_by_year":[],"updated_date":"2026-11-01"}]}'
                if params['cursor'] == '*':
                    return json.dumps({'meta':{'count':2,'next_cursor':'p2'},'results':[synthetic_work()]}).encode()
                if self.fail:
                    raise RuntimeError('Synthetic interruption')
                return json.dumps({'meta':{'count':2,'next_cursor':None},'results':[synthetic_work(2)]}).encode()
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            source = Source()
            receipts = acquire.Receipts(root,source)
            with self.assertRaises(RuntimeError):
                acquire.run_acquisition(root,receipts,required=[('T10429',2000)])
            self.assertFalse((root/'manifest.json').exists())
            original_receipt = next((root/'raw').glob('*.json')).read_bytes()
            source.fail = False
            result = acquire.run_acquisition(root,receipts,required=[('T10429',2000)])
            self.assertEqual(result['works_count'],2)
            self.assertEqual(sum(params.get('cursor') == '*' for path,params in source.calls),1)
            self.assertIn(original_receipt,[p.read_bytes() for p in (root/'raw').glob('*.json')])
            # A finalized resume validates existing artifacts without refetching.
            calls = len(source.calls)
            self.assertEqual(acquire.run_acquisition(root,receipts,required=[('T10429',2000)]),result)
            self.assertEqual(len(source.calls),calls)

    def test_shared_nonblocking_lock_and_incomplete_batch_checkpoint(self):
        acquire = load('acquire')
        import json
        with tempfile.TemporaryDirectory() as directory:
            lock = pathlib.Path(directory) / 'shared.lock'
            with acquire.acquisition_lock(lock):
                with self.assertRaises(acquire.BudgetStop):
                    with acquire.acquisition_lock(lock):
                        self.fail('second acquisition must never proceed')
            class MissingAuthor:
                def get(self, path, params):
                    if path == '/authors':
                        return b'{"meta":{"count":0},"results":[]}'
                    return json.dumps({'meta':{'count':1,'next_cursor':None},'results':[synthetic_work(year=2022)]}).encode()
            root = pathlib.Path(directory) / 'run'
            with self.assertRaises(ValueError):
                acquire.run_acquisition(root, acquire.Receipts(root, MissingAuthor()), required=[('T10429',2022)])
            self.assertFalse((root / 'manifest.json').exists())
            self.assertEqual(json.loads((root / 'checkpoint.json').read_bytes())['status'],'incomplete')

    def test_paginated_recovered_byline_histories_and_offline_replay(self):
        acquire = load('acquire')
        import json
        class Source:
            calls = 0
            def get(self, path, params):
                self.calls += 1
                if path == '/works/W1':
                    return json.dumps(synthetic_work(year=2022)).encode()
                if path == '/authors':
                    return json.dumps({'meta':{'count':1,'next_cursor':None},'results':[{'id':'https://openalex.org/A1','counts_by_year':[{'year':1990,'works_count':1,'cited_by_count':0}],'updated_date':'2026-11-01','display_name':'DO NOT RETAIN'}]}).encode()
                if params['cursor'] == '*':
                    work = synthetic_work(year=2022)
                    work['is_authors_truncated'] = True
                    return json.dumps({'meta':{'count':2,'next_cursor':'page2'},'results':[work]}).encode()
                return json.dumps({'meta':{'count':2,'next_cursor':None},'results':[synthetic_work(2,year=2022)]}).encode()
        source = Source()
        with tempfile.TemporaryDirectory() as directory:
            run = pathlib.Path(directory) / 'private'
            receipts = acquire.Receipts(run, source)
            manifest = acquire.run_acquisition(run, receipts, required=[('T10429',2022)])
            self.assertEqual(manifest['status'], 'complete')
            self.assertEqual(manifest['works_count'], 2)
            self.assertEqual(manifest['authors_count'], 1)
            self.assertEqual(source.calls, 4)
            original = (run / 'manifest.json').read_bytes()
            # Rebuild normalized data from verified receipts in a new directory, no source calls.
            replay = pathlib.Path(directory) / 'replayed'
            result = acquire.run_acquisition(replay, acquire.Receipts(run, None, offline=True), required=[('T10429',2022)])
            self.assertEqual(result['works_count'], 2)
            self.assertEqual(source.calls, 4)
            self.assertEqual(original, (run / 'manifest.json').read_bytes())
            import sqlite3
            from contextlib import closing
            with closing(sqlite3.connect(replay / 'normalized.sqlite')) as db:
                self.assertNotIn('DO NOT RETAIN', str(db.execute('select payload from authors').fetchall()))
            receipt = next((run / 'raw').glob('*.json'))
            metadata = json.loads(receipt.read_bytes())
            (run / 'raw' / metadata['body_file']).write_bytes(b'corrupted')
            with self.assertRaises(ValueError):
                acquire.run_acquisition(pathlib.Path(directory) / 'bad', acquire.Receipts(run, None, offline=True), required=[('T10429',2022)])


class CliTests(unittest.TestCase):
    def test_streaming_checksum_and_parser_never_echoes_supplied_secrets(self):
        acquire = load('acquire')
        import subprocess, sys, hashlib
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / 'large'
            path.write_bytes(b'x' * 100000)
            self.assertEqual(acquire.sha_file(path),hashlib.sha256(b'x' * 100000).hexdigest())
        result = subprocess.run([sys.executable,str(SRC/'acquire.py'),'--api-key','SYNTHETIC_DO_NOT_ECHO'],capture_output=True,text=True)
        self.assertEqual(result.returncode,2)
        self.assertNotIn('SYNTHETIC_DO_NOT_ECHO',result.stderr)

    def test_sizing_is_no_write_ten_counts_and_cli_exposes_real_commands(self):
        acquire = load('acquire')
        import json, subprocess, sys
        class Source:
            calls = 0
            def get(self, path, params):
                if path == '/rate-limit':
                    return b'{"rate_limit":{"credits_remaining":9999,"credits_limit":10000,"credits_used":1,"daily_remaining_usd":0.9999,"resets_at":"2099-01-01T00:00:00Z","credit_costs":{"list":1,"singleton":0}}}'
                self.calls += 1
                return b'{"meta":{"count":101},"results":[]}'
        source = Source()
        result = acquire.size_inventory(source)
        self.assertEqual(source.calls,10)
        self.assertEqual(result['candidate_works'],1010)
        self.assertEqual(result['status'],'sizing_only')
        help_result = subprocess.run([sys.executable,str(SRC/'acquire.py'),'--help'], capture_output=True, text=True)
        self.assertEqual(help_result.returncode,0)
        for command in ('acquire','replay','smoke','size'):
            self.assertIn(command,help_result.stdout)


class BudgetTests(unittest.TestCase):
    def test_attempts_are_charged_before_timeout_and_cap_survives_resume(self):
        acquire = load('acquire')
        class Quota:
            def get(self, path, params):
                return b'{"rate_limit":{"credits_remaining":9999,"credits_limit":10000,"credits_used":1,"daily_remaining_usd":0.9999,"resets_at":"2099-01-01T00:00:00Z","credit_costs":{"list":1,"singleton":0}}}'
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / 'budget.json'
            budget = acquire.Budget(Quota(), path, cap=1, reserve=2727)
            budget.charge('/works')
            with self.assertRaises(acquire.BudgetStop):
                acquire.Budget(Quota(), path, cap=1, reserve=2727).charge('/authors')
            self.assertEqual(__import__('json').loads(path.read_text())['attempted_credits'], 1)


class MethodTests(unittest.TestCase):
    def test_actual_api_count_is_derived_from_complete_byline_not_invalid_select_field(self):
        acquire = load('acquire')
        work = synthetic_work()
        del work['authors_count']
        del work['is_authors_truncated']
        self.assertEqual(acquire.normalize_work(work)['authors_count'],1)
        self.assertNotIn('authors_count',acquire.METHOD['work_fields'])
        self.assertNotIn('is_authors_truncated',acquire.METHOD['work_fields'])

    def test_saturated_byline_is_not_falsely_reported_complete(self):
        acquire = load('acquire')
        work = synthetic_work()
        work['authors_count'] = 5000
        work['authorships'] = work['authorships'] * 5000
        with self.assertRaises(ValueError):
            acquire.normalize_work(work)

    def test_no_write_preflight_and_normalization(self):
        acquire = load('acquire')
        self.assertEqual(len(acquire.METHOD['topics']), 10)
        self.assertEqual(acquire.METHOD['end_date'], '2025-12-31')
        self.assertEqual(len(acquire.slices()), 180)
        work = synthetic_work()
        normalized = acquire.normalize_work(work)
        self.assertEqual(normalized['abstract'], 'Neural recording')
        self.assertEqual(normalized['authorships'][0]['author_order'], 1)
        self.assertEqual(normalized['authorships'][0]['author_id'], 'A1')
        self.assertNotIn('display_name', str(normalized))
        self.assertNotIn('DO NOT RETAIN', str(normalized))
        class Quota:
            calls = 0
            def get(self, path, params):
                self.calls += 1
                self.path = path
                return b'{"rate_limit":{"credits_remaining":9999,"credits_limit":10000,"credits_used":1,"daily_remaining_usd":0.9999,"resets_at":"2026-11-07T00:00:00Z","credit_costs":{"list":1,"singleton":0}}}'
        quota = Quota()
        result = acquire.preflight(quota)
        self.assertEqual(result['spend_cap_credits'], 7000)
        self.assertEqual(result['reserved_credits'], 2727)
        self.assertEqual(quota.calls, 1)
        self.assertEqual(quota.path, '/rate-limit')


def synthetic_work(number=1, topic='T10429', year=2000):
    return {'id': f'https://openalex.org/W{number}', 'doi': None, 'title': 'Synthetic neural recording',
            'abstract_inverted_index': {'Neural':[0], 'recording':[1]},
            'publication_date':f'{year}-01-01', 'publication_year':year, 'type':'article',
            'primary_topic':{'id':'https://openalex.org/' + topic},
            'primary_location':{'source':{'type':'journal'}}, 'locations':[],
            'authors_count':1, 'is_authors_truncated':False, 'updated_date':'2026-11-01',
            'authorships':[{'author':{'id':'https://openalex.org/A1','display_name':'DO NOT RETAIN'},
                           'author_position':'first','institutions':[{'id':'https://openalex.org/I1','type':'education','country_code':'US','display_name':'DO NOT RETAIN'}], 'countries':['US']}]}


if __name__ == '__main__':
    unittest.main()
