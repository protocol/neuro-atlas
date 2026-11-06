import importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('exact_cases',ROOT/'tests/test_primary_publications.py')
assert spec is not None and spec.loader is not None
cases=importlib.util.module_from_spec(spec);spec.loader.exec_module(cases)

class ExactAuditEncoding(unittest.TestCase):
 def test_every_rational_component_has_lossless_decimal_string_encoding(self):
  w,h,m=cases.fixture();result=cases.load().derive(w,h,m)
  for row in result['audit']['quarterlyFractionalOutput']:
   for ratio in [row['rawFraction'],row['scaledFraction']]:
    if ratio is not None:
     self.assertTrue(all(isinstance(v,str) and v.isdecimal() for v in ratio))
     self.assertGreater(int(ratio[1]),0)

if __name__=='__main__':unittest.main()
