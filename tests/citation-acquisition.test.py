import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Acquisition(unittest.TestCase):
    def adapter(self):
        spec = importlib.util.spec_from_file_location('citation', ROOT / 'scripts/openalex-citation-latency.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_free_only_budget_charges_every_attempt_and_keeps_reserve(self):
        a = self.adapter()
        b = a.Budget(100, 25, 50)
        for _ in range(5):
            b.charge(10)
        with self.assertRaises(RuntimeError): b.charge(1)
        self.assertEqual(b.spent, 50)
        b = a.Budget(35, 25, 100)
        b.charge(10)
        with self.assertRaises(RuntimeError): b.charge(1)

    def test_budget_rejects_unknown_or_prepaid_combined_allowance(self):
        a = self.adapter()
        self.assertEqual(a.free_remaining({'rate_limit': {'daily_budget_usd': 1, 'daily_used_usd': .1, 'daily_remaining_usd': .9, 'prepaid_remaining_usd': 0}}), 9000)
        for report in [{}, {'remaining': 99999}, {'rate_limit': {'daily_budget_usd': 2, 'daily_used_usd': 0}}, {'rate_limit': {'daily_budget_usd': 1, 'daily_used_usd': -1}}, {'rate_limit': {'daily_budget_usd': 1, 'daily_used_usd': 0, 'daily_remaining_usd': 1, 'prepaid_remaining_usd': 1}}]:
            with self.assertRaises(RuntimeError): a.free_remaining(report)

    def test_offline_full_year_mock_acquisition_replays_exact_bytes_and_detects_tampering(self):
        # Explicit synthetic provider responses; no network and no real credential.
        import argparse
        import json
        from unittest.mock import patch
        a = self.adapter()
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            args = argparse.Namespace(run=str(base/'run'), out=str(base/'run'/'neurotech.csv'), acquire=True,
                lock=str(base/'lock'), max_credits=3000, reserve_credits=1000, max_seconds=7200)
            remaining = 10000
            def request(path, params):
                nonlocal remaining
                if path == '/rate-limit': return {'rate_limit': {'daily_budget_usd':1,'daily_used_usd':0,'daily_remaining_usd':1,'prepaid_remaining_usd':0}}, {}
                filt=params['filter']; remaining -= 10 if 'title_and_abstract' in filt else 1
                headers={'X-RateLimit-Remaining':str(remaining),'X-RateLimit-Limit':'10000'}
                if filt.startswith('openalex_id:'):
                    return {'results':[{'id':'https://openalex.org/W1','publication_year':1990}]}, headers
                if 'sample' in params:
                    year=int(filt.split('publication_year:')[-1])
                    return {'results':[{'id':f'https://openalex.org/W{100+i}', 'publication_year':year, 'referenced_works':['https://openalex.org/W1']} for i in range(8)]}, headers
                return {'meta':{'count':8 if 'title_and_abstract' in filt else 100}}, headers
            with patch.object(a,'request',request), patch.object(a.time,'sleep',lambda _:None), patch.dict(a.os.environ,{'OPENALEX_API_KEY':'SYNTHETIC_TEST_ONLY'}):
                a.run(args)
                original=Path(args.out).read_bytes()
                manifest=json.loads((base/'run/manifest.json').read_text())
                self.assertTrue(manifest['complete'])
                args.acquire=False; args.out=str(base/'replay.csv')
                a.run(args)
                self.assertEqual(Path(args.out).read_bytes(),original)
                first=base/'run'/manifest['receipts'][0]['file']
                first.write_text('{}')
                with self.assertRaisesRegex(RuntimeError,'hash mismatch'): a.run(args)

    def test_curl_native_environment_handle_never_receives_key_value_and_refuses_redirects(self):
        from unittest.mock import patch
        from types import SimpleNamespace
        a=self.adapter()
        response=SimpleNamespace(returncode=0,stdout=b'HTTP/2 200\r\nContent-Type: application/json\r\nX-RateLimit-Remaining: 9999\r\nX-RateLimit-Limit: 10000\r\n\r\n{"meta":{"count":1}}',stderr=b'')
        with patch.object(a.subprocess,'run',return_value=response) as call:
            data,headers=a.request('/works',{'filter':'publication_year:2023'})
            argv=call.call_args.args[0]
            self.assertEqual(argv[:2],['curl','-q'])
            self.assertIn('%OPENALEX_API_KEY',argv)
            self.assertIn('Authorization: Bearer {{OPENALEX_API_KEY}}',argv)
            self.assertNotIn('--location',argv); self.assertNotIn('-L',argv); self.assertNotIn('-k',argv)
            self.assertEqual(argv[argv.index('--max-redirs')+1],'0')
            self.assertNotIn('api_key=',argv[-1])
            self.assertEqual(data['meta']['count'],1)
            response.stdout=b'HTTP/2 302\r\nLocation: https://other.example\r\nContent-Type: application/json\r\n\r\n{}'
            with self.assertRaises(a.SourceHTTPError):a.request('/works',{})

    def test_pinned_source_matches_git_blob(self):
        a = self.adapter()
        self.assertEqual(a.generator_blob(), '87a4e15fa4f957ca980a056d949b72cfc353b615')

if __name__ == '__main__': unittest.main()
