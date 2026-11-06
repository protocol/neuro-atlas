import unittest
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts/publications'))
import matched_baselines as baseline
class ReferenceDecision(unittest.TestCase):
 def test_chosen_references_disclose_pending_acquisition_without_fake_counts(self):
  rows=baseline.derive(baseline.load_receipts(Path(__file__).resolve().parents[1]/'docs/publications/matched-baselines-fixtures.json'))['rows']
  for row in rows:
   if row['dimension'] in ('method','author'):
    self.assertTrue(row['denominatorUniverse'].startswith('Selected:'),row['id'])
    self.assertIn('acquisition',row['reason'].lower())
    self.assertEqual(row['baselineStatus'],'unavailable')
    self.assertIsNone(row['referenceCounts'])
    self.assertIsNone(row['referenceGrowthPct'])
if __name__=='__main__':unittest.main()
