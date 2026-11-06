import importlib.util,copy,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('slot_cases',ROOT/'tests/test_primary_publications.py')
assert spec is not None and spec.loader is not None
cases=importlib.util.module_from_spec(spec);spec.loader.exec_module(cases)

class RepeatedIndexedBylines(unittest.TestCase):
 def test_repeated_identified_slots_preserve_fractions_but_get_one_sector_vote_per_work(self):
  w,h,m=cases.fixture();original=copy.deepcopy(w[1]['authorships'][0])
  w[1]['authorships']=[dict(copy.deepcopy(original),author_order=n) for n in range(1,4)];w[1]['authors_count']=3
  for number in (121,122):
   new=copy.deepcopy(w[1]);new.update(id=f'https://openalex.org/W{number}',authors_count=1)
   new['authorships']=[dict(copy.deepcopy(original),author_order=1)];new['authorships'][0]['institutions'][0]['type']='company'
   w.append(new)
  for s in m['works']['slices']:
   if s['topic_id']=='T10429' and s['year']==2022:s['row_count']+=2
  result=cases.load().derive(w,h,m)
  sectors={r[0]:r[1] for r in result['tables']['nt_talent_table']['rows']}
  self.assertEqual(sectors,{'Academic':0,'Industry':2,'Other institutions':0,'No listed affiliation':1})
  self.assertEqual(result['audit']['authorCohort']['duplicateIdentifiedBylineSlots'],2)
  self.assertEqual(result['audit']['authorCohort']['authors'],3)

if __name__=='__main__':unittest.main()
