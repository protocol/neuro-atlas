"""Synthetic endpoint-cohort checks; no production observations are inferred."""
import copy
from collections import Counter
import unittest

from test_primary_publications import fixture, load


class AffiliationEndpoints(unittest.TestCase):
    def test_all_sixteen_cells_share_exact_cohort_and_existing_yearly_sector_rules(self):
        works, histories, manifest = fixture()
        sectors = load().SECTORS
        kinds = ('education', 'company', 'healthcare', None)
        expected = Counter({('Academic', 'Industry'): 1,
                            ('No listed affiliation', 'Academic'): 1,
                            ('Industry', 'Industry'): 1})

        def add_author(number, observations, historical_first=2000):
            aid = f'https://openalex.org/A{number}'
            histories.append({'author_id': aid, 'updated_date': '2026-11-02', 'counts_by_year': [
                {'year': historical_first, 'works_count': 1, 'cited_by_count': 10}]})
            for year, kind in observations:
                work = copy.deepcopy(works[1])
                work.update(id=f'https://openalex.org/W{1000+len(works)}',
                            publication_year=year, publication_date=f'{year}-02-01')
                author = work['authorships'][0]
                author.update(author_id=aid, institutions=[] if kind is None else [
                    {'id': 'https://openalex.org/I1', 'type': kind, 'country_code': 'US'}])
                works.append(work)

        # One real synthetic person in every cell; missing means metadata, not no job.
        for i, origin in enumerate(kinds):
            for j, destination in enumerate(kinds):
                add_author(100+i*4+j, [(2016, origin), (2025, destination)])
                expected[sectors[i], sectors[j]] += 1
        # Same endpoint after a mid-period change is still a diagonal, not retention.
        add_author(120, [(2016, 'education'), (2019, 'company'), (2025, 'education')])
        expected['Academic', 'Academic'] += 1
        # Lifetime first paper is irrelevant; earliest SELECTED-topic year controls.
        add_author(121, [(2015, 'education'), (2025, 'company')])
        # Multiple works in just one active year never enter the endpoint cohort.
        add_author(122, [(2016, 'company'), (2016, 'company')])
        # Duplicate byline slots and extra same-year papers do not create people.
        duplicate = copy.deepcopy(works[1]); duplicate.update(id='https://openalex.org/W9999')
        duplicate['authorships'].append(copy.deepcopy(duplicate['authorships'][0]))
        duplicate['authorships'][1]['author_order'] = 2
        duplicate['authors_count'] = 2
        works.append(duplicate)
        counts = Counter((w['primary_topic_id'], w['publication_year']) for w in works)
        for row in manifest['works']['slices']:
            row['row_count'] = counts[row['topic_id'], row['year']]
        ids = [h['author_id'] for h in histories]
        manifest['author_histories'].update(expected_author_ids=ids, completed_author_ids=ids)
        result = load().derive(works, histories, manifest)
        self.assertEqual(result['tables']['nt_talent_endpoints']['rows'], [
            [s]+[expected[s,t] for t in sectors] for s in sectors])
        self.assertEqual(result['tables']['nt_talent_moves']['rows'], [
            [s]+[None if s==t else expected[s,t] for t in sectors] for s in sectors])
        cohort = result['audit']['affiliationEndpointCohort']
        self.assertEqual(cohort['eligibleAuthors'], sum(expected.values()))
        self.assertEqual(cohort['sameSectorAuthors'], sum(expected[s,s] for s in sectors))
        self.assertEqual(cohort['changedSectorAuthors'], sum(v for (s,t),v in expected.items() if s!=t))
        self.assertEqual(result, load().derive(list(reversed(works)), list(reversed(histories)), manifest))

    def test_full_endpoint_cohort_includes_same_sector_without_changing_moves(self):
        works, histories, manifest = fixture()
        result = load().derive(works, histories, manifest)
        self.assertIn('nt_talent_endpoints', result['tables'], 'complete endpoint table is missing')
        self.assertEqual(result['tables']['nt_talent_endpoints']['rows'], [
            ['Academic', 0, 1, 0, 0], ['Industry', 0, 1, 0, 0],
            ['Other institutions', 0, 0, 0, 0], ['No listed affiliation', 1, 0, 0, 0]])
        self.assertEqual(result['audit']['affiliationEndpointCohort'], {
            'methodId': 'atlas-publication-affiliation-endpoints-v1',
            'firstYearMin': 2016, 'lastYearMax': 2025, 'minActiveYears': 2,
            'eligibleAuthors': 3, 'sameSectorAuthors': 1, 'changedSectorAuthors': 2})
        self.assertEqual(result['tables']['nt_talent_moves']['rows'], [
            ['Academic', None, 1, 0, 0], ['Industry', 0, None, 0, 0],
            ['Other institutions', 0, 0, None, 0], ['No listed affiliation', 1, 0, 0, None]])


if __name__ == '__main__':
    unittest.main()
