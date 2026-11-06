"""Synthetic regression: science history is 2010–2025, normalization stays 2022."""
import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/publications'))
import derive
import refresh


def science_fixture():
    return {'schema_version': 1, 'source_url': 'https://api.openalex.org', 'corpus': 'core',
            'types': list(derive.TYPES), 'acquired_at': '2026-11-06T12:00:00Z',
            'observed_through': '2025-12-31', 'complete': True,
            'method_id': 'openalex-primary-domain-work-count-v1',
            'rows': [{'group': group, 'year': year, 'papers': 400 + (year - 2010) * 50}
                     for group in ('All science', 'Life sciences', 'Social sciences', 'Physical sciences', 'Health sciences')
                     for year in range(2010, 2026)]}


class ScienceHistoryTests(unittest.TestCase):
    def test_acquisition_requests_all_sixteen_years(self):
        queries = refresh.science_plan()
        self.assertEqual(len(queries), 5)
        for _, _, params in queries:
            self.assertTrue(params['filter'].startswith('publication_year:2010-2025,'))

    def test_full_history_is_still_anchored_to_2022(self):
        annual = {year: 50 for year in range(2010, 2026)}
        rows = derive.science_context(science_fixture(), annual)
        self.assertEqual(len(rows), 48)
        self.assertEqual([r[2] for r in rows if r[0] == '2022'], [50, 50, 50])
        self.assertEqual([r[2] for r in rows if r[0] == '2010'], [20, 20, 20])
        self.assertEqual([r[2] for r in rows if r[0] == '2025'], [58, 58, 58])

    def test_partial_or_mixed_history_is_rejected(self):
        for remove in (1, 3, 12):
            source = copy.deepcopy(science_fixture())
            source['rows'] = source['rows'][remove:]
            with self.subTest(remove=remove), self.assertRaises(ValueError):
                derive.science_context(source, {2022: 50})


if __name__ == '__main__':
    unittest.main()
