import importlib.util,copy,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('primary_cases',ROOT/'tests/test_primary_publications.py')
assert spec is not None and spec.loader is not None
cases=importlib.util.module_from_spec(spec);spec.loader.exec_module(cases)

def add(work,works,manifest):
 works.append(work)
 for row in manifest['works']['slices']:
  if row['topic_id']==work['primary_topic_id'] and row['year']==work['publication_year']:row['row_count']+=1

class IndependentCounting(unittest.TestCase):
 def test_venue_uses_same_complete_conditional_rule_as_primary_baseline(self):
  d=cases.load()
  for source in [None,'other','metadata','unknown']:
   self.assertEqual(d.venue({'type':'article','primary_source_type':source}),'Journal')
  self.assertEqual(d.venue({'type':'conference-paper','primary_source_type':'repository'}),'Preprint')

 def test_distinct_openalex_work_ids_are_retained_on_both_sides_of_matched_counts(self):
  works,histories,m=cases.fixture();pre=copy.deepcopy(works[1]);pre.update(id='https://openalex.org/W99',type='preprint')
  add(pre,works,m)
  result=cases.load().derive(works,histories,m)
  self.assertIn(['2022','Neurotech papers',5],result['tables']['nt_yearly']['rows'])
  self.assertEqual(result['audit']['paperCohort']['counting'],'one-openalex-work-id')

 def test_unattributed_work_counts_as_a_paper_and_an_unknown_fraction_never_a_person(self):
  works,histories,m=cases.fixture();empty=copy.deepcopy(works[1]);empty.update(id='https://openalex.org/W100',authorships=[],authors_count=0)
  add(empty,works,m);result=cases.load().derive(works,histories,m)
  self.assertIn(['2022','Neurotech papers',5],result['tables']['nt_yearly']['rows'])
  self.assertEqual(result['audit']['authorCohort']['authors'],3)
  self.assertEqual(result['audit']['authorCohort']['worksWithoutBylines'],1)
  coverage=next(r for r in result['audit']['coverage'] if r['dimension']=='institution_type' and r['year']==2022 and r['quarter']==1)
  self.assertEqual((coverage['total'],coverage['known'],coverage['unknown']),(4,2,2))

 def test_current_provider_funder_institution_type_is_preserved_as_other(self):
  works,histories,m=cases.fixture();works[1]['authorships'][0]['institutions'][0]['type']='funder'
  result=cases.load().derive(works,histories,m)
  self.assertTrue(any(r[0]=='Other institutions' and r[1]>0 for r in result['tables']['nt_talent_table']['rows']))

 def test_multiple_affiliation_choice_uses_most_represented_known_type_then_deterministic_tie(self):
  a=cases.fixture()[0][1]['authorships'][0]
  a['institutions'] += [{'id':'https://openalex.org/I2','type':'education','country_code':'US'},{'id':'https://openalex.org/I3','type':'company','country_code':'GB'}]
  self.assertEqual(cases.load().affiliation(a),('education','US'))

if __name__=='__main__':unittest.main()
