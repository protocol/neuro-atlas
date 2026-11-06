#!/usr/bin/env python3
"""Independent offline primary-source derivation; docs/publications/primary-method.md.

No network calls, report imports, names, ORCIDs, raw records, or wall-clock freshness.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import date, datetime
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import re
import sys

METHOD_ID = 'atlas-primary-publications-v1'
FIRST, BASE, LAST = 2000, 2022, 2025
TYPES = ('article', 'preprint', 'review', 'book-chapter', 'conference-paper')
AUTHOR_TOPICS = ('T10429', 'T11601')
FULL_TOPICS = AUTHOR_TOPICS + ('T10614',)
GATED_TOPICS = ('T10958', 'T12015', 'T11993', 'T10094', 'T10581', 'T10241', 'T10919')
SECTORS = ('Academic', 'Industry', 'Other institutions', 'No listed affiliation')
UNKNOWN = 'Unknown'
# Case-sensitive acronyms; phrase fragments intentionally match word stems.
INVASIVE = re.compile(r'(?i:intracortical|micro-?electrode arrays?|utah arrays?|electrocorticogra|stereo-?EEG|stereoelectroencephalogra|intracranial|neural implant|implantable|endovascular|stentrode|deep brain recording)|\b(?:ECoG|iEEG|sEEG)\b')
HIGH = re.compile(r'(?i:focused ultrasound|functional ultrasound|transcranial ultrasound|transcranial magnetic|magnetoencephalogra)|\b(?:r|d|i|p|sp|pp)?TMS\b|\bMEG\b|\bOPMs?\b')
EEG = re.compile(r'\bEEGs?\b|(?i:electroencephalogra)')
BCI = re.compile(r'(?i:brain[- ]?(?:computer|machine) interfaces?)|\bBCIs?\b')
GATE = re.compile(r'(?i:intracortical|micro-?electrode arrays?|utah arrays?|electrocorticogra|stereo-?EEG|stereoelectroencephalogra|intracranial (?:EEG|electro|record)|neural implant|implantable (?:neural|brain|electrode|neuro|cortical)|stentrode|endovascular (?:BCI|brain|electrode|interface|neural)|deep brain recording|focused ultrasound|functional ultrasound|transcranial ultrasound|transcranial magnetic|magnetoencephalogra|brain[- ]?(?:computer|machine) interface)|\b(?:ECoG|iEEG|sEEG)\b|\b(?:r|d|i|p)?TMS\b|\bMEG\b|\bOPMs?\b|\bBCIs?\b')
NEURAL = re.compile(r'(?i:brain|neur|cortex|cortical|cerebr|transcranial|thalam|epilep|cognit)')
# UN M49 geographic regions, ISO 3166-1 alpha-2. North America here is US/CA only.
ASIA = set('AF AM AZ BH BD BT BN KH CN CY GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE'.split())
EUROPE = set('AX AL AD AT BY BE BA BG HR CZ DK EE FO FI FR DE GI GR GG VA HU IS IE IM IT JE LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SJ SE CH UA GB'.split())
REST = set('IO DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU YT MA MZ NA NE NG RE RW SH ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW AQ BV TF HM GS AS AU CX CC CK FJ PF GU KI MH FM NR NC NZ NU NF MP PW PG PN WS SB TK TO TV UM VU WF AI AG AW BS BB BZ BM BQ VG CA KY CR CU CW DM DO SV GL GD GP GT HT HN JM MQ MX MS NI PA PR BL KN LC MF PM VC SX TT TC US VI AR BO BR CL CO EC FK GF GY PY PE SR UY VE'.split())
GROWTH_GROUPS = {
    'neurotech_topics_table': ('Invasive', 'Ultrasound, TMS and MEG', 'EEG', 'No technique named'),
    'neurotech_bciflag_table': ('About BCI', 'Not about BCI'),
    'neurotech_venues_table': ('Journal', 'Conference', 'Preprint'),
    'neurotech_regions_table': ('Asia', 'North America', 'Europe'),
    'neurotech_institutions_table': ('Universities', 'Companies', 'National institutes'),
    'neurotech_career_table': ('Early career (1-5 years)', 'Mid career (6-15 years)', 'Late career (16+ years)'),
    'neurotech_pedigree_table': ('Top 1%', 'Top 1-10%', 'Top 10-50%'),
}
AUTHOR_DIMS = dict(zip(tuple(GROWTH_GROUPS)[3:], ('region', 'institution_type', 'career_stage', 'pedigree')))


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def table(names, rows):
    strings = {'year', 'series', 'group', 'place', 'from'}
    return {'columns': [{'name': n, 'type': 'string' if n in strings else 'number'} for n in names], 'rows': rows}


def pct(end, start):
    return round(float((Fraction(end) / start - 1) * 100), 1) if start else None


def share(n, total):
    return round(n / total * 100, 1) if total else None


def venue(work):
    kind, source = work['type'], work['primary_source_type']
    if kind == 'preprint' or source == 'repository':
        return 'Preprint'
    if kind == 'conference-paper' or source == 'conference':
        return 'Conference'
    if kind == 'book-chapter' or source in ('book series', 'ebook platform'):
        return 'Book chapter'
    return 'Journal'  # Exhaustive shared venue taxonomy, including unclassified sources.


def text(work):
    return (work['title'] or '') + ' ' + (work['abstract'] or '')


def technique(work):
    body = text(work)
    for pattern, label in ((INVASIVE, 'Invasive'), (HIGH, 'Ultrasound, TMS and MEG'), (EEG, 'EEG')):
        if pattern.search(body):
            return label
    return 'No technique named'


def selected(work, author=False):
    y, topic = work['publication_year'], work['primary_topic_id']
    if work['type'] not in TYPES or not (FIRST <= y <= LAST):
        return False
    if author:
        return topic in AUTHOR_TOPICS
    return y >= 2010 and (topic in FULL_TOPICS or (topic in GATED_TOPICS and GATE.search(text(work)) and NEURAL.search(text(work))))


def deduplicate(works):
    """Reconcile each indexed work ID by newest actual source update."""
    by_id = {}
    for work in works:
        old = by_id.get(work['id'])
        if old is not None and updated(work['updated_date']) == updated(old['updated_date']):
            require(canonical(old) == canonical(work), 'conflicting work versions at identical updated_date')
        if old is None or updated(work['updated_date']) > updated(old['updated_date']):
            by_id[work['id']] = work
    return [by_id[k] for k in sorted(by_id)]


def collapse(works):
    def key(w):
        k = re.sub('[^a-z0-9]', '', (w['title'] or '').lower())
        return k if len(k) > 30 else None
    published = {key(w) for w in works if venue(w) in ('Journal','Conference','Book chapter') and key(w)}
    return [w for w in works if not (venue(w) == 'Preprint' and key(w) in published)]


def affiliation(authorship):
    # One work-level choice, never multiply author fraction by affiliation count.
    known = [i for i in authorship['institutions'] if i.get('type')]
    frequencies = Counter(i['type'] for i in known)
    chosen = min(known, key=lambda i: (-frequencies[i['type']], i['type'], i.get('id') or '', i.get('country_code') or '')) if known else None
    kind = chosen['type'] if chosen else None
    country = chosen.get('country_code') if chosen else None
    if not country:
        countries = sorted(set(authorship['countries']) | {i['country_code'] for i in authorship['institutions'] if i.get('country_code')})
        country = countries[0] if countries else None
    return kind, country


def region(country):
    if country in ('US', 'CA'):
        return 'North America'
    if country in ASIA:
        return 'Asia'
    if country in EUROPE:
        return 'Europe'
    return 'Rest of world' if country in REST else UNKNOWN


def institution(kind):
    return {'education': 'Universities', 'company': 'Companies', 'government': 'National institutes', 'facility': 'National institutes'}.get(kind, 'Other institutions' if kind else UNKNOWN)


def sector(kind):
    return {'education': 'Academic', 'company': 'Industry'}.get(kind, 'Other institutions' if kind else 'No listed affiliation')


def author_profiles(works, histories):
    years = defaultdict(set)
    for w in works:
        for a in w['authorships']:
            if a['author_id']:
                years[a['author_id']].add(w['publication_year'])
    first = {}
    for aid, observed in years.items():
        historical = [r['year'] for r in histories[aid]['counts_by_year'] if r['works_count'] > 0] if aid in histories else []
        first[aid] = min(historical + list(observed))
    profiles = {}
    for y in range(BASE, LAST + 1):
        active = [a for a, ys in years.items() if any(y - 5 <= z <= y for z in ys)]
        cites = {a: sum(r['cited_by_count'] for r in histories[a]['counts_by_year'] if y-5 <= r['year'] < y) for a in active}
        for prior in (True, False):
            cohort = [a for a in active if (first[a] < y) == prior]
            values = sorted((cites[a] for a in cohort), reverse=True)
            # SQL RANK ties have gaps; percent_rank=(rank-1)/(partition_size-1).
            ranks = {}
            for index,value in enumerate(values):
                ranks.setdefault(value,Fraction(index,len(values)-1) if len(values)>1 else Fraction(0))
            for aid in cohort:
                age = y-first[aid]
                stage = UNKNOWN if not prior else ('Early career (1-5 years)' if age <= 5 else 'Mid career (6-15 years)' if age <= 15 else 'Late career (16+ years)')
                rank = ranks[cites[aid]]
                tier = UNKNOWN if not prior else ('Bottom 50%' if cites[aid] == 0 else 'Top 1%' if rank < Fraction(1,100) else 'Top 1-10%' if rank < Fraction(1,10) else 'Top 10-50%' if rank < Fraction(1,2) else 'Bottom 50%')
                profiles[aid,y] = stage, tier
    return profiles, years, first


def keys(obj, required, optional=()):
    require(isinstance(obj, dict) and set(required) <= set(obj) <= set(required) | set(optional), 'missing or unexpected contract fields')


def integer(value, minimum=0):
    require(type(value) is int and value >= minimum, 'invalid nonnegative integer')


def identifier(value, prefix, nullable=False):
    pattern = ('' if prefix == 'T' else 'https://openalex.org/')+prefix+r'[1-9][0-9]*'
    require((nullable and value is None) or (isinstance(value,str) and re.fullmatch(pattern,value)), 'malformed OpenAlex identifier')


def timestamp(value):
    require(isinstance(value,str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|\+00:00)',value), 'timestamp must be UTC ISO-8601')
    return datetime.fromisoformat(value.replace('Z','+00:00'))


def updated(value):
    require(isinstance(value,str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|\+00:00)?)?',value), 'invalid source updated_date')
    return datetime.fromisoformat(value[:26].rstrip('Z').split('+')[0])


def validate_inputs(works, histories, manifest):
    keys(manifest, ('schema_version','source_url','corpus','test_only','complete_years','observed_through','works','author_histories','coverage_policy'))
    require(manifest['schema_version']==1 and manifest['source_url']=='https://api.openalex.org' and manifest['corpus']=='core', 'unsupported source/corpus/schema')
    require(type(manifest['test_only']) is bool, 'test_only flag required')
    require(manifest['complete_years']==list(range(FIRST,LAST+1)), 'incomplete year coverage')
    require(date.fromisoformat(manifest['observed_through']) >= date(LAST,12,31), 'incomplete observation year')
    keys(manifest['works'], ('complete','acquired_at','full_bylines','slices'), ('sha256',))
    wh = manifest['works']
    acquired = timestamp(wh['acquired_at'])
    require(wh['complete'] is True and wh['full_bylines'] is True, 'works/full bylines incomplete')
    ah = manifest['author_histories']
    keys(ah, ('complete','acquired_at','expected_author_ids','completed_author_ids','publication_history_complete','citation_years_complete'), ('sha256',))
    author_acquired = timestamp(ah['acquired_at'])
    require(ah['complete'] is True and ah['publication_history_complete'] is True, 'author histories incomplete')
    require(set(range(BASE-5,LAST)) <= set(ah['citation_years_complete']), 'incomplete prior-five citation coverage')
    require(date.fromisoformat(manifest['observed_through']) <= min(acquired.date(),author_acquired.date()), 'observation date exceeds acquisition')
    keys(manifest['coverage_policy'], ('minimum_known_share',))
    policy = manifest['coverage_policy']['minimum_known_share']
    keys(policy, tuple(AUTHOR_DIMS.values()))
    for value in policy.values():
        require(type(value) in (int,float) and 0 < value <= 1, 'explicit positive known-share threshold required')
    expected_slices = {(t,y) for t in FULL_TOPICS+GATED_TOPICS for y in range(FIRST if t in AUTHOR_TOPICS else 2010,LAST+1)}
    actual_slices = {}
    for s in wh['slices']:
        keys(s, ('topic_id','year','row_count','complete'))
        k = s['topic_id'],s['year']
        require(k not in actual_slices and s['complete'] is True, 'duplicate/incomplete topic-year slice')
        integer(s['row_count'])
        actual_slices[k] = s['row_count']
    require(set(actual_slices)==expected_slices, 'missing or extra topic-year slice')
    row_counts = Counter()
    for w in works:
        keys(w, ('id','doi','title','abstract','publication_date','publication_year','type','primary_topic_id','primary_source_type','locations','authors_count','is_authors_truncated','updated_date','authorships'))
        identifier(w['id'],'W')
        identifier(w['primary_topic_id'],'T')
        require(w['type'] in TYPES, 'unsupported work type')
        pub = date.fromisoformat(w['publication_date'])
        require(pub.isoformat()==w['publication_date'] and pub.year==w['publication_year'] and pub<=date.fromisoformat(manifest['observed_through']), 'invalid publication date/year')
        require(updated(w['updated_date']).date()<=acquired.date(), 'work update exceeds acquisition')
        row_counts[w['primary_topic_id'],w['publication_year']] += 1
        for key in ('title','abstract','doi','primary_source_type'):
            require(w[key] is None or isinstance(w[key],str), 'invalid nullable text')
        require(isinstance(w['locations'],list), 'invalid locations')
        integer(w['authors_count'],0)
        require(w['is_authors_truncated'] is False and isinstance(w['authorships'],list) and len(w['authorships'])==w['authors_count'], 'truncated/incorrect full byline')
        orders = set()
        for a in w['authorships']:
            keys(a, ('author_id','author_position','author_order','institutions','countries'))
            identifier(a['author_id'],'A',nullable=True)
            integer(a['author_order'],1)
            require(a['author_order'] not in orders, 'duplicate byline order')
            orders.add(a['author_order'])
            require(a['author_position'] in ('first','middle','last',None), 'invalid author position')
            require(isinstance(a['institutions'],list) and isinstance(a['countries'],list), 'invalid affiliation lists')
            for c in a['countries']:
                require(isinstance(c,str) and re.fullmatch('[A-Z]{2}',c), 'invalid country code')
            for i in a['institutions']:
                keys(i, ('id','type','country_code'))
                identifier(i['id'],'I',nullable=True)
                require(i['type'] is None or i['type'] in ('education','company','government','facility','healthcare','nonprofit','archive','funder','other'), 'unknown institution type')
                require(i['country_code'] is None or re.fullmatch('[A-Z]{2}',i['country_code']), 'invalid institution country')
        require(orders==set(range(1,w['authors_count']+1)), 'incomplete byline order')
    require(all(row_counts[k]==v for k,v in actual_slices.items()) and set(row_counts)<=expected_slices, 'topic-year slice count mismatch')
    seen = set()
    for h in histories:
        keys(h, ('author_id','counts_by_year','updated_date'))
        identifier(h['author_id'],'A')
        require(h['author_id'] not in seen, 'duplicate author history')
        seen.add(h['author_id'])
        require(updated(h['updated_date']).date()<=author_acquired.date(), 'author update exceeds acquisition')
        require(isinstance(h['counts_by_year'],list), 'invalid annual history')
        years = set()
        for row in h['counts_by_year']:
            keys(row, ('year','works_count','cited_by_count'))
            integer(row['year'],1)
            integer(row['works_count'])
            integer(row['cited_by_count'])
            require(row['year'] not in years and row['year']<=author_acquired.year, 'duplicate/future author history year')
            years.add(row['year'])
    for field in ('expected_author_ids','completed_author_ids'):
        values = ah[field]
        require(isinstance(values,list) and len(values)==len(set(values)), 'duplicate/missing author batch identifiers')
        for aid in values:
            identifier(aid,'A')
        require(set(values)==seen, 'missing author batch/history')
    needed = {a['author_id'] for w in works if selected(w,author=True) and w['publication_year'] >= BASE-5 for a in w['authorships'] if a['author_id']}
    require(needed<=seen, 'missing selected author history')


def science_context(baseline, annual):
    keys(baseline, ('schema_version','source_url','corpus','types','acquired_at','observed_through','complete','method_id','rows'))
    require(baseline['schema_version']==1 and baseline['source_url']=='https://api.openalex.org' and baseline['corpus']=='core' and baseline['types']==list(TYPES), 'science baseline counting scope mismatch')
    require(baseline['method_id']=='openalex-primary-domain-work-count-v1' and baseline['complete'] is True, 'unsupported/incomplete science baseline')
    acquired = timestamp(baseline['acquired_at'])
    require(date(LAST,12,31)<=date.fromisoformat(baseline['observed_through'])<=acquired.date(), 'incomplete baseline year')
    domains = ('Life sciences','Social sciences','Physical sciences','Health sciences')
    values = {}
    for row in baseline['rows']:
        keys(row, ('group','year','papers'))
        key = row['group'],row['year']
        integer(row['papers'])
        require(key not in values, 'duplicate baseline count')
        values[key] = row['papers']
    # Retain legacy four-year snapshots while new acquisitions cover the full plot.
    groups = domains + ('All science',)
    full = {(g,y) for g in groups for y in range(2010,LAST+1)}
    legacy = {(g,y) for g in groups for y in range(BASE,LAST+1)}
    require(set(values) in (full, legacy), 'missing baseline coverage')
    require(all(values[g,BASE]>0 for g in groups), 'zero science baseline anchor')
    rows = []
    first = 2010 if set(values) == full else BASE
    for y in range(first,LAST+1):
        rates = [Fraction(values[g,y],values[g,BASE]) for g in domains]
        rows += [[str(y),'All research',round(annual[BASE]*Fraction(values['All science',y],values['All science',BASE]))],
                 [str(y),'Science baseline, low',round(annual[BASE]*min(rates))],
                 [str(y),'Science baseline, high',round(annual[BASE]*max(rates))]]
    return rows


def derive(works, author_histories, manifest, science_baseline=None, matched_baseline=None):
    """Return anonymous aggregates only. CLI additionally verifies exact file hashes."""
    validate_inputs(works,author_histories,manifest)
    histories = {h['author_id']: h for h in author_histories}
    merged = deduplicate(works)
    # Primary baselines count indexed work IDs; applying title collapse on one
    # side would silently destroy counting parity. Source versions of one ID
    # are already reconciled above. Distinct preprint/publication IDs remain.
    papers = [w for w in merged if selected(w)]
    author_works = [w for w in merged if selected(w, author=True)]
    profiles, author_years, first = author_profiles(author_works, histories)
    annual = Counter(w['publication_year'] for w in papers)
    tables = {'nt_yearly': table(('year','series','papers'), [[str(y),'Neurotech papers',annual[y]] for y in range(2010,LAST+1)])}
    paper_counts = defaultdict(Counter)
    for w in papers:
        for name, label in ((tuple(GROWTH_GROUPS)[0], technique(w)), (tuple(GROWTH_GROUPS)[1], 'About BCI' if BCI.search(text(w)) else 'Not about BCI'), (tuple(GROWTH_GROUPS)[2], venue(w))):
            paper_counts[name][label,w['publication_year']] += 1
    fractions = {dim: defaultdict(Counter) for dim in AUTHOR_DIMS.values()}
    ay_sectors = defaultdict(Counter)
    unknown_slots = 0
    duplicate_slots = 0
    for w in author_works:
        y = w['publication_year']
        quarter = (date.fromisoformat(w['publication_date']).month-1)//3+1
        work_sectors = defaultdict(Counter)
        identified = [a['author_id'] for a in w['authorships'] if a['author_id']]
        duplicate_slots += len(identified)-len(set(identified))
        if not w['authorships'] and y >= BASE:
            for dim in AUTHOR_DIMS.values():
                fractions[dim][y,quarter][UNKNOWN] += Fraction(1)
        for a in w['authorships']:
            aid = a['author_id']
            kind, country = affiliation(a)
            if aid:
                work_sectors[aid][sector(kind)] += 1
            else:
                unknown_slots += 1
            if y < BASE:
                continue
            stage, tier = profiles.get((aid,y), (UNKNOWN,UNKNOWN))
            for dim, label in zip(AUTHOR_DIMS.values(), (region(country), institution(kind), stage, tier)):
                fractions[dim][y,quarter][label] += Fraction(1,w['authors_count'])
        for aid, votes in work_sectors.items():
            known = {s:n for s,n in votes.items() if s != 'No listed affiliation'}
            chosen = min(known,key=lambda s:(-known[s],s)) if known else 'No listed affiliation'
            ay_sectors[aid,y][chosen] += 1
    coverage = []
    author_counts = defaultdict(Counter)
    for dim, quarters in fractions.items():
        for (y,q), parts in sorted(quarters.items()):
            total = sum(parts.values(), Fraction())
            unknown = parts[UNKNOWN]
            known = total-unknown
            scale = total/known if known else None
            minimum = manifest['coverage_policy']['minimum_known_share'][dim]
            require(known > 0 and known/total >= Fraction(str(minimum)), f'{dim}: quarterly known-share coverage below required threshold')
            coverage.append({'dimension':dim,'year':y,'quarter':q,'total':float(total),'known':float(known),'unknown':float(unknown),'knownShare':float(known/total),'scale':float(scale) if scale is not None else None})
            for label, value in sorted(parts.items()):
                if label != UNKNOWN and scale is not None:
                    author_counts[dim][label,y] += value*scale
    for name, groups in GROWTH_GROUPS.items():
        counts = author_counts[AUTHOR_DIMS[name]] if name in AUTHOR_DIMS else paper_counts[name]
        rows = []
        for group in groups:
            start, end = round(counts[group,BASE]), round(counts[group,LAST])
            rows.append([group,start,end,pct(end,start),None])
        tables[name] = table(('group','y2022','ylast','g','place'),rows)
    # Known yearly sector wins over missing; ties use lexical sector label order.
    assigned = {}
    for k, counts in ay_sectors.items():
        known = {s:n for s,n in counts.items() if s != 'No listed affiliation'}
        assigned[k] = min(known, key=lambda s:(-known[s],s)) if known else 'No listed affiliation'
    active, entrants, other, returns, moves = Counter(),Counter(),Counter(),Counter(),Counter()
    origins_unknown = Counter()
    for (aid,y), sec in assigned.items():
        active[sec,y] += 1
    for aid, ys in sorted(author_years.items()):
        fy, ly = min(ys),max(ys)
        origin,destination = assigned[aid,fy],assigned[aid,ly]
        # Only the displayed entrant/three-year-return cohorts need origin histories.
        if fy in (LAST, LAST-3):
            historical = [r['year'] for r in histories[aid]['counts_by_year'] if r['works_count']>0]
            entrants[origin,fy] += 1
            if not historical:
                origins_unknown[origin,fy] += 1
            elif min(historical) < fy:
                other[origin,fy] += 1
            if fy <= LAST-3 and any(fy<y<=fy+3 for y in ys):
                returns[origin,fy] += 1
        if fy>=2016 and ly>fy and origin!=destination:
            moves[origin,destination] += 1
    rows = []
    for sec in SECTORS:
        start,end = active[sec,BASE],active[sec,LAST]
        n = entrants[sec,LAST]
        other_share = None if origins_unknown[sec,LAST] else share(other[sec,LAST],n)
        rows.append([sec,start,end,pct(end,start),n,other_share,share(returns[sec,LAST-3],entrants[sec,LAST-3])])
    tables['nt_talent_table'] = table(('group','a2022','alast','growth','new','other','back'),rows)
    tables['nt_talent_moves'] = table(('from','to0','to1','to2','to3'),[[s]+[None if s==t else moves[s,t] for t in SECTORS] for s in SECTORS])
    result = {'schemaVersion':2,'source':{'url':'https://api.openalex.org','capturedAt':max((manifest['works']['acquired_at'],manifest['author_histories']['acquired_at']),key=timestamp),
               'paperAsOf':manifest['works']['acquired_at'][:10], 'authorAsOf':manifest['author_histories']['acquired_at'][:10],
               'observedThrough':manifest['observed_through'],'baselineYear':BASE,'paperEndYear':LAST,'authorEndYear':LAST,
               'methodologyVersion':METHOD_ID,'methodSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               'sourceHash':digest({'works':sorted(works,key=canonical),'author_histories':sorted(author_histories,key=canonical),'manifest':manifest}),
               'testOnly':manifest['test_only'],'corpus':'core'},'tables':tables,
               'audit':{'paperCohort':{'topics':list(FULL_TOPICS+GATED_TOPICS),'firstYear':2010,'lastYear':LAST,'works':len(papers),'counting':'one-openalex-work-id'},
                        'authorCohort':{'topics':list(AUTHOR_TOPICS),'firstYear':FIRST,'lastYear':LAST,'works':len(author_works),'authors':len(author_years),'unidentifiedBylineSlots':unknown_slots,'duplicateIdentifiedBylineSlots':duplicate_slots,'worksWithoutBylines':sum(not w['authorships'] for w in author_works)},
                        'coverage':coverage,'baselineStatus':'not-supplied','matchedBaselineStatus':'not-supplied'}}
    result['audit']['quarterlyFractionalOutput'] = [
        {'dimension':dim,'year':y,'quarter':q,'group':label,'rawFraction':[str(value.numerator),str(value.denominator)],
         'scaledFraction':None if label==UNKNOWN else [str(scaled.numerator),str(scaled.denominator)]}
        for dim, quarters in fractions.items() for (y,q), parts in sorted(quarters.items())
        for label,value in sorted(parts.items())
        for scaled in [value*sum(parts.values(),Fraction())/(sum(parts.values(),Fraction())-parts[UNKNOWN])]]
    result['source']['worksMaxUpdatedDate'] = max((w['updated_date'] for w in works),key=updated,default=None)
    result['source']['authorsMaxUpdatedDate'] = max((h['updated_date'] for h in author_histories),key=updated,default=None)
    result['source']['inputByteHashes'] = {name:manifest[name].get('sha256') for name in ('works','author_histories')}
    result['source']['coveragePolicy'] = manifest['coverage_policy']
    if science_baseline is not None:
        tables['nt_yearly']['rows'] += science_context(science_baseline,annual)
        result['audit']['baselineStatus'] = 'primary-four-domain-context'
        result['source']['scienceBaseline'] = {'methodId':science_baseline['method_id'],'acquiredAt':science_baseline['acquired_at'],'sourceHash':digest(science_baseline),'url':science_baseline['source_url']}
    if matched_baseline is not None:
        apply_matched_baseline(result,matched_baseline)
    return result


def apply_matched_baseline(result, baseline):
    raise ValueError('Direct all-group matching is unsupported; use the independently reviewed matchedGrowth adapter')


def parse_json(text):
    def unique_pairs(pairs):
        result = {}
        for k,v in pairs:
            require(k not in result, 'duplicate JSON object key')
            result[k] = v
        return result
    return json.loads(text, object_pairs_hook=unique_pairs,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError('nonfinite JSON number')))


def read_json(path):
    return parse_json(path.read_text(encoding='utf-8'))


def read_jsonl(path):
    rows = []
    for n,line in enumerate(path.read_text(encoding='utf-8').splitlines(),1):
        require(bool(line.strip()), f'blank JSONL row {n}')
        value = parse_json(line)
        require(isinstance(value,dict), f'JSONL row {n} must be an object')
        rows.append(value)
    return rows


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--works',type=Path,required=True)
    parser.add_argument('--author-histories',type=Path,required=True)
    parser.add_argument('--manifest',type=Path,required=True)
    parser.add_argument('--science-baseline',type=Path)
    parser.add_argument('--matched-baseline',type=Path)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--allow-test-fixture',action='store_true')
    args = parser.parse_args(argv)
    try:
        manifest = read_json(args.manifest)
        require(not manifest.get('test_only') or args.allow_test_fixture, 'synthetic data requires --allow-test-fixture')
        for name,path in (('works',args.works),('author_histories',args.author_histories)):
            actual = hashlib.sha256(path.read_bytes()).hexdigest()
            require(manifest.get(name,{}).get('sha256')==actual, f'{name} input byte hash mismatch or missing')
        result = derive(read_jsonl(args.works),read_jsonl(args.author_histories),manifest,
                        read_json(args.science_baseline) if args.science_baseline else None,
                        read_json(args.matched_baseline) if args.matched_baseline else None)
        payload = (json.dumps(result,sort_keys=True,indent=2,ensure_ascii=False,allow_nan=False)+'\n').encode()
        # Do not touch the last-known-good target until all validation succeeds.
        require(args.out.resolve() not in {p.resolve() for p in (args.works,args.author_histories,args.manifest,args.science_baseline,args.matched_baseline) if p}, 'output must not overwrite a source file')
        args.out.parent.mkdir(parents=True,exist_ok=True)
        temp = args.out.with_name(args.out.name+'.tmp')
        temp.write_bytes(payload)
        temp.replace(args.out)
        print(canonical({'methodId':METHOD_ID,'testOnly':manifest['test_only'],'tables':len(result['tables']),
                         'paperWorks':result['audit']['paperCohort']['works'],'researchers':result['audit']['authorCohort']['authors'],
                         'sha256':hashlib.sha256(payload).hexdigest()}))
        return 0
    except (ValueError,KeyError,TypeError,OSError) as exc:
        print(f'Primary derivation rejected: {exc}',file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
