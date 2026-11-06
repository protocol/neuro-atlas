import importlib.util,json,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('receipt_cases',ROOT/'tests/test_publications_acquisition.py')
assert spec is not None and spec.loader is not None
cases=importlib.util.module_from_spec(spec);spec.loader.exec_module(cases)

class FinalizedReceipts(unittest.TestCase):
 def test_finalized_cache_requires_original_complete_receipt_inventory(self):
  acquire=cases.load('acquire')
  class Source:
   def get(self,path,params):return b'{"meta":{"count":0,"next_cursor":null},"results":[]}'
  for corruption in ['missing-directory','changed-metadata']:
   with self.subTest(corruption=corruption),tempfile.TemporaryDirectory() as directory:
    root=Path(directory);r=acquire.Receipts(root,Source());acquire.run_acquisition(root,r,required=[('T10429',2000)])
    replay=acquire.Receipts(root,None,offline=True)
    if corruption=='missing-directory':replay.raw=root/'nonexistent'
    else:
     p=next((root/'raw').glob('*.json'));body=json.loads(p.read_bytes());body['started_at']='2000-01-01T00:00:00+00:00';p.write_text(json.dumps(body))
    with self.assertRaisesRegex(ValueError,'receipt'):
     acquire.run_acquisition(root,replay,required=[('T10429',2000)])

if __name__=='__main__':unittest.main()
