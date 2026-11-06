"""Histories are mandatory for every active ranking-cohort author, not irrelevant old IDs."""
import importlib.util,copy,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('history_cases',ROOT/'tests/test_primary_publications.py')
assert spec is not None and spec.loader is not None
cases=importlib.util.module_from_spec(spec);spec.loader.exec_module(cases)

class HistoryScope(unittest.TestCase):
 def test_inactive_historical_contributor_requires_no_profile_and_changes_no_display_table(self):
  d=cases.load();w,h,m=cases.fixture();before=d.derive(w,h,m)
  old=copy.deepcopy(w[0]);old.update(id='https://openalex.org/W120',publication_year=2005,publication_date='2005-02-01',authors_count=1)
  old['authorships']=[copy.deepcopy(old['authorships'][0])]
  old['authorships'][0]['author_id']='https://openalex.org/A4'
  w.append(old)
  for row in m['works']['slices']:
   if row['topic_id']=='T10429' and row['year']==2005:row['row_count']+=1
  after=d.derive(w,h,m)
  self.assertEqual(before['tables'],after['tables'])
  self.assertEqual(after['audit']['authorCohort']['authors'],4)
  # Move that same author into the earliest active ranking year: still mandatory.
  old.update(publication_year=2017,publication_date='2017-02-01')
  for row in m['works']['slices']:
   if row['topic_id']=='T10429' and row['year']==2005:row['row_count']-=1
   if row['topic_id']=='T10429' and row['year']==2017:row['row_count']+=1
  with self.assertRaisesRegex(ValueError,'missing selected author history'):
   d.derive(w,h,m)

if __name__=='__main__':unittest.main()
