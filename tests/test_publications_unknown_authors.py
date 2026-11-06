import importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('unknown_cases',ROOT/'tests/test_publications_acquisition.py')
assert spec is not None and spec.loader is not None
cases=importlib.util.module_from_spec(spec);spec.loader.exec_module(cases)

class UnknownSourceAuthors(unittest.TestCase):
 def test_reserved_or_missing_author_objects_remain_unknown_full_byline_slots(self):
  acquire=cases.load('acquire')
  for raw in [None,{'id':'https://openalex.org/A9999999999'},{'id':'https://openalex.org/A5317838346'}]:
   with self.subTest(raw=raw):
    work=cases.synthetic_work();work['authorships'][0]['author']=raw
    row=acquire.normalize_work(work)
    self.assertEqual(row['authors_count'],1)
    self.assertIsNone(row['authorships'][0]['author_id'])
    self.assertEqual(row['authorships'][0]['author_order'],1)

if __name__=='__main__':unittest.main()
