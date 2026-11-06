import importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('date_cases',ROOT/'tests/test_primary_publications.py')
assert spec is not None and spec.loader is not None
cases=importlib.util.module_from_spec(spec);spec.loader.exec_module(cases)

class ChronologicalFreshness(unittest.TestCase):
 def test_mixed_utc_precision_preserves_the_chronologically_latest_source_string(self):
  w,h,m=cases.fixture()
  m['works']['acquired_at']='2026-11-03T09:00:00Z'
  m['author_histories']['acquired_at']='2026-11-03T09:00:00.500000+00:00'
  for rows in (w,h):
   rows[0]['updated_date']='2026-11-02T09:00:00.1Z'
   rows[1]['updated_date']='2026-11-02T09:00:00.11Z'
  result=cases.load().derive(w,h,m)
  self.assertEqual(result['source']['capturedAt'],m['author_histories']['acquired_at'])
  self.assertEqual(result['source']['worksMaxUpdatedDate'],w[1]['updated_date'])
  self.assertEqual(result['source']['authorsMaxUpdatedDate'],h[1]['updated_date'])

if __name__=='__main__':unittest.main()
