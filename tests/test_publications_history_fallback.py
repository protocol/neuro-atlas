"""Synthetic replay of a genuinely reconstructed history, never a fabricated API profile."""
import importlib.util,json,tempfile,unittest,sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fallback_cases',ROOT/'tests/test_publications_acquisition.py')
assert spec is not None and spec.loader is not None
cases=importlib.util.module_from_spec(spec);spec.loader.exec_module(cases)

class ReconstructedHistory(unittest.TestCase):
 def test_missing_profile_is_derived_from_complete_primary_works_and_exactly_replays(self):
  acquire=cases.load('acquire')
  class Source:
   def get(self,path,params):
    if path=='/authors':return b'{"meta":{"count":0},"results":[]}'
    if params.get('filter')=='author.id:A1':
     self_corpus=params.get('corpus');assert self_corpus=='all'
     return json.dumps({'meta':{'count':2,'next_cursor':None},'results':[
      {'id':'https://openalex.org/W1','publication_year':2022,'updated_date':'2026-11-01','counts_by_year':[{'year':2024,'cited_by_count':2}]},
      {'id':'https://openalex.org/W2','publication_year':1990,'updated_date':'2026-11-01','counts_by_year':[{'year':2017,'cited_by_count':3}]}]}).encode()
    return json.dumps({'meta':{'count':1,'next_cursor':None},'results':[cases.synthetic_work(year=2022)]}).encode()
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory)/'source';result=acquire.run_acquisition(root,acquire.Receipts(root,Source()),required=[('T10429',2022)])
   with sqlite3.connect(root/'normalized.sqlite') as db:history=json.loads(db.execute('select payload from authors').fetchone()[0])
   self.assertEqual(history['counts_by_year'],[{'year':1990,'works_count':1,'cited_by_count':0},{'year':2017,'works_count':0,'cited_by_count':3},{'year':2022,'works_count':1,'cited_by_count':0},{'year':2024,'works_count':0,'cited_by_count':2}])
   self.assertEqual(result['author_history_reconstructions'][0]['works_count'],2)
   self.assertEqual(result['author_history_reconstructions'][0]['method'],'complete-all-corpus-author-works-v1')
   replay=Path(directory)/'replay';again=acquire.run_acquisition(replay,acquire.Receipts(root,None,offline=True),required=[('T10429',2022)])
   self.assertEqual(again['normalized_sha256'],result['normalized_sha256'])

if __name__=='__main__':unittest.main()
