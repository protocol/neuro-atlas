#!/usr/bin/env python3
"""Offline independent matched counts. No Artio dependency, network, or credentials.

The injected caller is owned by acquisition; see docs/publications/matched-baselines.md.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlencode, urlsplit

METHOD = 'atlas-matched-indexed-works-v1'
YEARS = ('2022', '2025')
TYPES = ('article', 'review', 'conference-paper', 'book-chapter', 'preprint')
BASE = 'publication_year:2022|2025,type:' + '|'.join(TYPES)
P2 = ',primary_topic.id:T10429|T11601'
COUNTING = {
    'countUnit': 'OpenAlex work ID', 'identity': 'one indexed work ID; no title collapse',
    'corpus': 'OpenAlex default core (no expansion)', 'years': list(YEARS),
    'types': list(TYPES), 'affiliations': 'whole-work involvement; nonexclusive groups',
    'union': 'government|facility OR query; never bucket sum',
}
FILES = {
    'asia-d': '02_asia_2022_2025', 'europe-d': '03_europe_2022_2025',
    'us-canada-d': '04_us_ca_2022_2025', 'venue-d': '06_exact_venue_cells',
    'institutions-d': '07_institution_types', 'government-facility-d': '10_government_facility_union',
    'asia-n': '11_nt2_asia', 'europe-n': '12_nt2_europe', 'us-canada-n': '13_nt2_usca',
    'institutions-n': '14_nt2_institution_types', 'government-facility-n': '15_nt2_government_facility',
}
GROUPS = (
    ('invasive', 'Invasive', 'method'), ('high', 'Ultrasound, TMS and MEG', 'method'),
    ('eeg', 'EEG', 'method'), ('no-technique', 'No technique named', 'method'),
    ('bci', 'About BCI', 'method'), ('not-bci', 'Not about BCI', 'method'),
    ('journal', 'Journal', 'venue'), ('conference', 'Conference', 'venue'), ('preprint', 'Preprint', 'venue'),
    ('asia', 'Asia', 'region'), ('us-canada', 'US and Canada', 'region'), ('europe', 'Europe', 'region'),
    ('education', 'Universities', 'institution'), ('company', 'Companies', 'institution'),
    ('government-facility', 'Government agencies and research facilities', 'institution'),
    ('early', 'Early career (1-5 years)', 'author'), ('mid', 'Mid career (6-15 years)', 'author'),
    ('late', 'Late career (16+ years)', 'author'), ('top-1', 'Top 1%', 'author'),
    ('top-1-10', 'Top 1-10%', 'author'), ('top-10-50', 'Top 10-50%', 'author'),
)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def acquisition_plan():
    """Fixed reviewed queries, not arbitrary remotely supplied growth metrics."""
    plan = []
    for qid, filename in FILES.items():
        group = qid.rsplit('-', 1)[0]
        suffix = P2 if qid.endswith('-n') else ''
        group_by = 'publication_year'
        if group == 'institutions':
            group_by += ',authorships.institutions.type:include_unknown'
        elif group == 'venue':
            group_by += ',type,primary_location.source.type:include_unknown'
        elif group in ('asia', 'europe'):
            suffix += ',authorships.institutions.continent:' + group
        elif group == 'us-canada':
            suffix += ',authorships.countries:us|ca'
        elif group == 'government-facility':
            suffix += ',authorships.institutions.type:government|facility'
        plan.append({'id': qid, 'path': '/works', 'filename': filename + '.json',
                     'params': {'filter': BASE + suffix, 'group_by': group_by, 'per_page': 100},
                     'measurement': dict(COUNTING)})
    return plan


def acquire(request):
    """Caller returns (body, selected_quota_headers); it must raise on HTTP failure.

    This function never opens a socket, reads an environment variable, or handles auth.
    """
    receipts = {}
    for q in acquisition_plan():
        body, headers = request(q['path'], dict(q['params']))
        receipt = {'http_status': 200, 'request_parameters': dict(q['params']),
                   'url': 'https://api.openalex.org' + q['path'] + '?' + urlencode(q['params']),
                   'retrieved_at': datetime.now(timezone.utc).isoformat(), 'response': body,
                   'response_headers': {k: v for k, v in headers.items()
                                        if k.lower().startswith('x-ratelimit-') or k.lower() == 'date'},
                   'measurement': dict(COUNTING)}
        _validated(receipt, q)
        receipts[q['id']] = receipt
    return receipts


def load_receipts(path):
    """Accept a receipt directory or combined {'receipts': {query-id: envelope}}."""
    path = Path(path)
    if path.is_dir():
        return {q['id']: json.loads((path / q['filename']).read_text()) for q in acquisition_plan()}
    data = json.loads(path.read_text())
    raw = data['receipts']
    return {qid: raw[qid] if qid in raw else raw[filename] for qid, filename in FILES.items()}


def _count(value):
    require(type(value) is int and value >= 0, 'counts must be nonnegative integer indexed works')
    return value


def _key(cell):
    return unquote(str(cell['key']).rsplit('/', 1)[-1])


def _cells(cells, expected=None):
    require(isinstance(cells, list) and 0 < len(cells) < 100, 'missing or possibly truncated group cells')
    found = {}
    for cell in cells:
        key = _key(cell)
        require(key not in found, 'duplicate group cell: ' + key)
        _count(cell['count'])
        found[key] = cell
    if expected is not None:
        require(set(found) == set(expected), 'incomplete or unexpected group cells')
    return found


def _validated(receipt, query):
    require(receipt['http_status'] == 200, 'receipt HTTP status must be 200')
    require(receipt['request_parameters'] == query['params'], 'query identity/years/types/union mismatch: ' + query['id'])
    parts = urlsplit(receipt['url'])
    require(parts.scheme == 'https' and parts.netloc == 'api.openalex.org' and parts.path == '/works', 'wrong primary source URL')
    require(parse_qs(parts.query) == {k: [str(v)] for k, v in query['params'].items()}, 'URL parameters disagree with receipt')
    require(datetime.fromisoformat(receipt['retrieved_at']).tzinfo is not None, 'retrieval time requires timezone')
    if 'measurement' in receipt:
        require(receipt['measurement'] == COUNTING, 'count unit/identity contract mismatch')
    body = receipt['response']
    years = _cells(body['group_by'], YEARS)
    require(body['meta']['groups_count'] == 2, 'top-level group coverage mismatch')
    require(body['meta']['per_page'] == 100, 'unexpected group page size')
    require(sum(c['count'] for c in years.values()) == _count(body['meta']['count']), 'year counts do not reconcile to total')
    return years


def venue(kind, source):
    if kind == 'preprint' or source == 'repository':
        return 'Preprint'
    if kind == 'conference-paper' or source == 'conference':
        return 'Conference'
    if kind == 'book-chapter' or source in ('book series', 'ebook platform'):
        return 'Book chapter'
    return 'Journal'  # Exact legacy taxonomy: unknown/other are deliberate fallback.


def venue_counts(years):
    result = {label: {y: 0 for y in YEARS} for label in ('Journal', 'Conference', 'Preprint', 'Book chapter')}
    for y, parent in years.items():
        types = _cells(parent['groups'], TYPES)
        require(sum(c['count'] for c in types.values()) == parent['count'], 'venue type hierarchy sum mismatch')
        for kind, cell in types.items():
            sources = _cells(cell['groups'])
            require(sum(s['count'] for s in sources.values()) == cell['count'], 'venue source hierarchy sum mismatch')
            for source, leaf in sources.items():
                require('groups' not in leaf, 'unexpected fourth venue level')
                result[venue(kind, source)][y] += leaf['count']
        require(sum(result[k][y] for k in result) == parent['count'], 'venue year reconciliation failed')
    return result


def metrics(n, d):
    """Ratios use exact integer counts/Fraction internally; no legacy annual rounding."""
    def growth(counts):
        if counts is None:
            return None
        require(set(counts) == set(YEARS), 'count years mismatch')
        values = {y: Fraction(str(counts[y])) for y in YEARS}
        require(all(v >= 0 for v in values.values()), 'negative counts')
        return float((values['2025'] / values['2022'] - 1) * 100) if values['2022'] else None
    ng, dg = growth(n), growth(d)
    shares = None
    relative = None
    if n is not None and d is not None:
        require(set(n) == set(d) == set(YEARS), 'count years mismatch')
        for y in YEARS:
            _count(n[y]); _count(d[y])
            require(n[y] <= d[y], 'numerator must be subset of reference')
        shares = {y: float(Fraction(n[y], d[y])) if d[y] else None for y in YEARS}
        if n['2022'] and d['2022'] and d['2025']:
            relative = float((Fraction(n['2025'] * d['2022'], d['2025'] * n['2022']) - 1) * 100)
    return {'neuroGrowthPct': ng, 'referenceGrowthPct': dg, 'shares': shares,
            'relativeShareGrowthPct': relative,
            'growthGapPercentagePoints': ng - dg if ng is not None and dg is not None else None}


def owned_venue_counts(data):
    require(data['measurement'] == COUNTING, 'venue count unit/identity/years/types mismatch')
    require(data['selection'] == 'NT10-v1', 'venue requires independently selected NT10')
    require(sorted(data['completeYears']) == list(YEARS), 'venue numerator incomplete years')
    full = {'T10429', 'T11601', 'T10614'}
    gated = {'T10958', 'T12015', 'T11993', 'T10094', 'T10581', 'T10241', 'T10919'}
    strong = re.compile(r'(?i:intracortical|micro-?electrode arrays?|utah arrays?|electrocorticogra|stereo-?EEG|stereoelectroencephalogra|intracranial (?:EEG|electro|record)|neural implant|implantable (?:neural|brain|electrode|neuro|cortical)|stentrode|endovascular (?:BCI|brain|electrode|interface|neural)|deep brain recording|focused ultrasound|functional ultrasound|transcranial ultrasound|transcranial magnetic|magnetoencephalogra|brain[- ]?(?:computer|machine) interface)|\bECoG\b|\biEEG\b|\bsEEG\b|\b(?:r|d|i|p)?TMS\b|\bMEG\b|\bOPMs?\b|\bBCIs?\b')
    neural = re.compile(r'(?i:brain|neur|cortex|cortical|cerebr|transcranial|thalam|epilep|cognit)')
    out = {label: {y: 0 for y in YEARS} for label in ('Journal', 'Conference', 'Preprint', 'Book chapter')}
    seen = set()
    for w in data['works']:
        require(re.fullmatch(r'https://openalex.org/W[0-9]+', w['id']) is not None, 'invalid work identity')
        require(w['id'] not in seen, 'duplicate work identity in venue numerator')
        seen.add(w['id'])
        year, kind, topic = str(w['publication_year']), w['type'], w['primary_topic_id']
        require(year in YEARS and kind in TYPES, 'venue numerator years/types mismatch')
        text = (w['title'] or '') + ' ' + (w['abstract'] or '')
        require(topic in full or (topic in gated and strong.search(text) and neural.search(text)), 'work fails NT10 gate')
        out[venue(kind, w['primary_source_type'])][year] += 1
    return out


def derive(receipts, venue_numerator=None, numerators=None):
    """Pure receipt validation + complete inventory; unknown numerators stay null."""
    checked = {q['id']: _validated(receipts[q['id']], q) for q in acquisition_plan()}
    for side in ('n', 'd'):
        for y in YEARS:
            parent = checked['institutions-' + side][y]
            buckets = _cells(parent['groups'])
            require('government' in buckets and 'facility' in buckets, 'missing union constituent')
            g, f = buckets['government']['count'], buckets['facility']['count']
            union = checked['government-facility-' + side][y]['count']
            require(max(g, f) <= union <= min(g + f, parent['count']), 'government/facility union outside bucket bounds')
    numerators = numerators or {}
    require(set(numerators) <= {g[0] for g in GROUPS if g[2] in ('method', 'author')}, 'supplemental numerator may not replace matched counts')
    denominators = venue_counts(checked['venue-d'])
    venue_n = owned_venue_counts(venue_numerator) if venue_numerator is not None else None
    rows = []
    for gid, label, dimension in GROUPS:
        n = d = None
        status = 'unavailable'
        method = METHOD
        if dimension in ('region', 'institution'):
            qgroup = 'institutions' if gid in ('education', 'company') else gid
            def values(side):
                cells = checked[qgroup + '-' + side]
                if qgroup == 'institutions':
                    # Institution buckets overlap. Do not sum them or infer unknown coverage.
                    out = {}
                    for y, cell in cells.items():
                        buckets = _cells(cell['groups'])
                        require(gid in buckets, 'required institution bucket missing')
                        require(all(b['count'] <= cell['count'] for b in buckets.values()), 'institution bucket exceeds year population')
                        out[y] = buckets[gid]['count']
                    return out
                return {y: cells[y]['count'] for y in YEARS}
            n, d = values('n'), values('d')
            status = 'matched'
            universe = f'All five-type core indexed works with {label} affiliation involvement; OR union for government/facility'
            reason = 'Independent P2 and all-research API counts under identical whole-work rules; not legacy author-fractional growth.'
            evidence = [qgroup + '-n', qgroup + '-d']
        elif dimension == 'venue':
            d = denominators[label]
            universe = f'All five-type core indexed works classified {label} by preprint > conference > book chapter > journal fallback'
            reason = 'Exact venue denominator verified; owned complete NT10 raw-ID numerator not yet supplied. No title-collapse or bioRxiv-only numerator permitted.'
            evidence = ['venue-d']
            if venue_n is not None:
                n = venue_n[label]
                evidence.append('venue-n')
                status = 'matched'
                reason = 'Complete independently selected NT10 raw indexed works and exhaustive all-science venue cells under identical venue/identity rules.'
        elif dimension == 'method':
            universe = 'Selected: all-field core five-type indexed works under the identical local title/abstract classifier and priority rules'
            reason = 'Reference selected; complete identically classified all-field acquisition awaits a separately scoped bulk or multi-day acquisition. No comparable denominator has been acquired.'
            evidence = []
        else:
            method = 'unestablished-author-fractional-matched-cohort'
            universe = 'Selected: all-field five-type fractional output of the same historically P2-active author cohort, identical year-specific career/citation-rank bins and coverage policy'
            reason = 'Reference selected; complete type-filtered full-byline all-field cohort acquisition and count-only sizing remain pending. Author histories alone cannot provide this fractional denominator.'
            evidence = []
        row = {'id': gid, 'label': label, 'dimension': dimension, 'baselineStatus': status,
               'reason': reason, 'countingMethod': method, 'denominatorUniverse': universe,
               'numeratorUniverse': 'P2' if dimension in ('region', 'institution') else 'NT10' if dimension in ('method', 'venue') else 'P2 author-fractional',
               'numeratorCounts': n, 'referenceCounts': d, 'evidence': evidence,
               'countUnit': 'OpenAlex work ID' if dimension != 'author' else 'author-fractional works'}
        if gid in numerators:
            supplied = numerators[gid]
            require(supplied['countUnit'] == row['countUnit'], 'supplemental count unit mismatch')
            n = supplied['counts']
            require(set(n) == set(YEARS), 'supplemental numerator years mismatch')
            for value in n.values():
                require(type(value) in (int, float, str), 'invalid supplemental count')
                value = Fraction(str(value))
                require(value >= 0, 'negative supplemental count')
                require(dimension == 'author' or value.denominator == 1, 'method counts must be whole indexed works')
            require(supplied['countingMethod'] and supplied['numeratorUniverse'] and supplied['evidence'], 'supplemental provenance missing')
            row.update(numeratorCounts=n, countingMethod=supplied['countingMethod'],
                       numeratorUniverse=supplied['numeratorUniverse'], evidence=supplied['evidence'])
        row.update(metrics(n, d))
        rows.append(row)
    evidence = {q['id']: {'retrievedAt': receipts[q['id']]['retrieved_at'], 'url': receipts[q['id']]['url'],
                            'responseSha256': hashlib.sha256(json.dumps(receipts[q['id']]['response'], sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
                            'sourceSha256': receipts[q['id']].get('sourceSha256')} for q in acquisition_plan()}
    if venue_numerator is not None:
        evidence['venue-n'] = {'workCount': len(venue_numerator['works']),
                               'selection': venue_numerator['selection'],
                               'completeYears': list(venue_numerator['completeYears']),
                               'normalizedInputSha256': hashlib.sha256(json.dumps(venue_numerator, sort_keys=True, separators=(',', ':')).encode()).hexdigest()}
    return {'schemaVersion': 1, 'method': METHOD, 'measurement': COUNTING, 'rows': rows,
            'venueDenominatorDetail': denominators, 'evidence': evidence,
            'completeMatchedInventory': False}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', action='store_true')
    parser.add_argument('--input', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args(argv)
    if args.plan:
        data = {'method': METHOD, 'queries': acquisition_plan()}
    else:
        parser.error('--input is required unless --plan') if args.input is None else None
        combined = {} if args.input.is_dir() else json.loads(args.input.read_text())
        data = derive(load_receipts(args.input), venue_numerator=combined.get('venueNumerator'),
                      numerators=combined.get('numerators'))
    text = json.dumps(data, indent=2, allow_nan=False) + '\n'
    if args.output:
        args.output.write_text(text)
    else:
        print(text, end='')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
