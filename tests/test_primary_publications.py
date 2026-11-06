"""Synthetic, test-only primary replay. No production observations or copied aggregates."""
import importlib.util
import json
import hashlib
import copy
from pathlib import Path
import unittest


def fixture():
    def author(aid, sector=None):
        return {'author_id': aid, 'author_position': 'first', 'author_order': 1,
                'institutions': [] if sector is None else [{'id': 'https://openalex.org/I1', 'type': sector, 'country_code': 'US'}],
                'countries': [] if sector is None else ['US']}
    def work(wid, year, authors, topic='T10429', title=None):
        authors = copy.deepcopy(authors)
        for n, a in enumerate(authors, 1):
            a['author_order'] = n
        return {'id': 'https://openalex.org/W' + str(wid), 'doi': None,
                'title': title or f'EEG brain-computer interface synthetic experiment number {wid}',
                'abstract': None, 'publication_date': f'{year}-02-01', 'publication_year': year,
                'type': 'article', 'primary_topic_id': topic, 'primary_source_type': 'journal',
                'locations': [], 'authors_count': len(authors), 'is_authors_truncated': False,
                'updated_date': '2026-11-01', 'authorships': authors}
    a, b, c = 'https://openalex.org/A1', 'https://openalex.org/A2', 'https://openalex.org/A3'
    works = [work(1, 2016, [author(a, 'education'), author(b)]),
             work(2, 2022, [author(a, 'education')]), work(3, 2022, [author(b)]),
             work(4, 2022, [author(c, 'company')]),
             work(5, 2025, [author(a, 'company')]), work(6, 2025, [author(b, 'education')]),
             work(7, 2025, [author(c, 'company')]),
             work(8, 2022, [author(None)], 'T10614'),
             work(9, 2025, [author(None)], 'T10958', 'intracortical brain experiment')]
    histories = [{'author_id': aid, 'updated_date': '2026-11-02', 'counts_by_year':
                  [{'year': first, 'works_count': 1, 'cited_by_count': 0},
                   {'year': 2024, 'works_count': 0, 'cited_by_count': cites}]}
                 for aid, first, cites in [(a, 2000, 10), (b, 2016, 10), (c, 2022, 0)]]
    counts = {}
    for w in works:
        key = (w['primary_topic_id'], w['publication_year'])
        counts[key] = counts.get(key, 0) + 1
    slices = [{'topic_id': t, 'year': y, 'row_count': counts.get((t, y), 0), 'complete': True}
              for t in ['T10429', 'T11601', 'T10614', 'T10958', 'T12015', 'T11993', 'T10094', 'T10581', 'T10241', 'T10919']
              for y in range(2000 if t in ('T10429', 'T11601') else 2010, 2026)]
    manifest = {'schema_version': 1, 'source_url': 'https://api.openalex.org', 'corpus': 'core',
                'test_only': True, 'complete_years': list(range(2000, 2026)),
                'observed_through': '2025-12-31', 'works': {'complete': True, 'acquired_at': '2026-11-03T09:00:00Z',
                'full_bylines': True, 'slices': slices},
                'author_histories': {'complete': True, 'acquired_at': '2026-11-03T10:00:00Z',
                'expected_author_ids': [a,b,c], 'completed_author_ids': [a,b,c],
                'publication_history_complete': True, 'citation_years_complete': list(range(2012, 2026))},
                'coverage_policy': {'minimum_known_share': {'region': 0.1, 'institution_type': 0.1,
                                   'career_stage': 0.1, 'pedigree': 0.1}}}
    return works, histories, manifest

PATH = Path(__file__).resolve().parents[1] / 'scripts/publications/derive.py'

