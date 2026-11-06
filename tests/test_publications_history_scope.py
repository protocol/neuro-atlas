import importlib.util,json,tempfile,unittest,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('acq_cases',ROOT/'tests/test_publications_acquisition.py')
assert spec is not None and spec.loader is not None
cases=importlib.util.module_from_spec(spec);spec.loader.exec_module(cases)

class AcquisitionHistoryScope(unittest.TestCase):
 def test_author_batches_include_every_active_window_contributor_and_no_irrelevant_old_profile(self):
  acquire=cases.load('acquire');asked=[]
  class Source:
   def get(self,path,params):
    if path=='/authors':
     asked.append(params['filter'])
     return json.dumps({'meta':{'count':1},'results':[{'id':'https://openalex.org/A2','counts_by_year':[{'year':1990,'works_count':1,'cited_by_count':0}],'updated_date':'2026-11-01'}]}).encode()
    year=2005 if '2005-01-01' in params['filter'] else 2017
    work=cases.synthetic_work(1 if year==2005 else 2)
    work.update(publication_year=year,publication_date=f'{year}-02-01')
    work['authorships'][0]['author']['id']='https://openalex.org/A1' if year==2005 else 'https://openalex.org/A2'
    return json.dumps({'meta':{'count':1,'next_cursor':None},'results':[work]}).encode()
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);result=acquire.run_acquisition(root,acquire.Receipts(root,Source()),required=[('T10429',2005),('T10429',2017)])
   self.assertEqual(result['works_count'],2)
   self.assertEqual(result['authors_count'],1)
   self.assertEqual(asked,['openalex:A2'])

if __name__=='__main__':unittest.main()