def load():
    spec = importlib.util.spec_from_file_location('derive', PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

class PrimaryReplay(unittest.TestCase):
    def test_exact_primary_replay_four_outputs(self):
        d = load()
        self.assertTrue(callable(getattr(d, 'derive', None)), 'primary replay is not implemented')
        works, histories, manifest = fixture()
        result = d.derive(works, histories, manifest)
        t = result['tables']
        self.assertEqual([r for r in t['nt_yearly']['rows'] if r[0] in ['2022', '2025']],
                         [['2022', 'Neurotech papers', 4], ['2025', 'Neurotech papers', 4]])
        self.assertEqual(t['neurotech_institutions_table']['rows'],
                         [['Universities', 2, 1, -50.0, None], ['Companies', 2, 2, 0.0, None],
                          ['National institutes', 0, 0, None, None]])
        self.assertEqual(t['nt_talent_table']['rows'], [
            ['Academic', 1, 1, 0.0, 0, None, None],
            ['Industry', 1, 2, 100.0, 0, None, 100.0],
            ['Other institutions', 0, 0, None, 0, None, None],
            ['No listed affiliation', 1, 0, -100.0, 0, None, None]])
        self.assertEqual(t['nt_talent_moves']['rows'], [
            ['Academic', None, 1, 0, 0], ['Industry', 0, None, 0, 0],
            ['Other institutions', 0, 0, None, 0], ['No listed affiliation', 1, 0, 0, None]])
        self.assertEqual(sum(len(t[name]['rows']) for name in d.GROWTH_GROUPS), 21)
        self.assertEqual(result, d.derive(list(reversed(works)), list(reversed(histories)), manifest))
        self.assertNotIn('https://openalex.org/A', json.dumps(result))
        self.assertEqual(result['source']['paperAsOf'], '2026-11-03')
        self.assertEqual(result['source']['authorAsOf'], '2026-11-03')

    def test_fail_closed_invalid_primary_inputs(self):
        cases = {
            'missing author batch': lambda w,h,m: m['author_histories']['completed_author_ids'].pop(),
            'missing history': lambda w,h,m: h.pop(),
            'duplicate history': lambda w,h,m: h.append(copy.deepcopy(h[0])),
            'truncated byline': lambda w,h,m: w[0].update(is_authors_truncated=True),
            'incorrect full byline': lambda w,h,m: w[0].update(authors_count=3),
            'duplicate byline order': lambda w,h,m: w[0]['authorships'][1].update(author_order=w[0]['authorships'][0]['author_order']),
            'supplied fraction': lambda w,h,m: w[0]['authorships'][0].update(frac=0.7),
            'missing coverage policy': lambda w,h,m: m.pop('coverage_policy'),
            'coverage collapse': lambda w,h,m: m['coverage_policy']['minimum_known_share'].update(institution_type=0.99),
            'incomplete year': lambda w,h,m: m['complete_years'].remove(2025),
            'lost slice': lambda w,h,m: m['works']['slices'].pop(),
            'wrong slice count': lambda w,h,m: m['works']['slices'][0].update(row_count=100),
            'incomplete citations': lambda w,h,m: m['author_histories']['citation_years_complete'].remove(2024),
            'malformed identifier': lambda w,h,m: w[0].update(id=' W1'),
            'invalid calendar date': lambda w,h,m: w[0].update(publication_date='2016-02-30'),
        }
        for name, corrupt in cases.items():
            with self.subTest(name=name):
                w,h,m = fixture()
                corrupt(w,h,m)
                with self.assertRaises(ValueError, msg=name):
                    load().derive(w,h,m)

    def test_optional_primary_science_baseline_is_not_matched(self):
        w,h,m = fixture()
        baseline = {'schema_version':1,'source_url':'https://api.openalex.org','corpus':'core',
                    'types':list(load().TYPES),'acquired_at':'2026-11-03T11:00:00Z',
                    'observed_through':'2025-12-31','complete':True,
                    'method_id':'openalex-primary-domain-work-count-v1',
                    'rows':[{'group':group,'year':y,'papers':100+(y-2022)*n}
                            for group,n in [('Life sciences',10),('Social sciences',20),('Physical sciences',30),('Health sciences',40),('All science',25)]
                            for y in range(2022,2026)]}
        result = load().derive(w,h,m,science_baseline=baseline)
        self.assertEqual([r for r in result['tables']['nt_yearly']['rows'] if r[0]=='2025'],
                         [['2025','Neurotech papers',4],['2025','All research',7],
                          ['2025','Science baseline, low',5],['2025','Science baseline, high',9]])
        self.assertEqual(result['audit']['baselineStatus'],'primary-four-domain-context')
        self.assertTrue(all(row[4] is None for name in load().GROWTH_GROUPS for row in result['tables'][name]['rows']))
        baseline['rows'].pop()
        with self.assertRaises(ValueError):
            load().derive(w,h,m,science_baseline=baseline)

    def test_rank_ties_unknown_first_year_and_dedup_rules(self):
        d=load()
        w,h,m=fixture()
        merged=d.deduplicate(w)
        p,_,_=d.author_profiles([x for x in merged if d.selected(x,author=True)],{x['author_id']:x for x in h})
        self.assertEqual(p['https://openalex.org/A1',2025],('Late career (16+ years)','Top 1%'))
        self.assertEqual(p['https://openalex.org/A2',2025],('Mid career (6-15 years)','Top 1%'))
        self.assertEqual(p['https://openalex.org/A3',2022],('Unknown','Unknown'))
        pre=copy.deepcopy(w[1]); pre.update(id='https://openalex.org/W99',type='preprint')
        self.assertEqual(len(d.collapse(w+[pre])),len(w))
        old=copy.deepcopy(w[1]); old.update(updated_date='2026-01-01',title='old')
        self.assertEqual(d.deduplicate([old,w[1]])[0]['title'],w[1]['title'])
        later=copy.deepcopy(w[1]); later.update(updated_date='2026-11-01T01:00:00.5Z',title='newest')
        earlier=copy.deepcopy(w[1]); earlier.update(updated_date='2026-11-01T01:00:00Z')
        self.assertEqual(d.deduplicate([earlier,later])[0]['title'],'newest')
        conflict=copy.deepcopy(w[1]); conflict['title']='conflict'
        with self.assertRaises(ValueError):
            d.deduplicate([conflict,w[1]])
        a=copy.deepcopy(w[1]['authorships'][0])
        a['institutions'].append({'id':'https://openalex.org/I9','type':'company','country_code':'GB'})
        self.assertEqual(d.affiliation(a),('company','GB'))
        a['institutions'].reverse()
        self.assertEqual(d.affiliation(a),('company','GB'))
        self.assertEqual(d.technique({'title':'ECoG EEG MEG brain','abstract':None}),'Invasive')
        self.assertFalse(d.GATE.search('ECOG oncology'))
        self.assertEqual(d.region('TR'),'Asia')
        self.assertEqual(d.region('MX'),'Rest of world')
        self.assertEqual(d.region('IO'),'Rest of world')
        self.assertEqual(d.region('ZZ'),'Unknown')

    def test_unreviewed_all_group_matching_inlet_is_disabled(self):
        d=load(); w,h,m=fixture()
        matched={'schema_version':1,'source_url':'https://api.openalex.org','method_id':'test-only-matched-v1',
                 'target_method_id':d.METHOD_ID,'acquired_at':'2026-11-03T11:00:00Z','complete':True,
                 'corpus':'core','types':list(d.TYPES),'observed_through':'2025-12-31',
                 'counting_parity':'full-byline-quarterly-known-scaling-even-round-v1',
                 'rows':[{'table':name,'group':g,'year':y,'count':10+y-2022}
                         for name,groups in d.GROWTH_GROUPS.items() for g in groups for y in range(2022,2026)]}
        for test_only in (True,False):
            m['test_only']=test_only
            with self.assertRaisesRegex(ValueError,'unsupported'):
                d.derive(w,h,m,matched_baseline=matched)

    def test_offline_cli_exact_replay_and_preserves_output_on_failure(self):
        import tempfile, subprocess
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory); w,h,m=fixture()
            for name,rows in [('works',w),('author_histories',h)]:
                data=(''.join(json.dumps(r,sort_keys=True)+'\n' for r in rows)).encode()
                (path/(name+'.jsonl')).write_bytes(data)
                m[name]['sha256']=hashlib.sha256(data).hexdigest()
            (path/'manifest.json').write_text(json.dumps(m))
            cmd=['python3',str(PATH),'--works',str(path/'works.jsonl'),'--author-histories',str(path/'author_histories.jsonl'),
                 '--manifest',str(path/'manifest.json'),'--out',str(path/'aggregate.json'),'--allow-test-fixture']
            run=subprocess.run(cmd,capture_output=True,text=True)
            self.assertEqual(run.returncode,0,run.stderr)
            self.assertTrue((path/'aggregate.json').exists(),'CLI did not produce the aggregate')
            first=(path/'aggregate.json').read_bytes()
            self.assertEqual(subprocess.run(cmd,capture_output=True).returncode,0)
            self.assertEqual((path/'aggregate.json').read_bytes(),first)
            (path/'works.jsonl').write_text('{}\\n')
            self.assertNotEqual(subprocess.run(cmd,capture_output=True).returncode,0)
            self.assertEqual((path/'aggregate.json').read_bytes(),first)

    def test_unknown_metadata_and_noncanonical_identifiers(self):
        d=load()
        self.assertEqual(d.venue({'type':'article','primary_source_type':None}),'Journal')
        self.assertEqual(d.affiliation({'institutions':[{'id':None,'type':None,'country_code':'GB'}],'countries':[]}), (None,'GB'))
        with self.assertRaises(ValueError):
            d.identifier('A1','A')

    def test_jsonl_rejects_duplicate_keys(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'invalid.jsonl'
            path.write_text('{"id":"a","id":"b"}'+chr(10))
            with self.assertRaises(ValueError):
                load().read_jsonl(path)

    def test_pipeline_exists_and_has_versioned_method(self):
        self.assertTrue(PATH.exists(), 'independent primary derivation implementation is missing')
        self.assertEqual(load().METHOD_ID, 'atlas-primary-publications-v1')

if __name__ == '__main__':
    unittest.main()
