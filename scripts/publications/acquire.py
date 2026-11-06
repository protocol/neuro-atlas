#!/usr/bin/env python3
"""Independent primary OpenAlex acquisition; private staging only, no publication.

Commands: method (offline), preflight (quota only, no files), size (counts only,
no files), acquire (resumable private run), replay (offline verified receipts).
The method is a broad source inventory: downstream versioned text gates/dedup
are NOT applied here. Full bylines and source text survive for independent derivation.
"""
from __future__ import annotations

import argparse
import contextlib
import datetime as dt
from decimal import Decimal
import fcntl
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sqlite3
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from collections import deque
from typing import Any, NoReturn

sys.path.insert(0, str(Path(__file__).resolve().parent))
from transport import CurlTransport, TransportError

METHOD = {
    'schema': 'atlas.openalex-primary.v1', 'http_method': 'GET',
    'api_origin': 'https://api.openalex.org', 'corpus': 'core',
    'end_date': '2025-12-31', 'complete_year': 2025,
    'topics': ['T10429','T11601','T10614','T10958','T12015','T11993','T10094','T10581','T10241','T10919'],
    'full_topics': ['T10429','T11601','T10614'],
    'gated_topics': ['T10958','T12015','T11993','T10094','T10581','T10241','T10919'],
    'author_history_topics': ['T10429','T11601'],
    'author_start_year': 2000, 'paper_start_year': 2010,
    'author_history_first_year': 2017,  # Earliest active ranking window: baseline2022 minus5.
    'types': ['article','preprint','review','book-chapter','conference-paper'],
    'per_page': 100, 'sort': 'publication_date:asc',
    'selection': 'primary_topic.id exact; date-inclusive per topic-year; five types; core explicit',
    'gate_application': 'downstream only; retain all candidate text for strong-modality AND neural regex',
    'history_fields': ['id','counts_by_year','updated_date'],
    'work_fields': ['id','doi','title','abstract_inverted_index','publication_date','publication_year','type','primary_topic','primary_location','locations','authorships','updated_date'],
    'byline_policy': 'list maximum 100; singleton ceiling 5000; reject unresolved truncation and saturated 5000 count because larger bylines also cap there',
}
LOCK = Path('/opt/data/automations/openalex-acquisition.lock')


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()


def utcnow() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def slices() -> list[tuple[str, int]]:
    return [(topic, year) for topic in METHOD['topics']
            for year in range(METHOD['author_start_year'] if topic in METHOD['author_history_topics'] else METHOD['paper_start_year'], METHOD['complete_year'] + 1)]


def work_params(topic: str, year: int, cursor: str = '*', *, count_only: bool = False) -> dict[str, Any]:
    return {'filter': f'primary_topic.id:{topic},from_publication_date:{year}-01-01,to_publication_date:{year}-12-31,type:' + '|'.join(METHOD['types']),
            'corpus': METHOD['corpus'], 'select': 'id' if count_only else ','.join(METHOD['work_fields']),
            'per_page': 1 if count_only else 100, 'cursor': cursor, 'sort': METHOD['sort']}


def quota_info(transport: Any) -> dict[str, Any]:
    # Intentionally discard api_key (even masked) and all non-allowlisted fields.
    raw = json.loads(transport.get('/rate-limit', {}))['rate_limit']
    fields = ('credits_limit','credits_used','credits_remaining','daily_remaining_usd')
    value = {key: raw[key] for key in fields}
    if 'resets_at' in raw:
        value['resets_at'] = raw['resets_at']
    if raw['credit_costs']['list'] != 1 or raw['credit_costs']['singleton'] != 0:
        raise ValueError('Unexpected endpoint pricing; acquisition stopped')
    for key in fields[:3]:
        if type(value[key]) is not int or value[key] < 0:
            raise ValueError('Invalid quota record')
    if value['credits_limit'] > 10000:
        # Only the free-dollar daily envelope is authorized, never a larger paid tier.
        value['credits_remaining'] = min(value['credits_remaining'], max(0, 10000 - value['credits_used']))
    free_by_dollars = int(Decimal(str(value['daily_remaining_usd'])) / Decimal('0.0001'))
    value['credits_remaining'] = min(value['credits_remaining'], free_by_dollars)
    return value


def preflight(transport: Any, cap: int = 7000, reserve: int = 2727) -> dict[str, Any]:
    if not 0 < cap <= 7000 or not 0 <= reserve <= 10000:
        raise ValueError('Free credit cap must be 1..7000; reserve must be nonnegative')
    quota = quota_info(transport)
    return {'status': 'preflight_only', 'quota': quota, 'spend_cap_credits': cap,
            'reserved_credits': reserve, 'available_credits': max(0, min(cap, quota['credits_remaining'] - reserve)),
            'required_slices': [{'topic': t, 'year': y} for t, y in slices()],
            'method_sha256': hashlib.sha256(canonical(METHOD)).hexdigest()}


def entity_id(value: Any, kind: str) -> str:
    if isinstance(value, str):
        match = re.fullmatch(r'(?:https://openalex.org/)?(' + kind + r'[0-9]+)', value)
        if match:
            return match.group(1)
    raise ValueError('Invalid OpenAlex entity identifier')


def normalize_work(work: dict[str, Any]) -> dict[str, Any]:
    authorships = work['authorships']
    count = work.get('authors_count',len(authorships))
    if type(count) is not int or count < 0 or count >= 5000 or count != len(authorships) or work.get('is_authors_truncated', False):
        raise ValueError('Unresolved/truncated work byline')
    words: dict[int, str] = {}
    for word, positions in (work.get('abstract_inverted_index') or {}).items():
        for position in positions:
            if type(position) is not int or position < 0 or position in words:
                raise ValueError('Invalid abstract positions')
            words[position] = word
    normalized_authors = []
    for order, row in enumerate(authorships, 1):
        aid = (row.get('author') or {}).get('id')
        aid = entity_id(aid,'A') if aid else None
        # Provider-documented NULL/deleted identities are not researchers.
        if aid in ('A9999999999','A5317838346'):
            aid = None
        normalized_authors.append({'author_id': aid,
            'author_position': row.get('author_position'), 'author_order': order,
            'institutions': [{'id': entity_id(i['id'], 'I') if i.get('id') else None,
                              'type': i.get('type'), 'country_code': i.get('country_code')}
                             for i in row.get('institutions', [])], 'countries': row.get('countries', [])})
    def source_type(location: Any) -> Any:
        return ((location or {}).get('source') or {}).get('type')
    return {'id': entity_id(work['id'], 'W'), 'doi': work.get('doi'), 'title': work.get('title'),
            'abstract': ' '.join(words[i] for i in sorted(words)) if words else None,
            'publication_date': work['publication_date'], 'publication_year': work['publication_year'],
            'type': work['type'], 'primary_topic_id': entity_id(work['primary_topic']['id'], 'T'),
            'primary_source_type': source_type(work.get('primary_location')),
            'locations': [{'source_type': source_type(loc)} for loc in work.get('locations', [])],
            'authorships': normalized_authors, 'authors_count': count,
            'is_authors_truncated': False, 'updated_date': work.get('updated_date')}


def sha_file(path: Path) -> str:
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


class SafeParser(argparse.ArgumentParser):
    def error(self, message: str) -> NoReturn:
        # argparse normally echoes arbitrary arguments, potentially a pasted token.
        self.print_usage(sys.stderr)
        self.exit(2, 'Invalid arguments; credential values are never accepted. Use --help.\n')


def atomic_json(path: Path, value: Any) -> None:
    temporary = path.with_suffix(path.suffix + '.tmp')
    with temporary.open('wb') as handle:
        handle.write(canonical(value))
        handle.flush()
        os.fsync(handle.fileno())
    temporary.replace(path)


class BudgetStop(RuntimeError):
    pass


class Budget:
    """Persist pessimistic charges BEFORE every attempt, including failed attempts.

    No implicit retries. Refresh live free quota every 25 attempts and on resume.
    Day-bound ledger resets only with a different actual UTC calendar day.
    """
    def __init__(self, transport: Any, path: Path, cap: int = 7000, reserve: int = 2727):
        self.transport, self.path, self.cap, self.reserve = transport, path, cap, reserve
        self.quota = preflight(transport, cap, reserve)['quota']
        self.since_probe = 0
        self._lock = threading.Lock()
        self.available = self.quota['credits_remaining']
        self.day = dt.datetime.now(dt.timezone.utc).date().isoformat()
        self.state = json.loads(path.read_bytes()) if path.exists() else {}
        if self.state.get('utc_day') != self.day:
            if self.state:
                archive = path.with_name('budget.' + self.state['utc_day'] + '.json')
                if not archive.exists():
                    atomic_json(archive,self.state)
            self.state = {'utc_day': self.day, 'attempted_credits': 0, 'attempted_calls': 0}
        self.available = min(self.available,self.state.get('free_credits_estimate',self.available))

    def charge(self, path: str) -> None:
        with self._lock:
            self._charge(path)

    def _charge(self, path: str) -> None:
        day = dt.datetime.now(dt.timezone.utc).date().isoformat()
        if day != self.day:
            raise BudgetStop('UTC reset reached; resume explicitly to preserve acquisition interval')
        observed = getattr(self.transport,'free_credits_remaining',None)
        if observed is not None:
            self.available = min(self.available,observed)
        cost = 0 if re.fullmatch(r'/works/W[0-9]+', path) else 1
        if self.since_probe >= 25:
            self.quota = quota_info(self.transport)
            self.available = min(self.available,self.quota['credits_remaining'])
            self.since_probe = 0
        if self.state['attempted_credits'] + cost > self.cap or self.available - cost < self.reserve:
            raise BudgetStop('Free budget checkpoint reached; resume after reset')
        self.available -= cost
        self.state['free_credits_estimate'] = self.available
        self.state['attempted_credits'] += cost
        self.state['attempted_calls'] += 1
        self.state['last_attempt_at'] = utcnow()
        atomic_json(self.path, self.state)
        self.since_probe += cost


class Receipts:
    """Immutable public API response bodies, private gzip storage, exact request replay."""
    def __init__(self, root: Path, transport: Any, budget: Any = None, offline: bool = False):
        self.root, self.transport, self.budget, self.offline = root, transport, budget, offline
        self.raw = root / 'raw'
        if not offline:
            self.raw.mkdir(parents=True, exist_ok=True, mode=0o700)

    def get(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        from transport import curl_command
        curl_command(path, params)  # validate even on replay
        request = {'method':'GET', 'origin':'https://api.openalex.org', 'path':path, 'params':params}
        key = hashlib.sha256(canonical(request)).hexdigest()
        receipt_path = self.raw / (key + '.json')
        if receipt_path.exists():
            receipt = json.loads(receipt_path.read_bytes())
            if receipt['request'] != request or receipt['body_file'] != key + '.json.gz':
                raise ValueError('Receipt request mismatch')
            try:
                body = gzip.decompress((self.raw / receipt['body_file']).read_bytes())
            except (OSError, EOFError):
                raise ValueError('Corrupt raw receipt body') from None
            if hashlib.sha256(body).hexdigest() != receipt['body_sha256']:
                raise ValueError('Raw receipt checksum mismatch')
        else:
            if self.offline or self.transport is None:
                raise ValueError('Required raw receipt missing; no network in replay')
            if self.budget:
                self.budget.charge(path)
            started = utcnow()
            body = self.transport.get(path, params)
            ended = utcnow()
            receipt = {'request':request, 'http_status':200, 'started_at':started, 'completed_at':ended,
                       'body_sha256':hashlib.sha256(body).hexdigest(), 'body_file':key + '.json.gz',
                       'quota':self.transport.response_metadata() if hasattr(self.transport,'response_metadata') else {}}
            body_path = self.raw / receipt['body_file']
            temporary = body_path.with_suffix('.tmp')
            with temporary.open('wb') as handle:
                handle.write(gzip.compress(body, mtime=0))
                handle.flush()
                os.fsync(handle.fileno())
            temporary.replace(body_path)
            atomic_json(receipt_path, receipt)
        value = json.loads(body)
        if not isinstance(value, dict):
            raise ValueError('Invalid raw API object')
        return value

    def observation_time(self, path: str, params: dict[str, Any]) -> dt.datetime:
        request = {'method':'GET','origin':'https://api.openalex.org','path':path,'params':params}
        key = hashlib.sha256(canonical(request)).hexdigest()
        receipt = json.loads((self.raw/(key+'.json')).read_bytes())
        return dt.datetime.fromisoformat(receipt['completed_at'])

    def inventory(self) -> list[dict[str, Any]]:
        inventory = []
        for path in sorted(self.raw.glob('*.json')):
            receipt = json.loads(path.read_bytes())
            self.get(receipt['request']['path'], receipt['request']['params'])
            inventory.append({'receipt':path.name, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                              'body_sha256':receipt['body_sha256'], 'started_at':receipt['started_at'],
                              'completed_at':receipt['completed_at']})
        return inventory


def normalize_author(author: dict[str, Any]) -> dict[str, Any]:
    years = []
    seen = set()
    if 'counts_by_year' not in author or not isinstance(author['counts_by_year'], list):
        raise ValueError('Author history missing, not zero')
    for row in author['counts_by_year']:
        year, works, cited = row['year'], row['works_count'], row['cited_by_count']
        if any(type(x) is not int for x in (year, works, cited)) or year in seen or year < 1000 or year > 3000 or min(works, cited) < 0:
            raise ValueError('Invalid author year history')
        seen.add(year)
        years.append({'year':year, 'works_count':works, 'cited_by_count':cited})
    return {'author_id':entity_id(author['id'], 'A'), 'counts_by_year':sorted(years, key=lambda r:r['year']),
            'updated_date':author.get('updated_date')}


def reconstruct_author_history(receipts: Receipts, aid: str, expected_work_ids: set[str]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Derive a missing profile from complete primary all-field works, never from zeros.

    The raw /authors response remains untouched. Every fallback /works response is
    independently receipted, paginated and replayable; this is a derived history.
    """
    cursor, expected, seen_cursors = '*', None, set()
    seen, annual, updated_dates = set(), {}, []
    for _ in range(1000):
        if cursor in seen_cursors:
            raise ValueError('Repeated reconstructed-history cursor')
        seen_cursors.add(cursor)
        params = {'filter':'author.id:'+aid,'corpus':'all',
            'select':'id,publication_year,counts_by_year,updated_date','per_page':100,'cursor':cursor}
        body = receipts.get('/works', params)
        current_year = receipts.observation_time('/works',params).year
        count, rows = body['meta']['count'], body['results']
        if type(count) is not int or count < 0 or (expected is not None and count != expected) or not isinstance(rows,list) or len(rows)>100:
            raise ValueError('Invalid reconstructed-history coverage')
        expected = count
        for work in rows:
            wid = entity_id(work['id'],'W')
            if wid in seen or type(work['publication_year']) is not int or work['publication_year']<1000 or not isinstance(work.get('updated_date'),str) or not isinstance(work.get('counts_by_year'),list):
                raise ValueError('Invalid reconstructed-history work')
            seen.add(wid); updated_dates.append(work['updated_date'])
            year = work['publication_year']
            if year <= current_year:
                annual.setdefault(year,{'year':year,'works_count':0,'cited_by_count':0})['works_count'] += 1
            citation_years = set()
            for row in work['counts_by_year']:
                y, cited = row['year'], row['cited_by_count']
                if type(y) is not int or not 2012 <= y <= current_year or y in citation_years or type(cited) is not int or cited < 0:
                    raise ValueError('Invalid reconstructed citation-year bins')
                citation_years.add(y)
                annual.setdefault(y,{'year':y,'works_count':0,'cited_by_count':0})['cited_by_count'] += cited
        if len(seen) == expected:
            break
        next_cursor = body['meta'].get('next_cursor')
        if len(seen)>expected or not rows or not isinstance(next_cursor,str) or not next_cursor:
            raise ValueError('Incomplete reconstructed author history')
        cursor = next_cursor
    else:
        raise BudgetStop('Reconstructed history exceeds bounded source work pages')
    if not expected_work_ids or not expected_work_ids <= seen or not updated_dates:
        raise ValueError('Reconstructed history omits known selected works')
    normalized = {'author_id':aid,'counts_by_year':[annual[y] for y in sorted(annual)],'updated_date':max(updated_dates)}
    evidence = {'author_id':aid,'method':'complete-all-corpus-author-works-v1','works_count':len(seen),
                'known_selected_works_verified':len(expected_work_ids)}
    return normalized, evidence


def prefetched_slices(required: list[tuple[str,int]], receipts: Receipts, workers: int):
    """At most four topic-year streams; cursor pages stay sequential within each.

    Main thread alone validates/normalizes/commits SQLite. Cached responses are
    replayed verbatim. Cancellation stops new calls; in-flight calls were precharged.
    """
    if not 1 <= workers <= 4:
        raise ValueError('Worker bound is 1..4')
    stop = threading.Event()
    def fetch(item: tuple[str,int]) -> None:
        topic,year = item
        cursor = '*'
        seen_cursors = set()
        seen,expected = 0,None
        try:
            while not stop.is_set():
                if cursor in seen_cursors:
                    raise ValueError('Repeated source cursor')
                seen_cursors.add(cursor)
                page = receipts.get('/works',work_params(topic,year,cursor))
                count = page['meta']['count']
                if type(count) is not int or count < 0 or (expected is not None and count != expected):
                    raise ValueError('Source slice count drift')
                expected = count
                rows = page['results']
                if not isinstance(rows,list) or len(rows)>100:
                    raise ValueError('Invalid source page')
                seen += len(rows)
                if seen == expected:
                    return
                cursor = page['meta'].get('next_cursor')
                if seen > expected or not rows or not isinstance(cursor,str) or not cursor:
                    raise ValueError('Incomplete source pagination')
            raise BudgetStop('Parallel acquisition stopped after another failure')
        except BaseException:
            stop.set()
            raise
    pool = ThreadPoolExecutor(max_workers=workers)
    pending: Any = deque()
    iterator = iter(required)
    try:
        for _ in range(workers):
            item = next(iterator,None)
            if item is not None:
                pending.append((item,pool.submit(fetch,item)))
        while pending:
            item,future = pending.popleft()
            future.result()
            yield item
            following = next(iterator,None)
            if following is not None:
                pending.append((following,pool.submit(fetch,following)))
    finally:
        stop.set()
        pool.shutdown(wait=True,cancel_futures=True)


def author_responses(receipts: Receipts, batches: list[list[str]], workers: int) -> list[dict[str,Any]]:
    if not 1 <= workers <= 4 or len(batches) > workers:
        raise ValueError('Author batch concurrency exceeds bound')
    def fetch(ids: list[str]) -> dict[str,Any]:
        return receipts.get('/authors',{'filter':'openalex:'+'|'.join(ids),
            'select':','.join(METHOD['history_fields']),'per_page':100})
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(fetch,batches))


def run_acquisition(root: Path, receipts: Receipts, required: list[tuple[str, int]] | None = None, workers: int = 1) -> dict[str, Any]:
    required = slices() if required is None else required
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    contract = {'method':METHOD, 'required_slices':[{'topic':t,'year':y} for t,y in required]}
    contract_hash = hashlib.sha256(canonical(contract)).hexdigest()
    method_path = root / 'method.json'
    if method_path.exists() and method_path.read_bytes() != canonical(contract):
        raise ValueError('Run directory method mismatch; use a fresh private directory')
    if not method_path.exists():
        atomic_json(method_path, contract)
    manifest_path = root / 'manifest.json'
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_bytes())
        if receipts.inventory() != manifest['raw_receipts']:
            raise ValueError('Finalized raw receipt inventory mismatch')
        if manifest['method_sha256'] != contract_hash or sha_file(root / 'normalized.sqlite') != manifest['normalized_sha256']:
            raise ValueError('Final artifact integrity mismatch')
        return manifest
    db = sqlite3.connect(root / 'normalized.sqlite')
    db.executescript("""
      CREATE TABLE IF NOT EXISTS works(id TEXT PRIMARY KEY, topic TEXT NOT NULL, year INTEGER NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS authors(id TEXT PRIMARY KEY, payload TEXT);
      CREATE TABLE IF NOT EXISTS slices(topic TEXT, year INTEGER, expected INTEGER, seen INTEGER NOT NULL DEFAULT 0,
          cursor TEXT, complete INTEGER NOT NULL DEFAULT 0, pages INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(topic,year));
      CREATE TABLE IF NOT EXISTS cursors(topic TEXT, year INTEGER, cursor TEXT, PRIMARY KEY(topic,year,cursor));
      CREATE TABLE IF NOT EXISTS reconstructed_histories(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    """)
    def checkpoint(reason: str) -> None:
        atomic_json(root / 'checkpoint.json', {'status':'incomplete', 'reason':reason, 'method_sha256':contract_hash,
            'checked_at':utcnow(), 'completed_slices':db.execute('select count(*) from slices where complete=1').fetchone()[0],
            'required_slices':len(required), 'works_count':db.execute('select coalesce(sum(seen),0) from slices').fetchone()[0],
            'authors_required':db.execute('select count(*) from authors').fetchone()[0],
            'authors_completed':db.execute('select count(*) from authors where payload is not null').fetchone()[0]})
    source_slices = prefetched_slices(required,receipts,workers) if workers > 1 else iter(required)
    try:
        checkpoint('running')
        for topic, year in source_slices:
            db.execute('insert or ignore into slices(topic,year,cursor) values(?,?,?)', (topic,year,'*'))
            db.commit()
            while True:
                expected, seen, cursor, complete, pages = db.execute('select expected,seen,cursor,complete,pages from slices where topic=? and year=?',(topic,year)).fetchone()
                if complete:
                    break
                page = receipts.get('/works', work_params(topic,year,cursor))
                count = page['meta']['count']
                rows = page['results']
                if type(count) is not int or count < 0 or not isinstance(rows,list) or len(rows)>100 or (expected is not None and expected != count):
                    raise ValueError('Slice count drift or invalid response')
                normalized = []
                for work in rows:
                    if work.get('is_authors_truncated') or len(work['authorships']) >= 100 or work.get('authors_count',len(work['authorships'])) != len(work['authorships']):
                        wid = entity_id(work['id'],'W')
                        recovered = receipts.get('/works/' + wid, {'select':','.join(METHOD['work_fields'])})
                        if recovered['id'] != work['id']:
                            raise ValueError('Singleton identifier mismatch')
                        work = recovered
                    row = normalize_work(work)
                    date = dt.date.fromisoformat(row['publication_date'])
                    if row['primary_topic_id'] != topic or row['publication_year'] != year or date.year != year or row['type'] not in METHOD['types']:
                        raise ValueError('Work outside exact source slice')
                    normalized.append(row)
                new_seen = seen + len(normalized)
                next_cursor = page['meta'].get('next_cursor')
                complete = new_seen == count
                if new_seen > count or (not complete and (not rows or not isinstance(next_cursor,str) or not next_cursor)):
                    raise ValueError('Incomplete slice pagination')
                with db:
                    db.execute('insert into cursors values(?,?,?)',(topic,year,cursor))
                    if not complete and db.execute('select 1 from cursors where topic=? and year=? and cursor=?',(topic,year,next_cursor)).fetchone():
                        raise ValueError('Repeated cursor')
                    for row in normalized:
                        db.execute('insert into works values(?,?,?,?)',(row['id'],topic,year,canonical(row).decode()))
                        if topic in METHOD['author_history_topics'] and year >= METHOD['author_history_first_year']:
                            for author in row['authorships']:
                                if author['author_id']:
                                    db.execute('insert or ignore into authors(id) values(?)',(author['author_id'],))
                    db.execute('update slices set expected=?,seen=?,cursor=?,complete=?,pages=? where topic=? and year=?',
                               (count,new_seen,None if complete else next_cursor,int(complete),pages+1,topic,year))
                checkpoint('running')
        while True:
            ids = [row[0] for row in db.execute('select id from authors where payload is null order by id limit ?', (workers*100,))]
            if not ids:
                break
            batches = [ids[i:i+100] for i in range(0,len(ids),100)]
            responses = author_responses(receipts,batches,workers)
            for batch,response in zip(batches,responses,strict=True):
                histories = [normalize_author(row) for row in response['results']]
                returned = [row['author_id'] for row in histories]
                if len(returned) != len(set(returned)) or not set(returned) <= set(batch) or response['meta']['count'] != len(returned):
                    raise ValueError('Invalid author-history batch; unexpected/missing is not zero')
                reconstructions = []
                for aid in sorted(set(batch)-set(returned)):
                    expected_work_ids = {r[0] for r in db.execute("select distinct w.id from works w,json_each(w.payload,'$.authorships') a where w.topic in ('T10429','T11601') and json_extract(a.value,'$.author_id')=?",(aid,))}
                    row, evidence = reconstruct_author_history(receipts,aid,expected_work_ids)
                    histories.append(row); reconstructions.append(evidence)
                with db:
                    for row in histories:
                        db.execute('update authors set payload=? where id=?',(canonical(row).decode(),row['author_id']))
                    for evidence in reconstructions:
                        db.execute('insert into reconstructed_histories values(?,?)',(evidence['author_id'],canonical(evidence).decode()))
                checkpoint('running')
        completed = db.execute('select topic,year,expected,seen,pages from slices where complete=1 order by topic,year').fetchall()
        if {(r[0],r[1]) for r in completed} != set(required) or db.execute('select count(*) from authors where payload is null').fetchone()[0]:
            raise ValueError('Final coverage incomplete')
        work_count = db.execute('select count(*) from works').fetchone()[0]
        author_count = db.execute('select count(*) from authors').fetchone()[0]
        if work_count != sum(r[2] for r in completed):
            raise ValueError('Final work coverage mismatch')
        db.commit()
        inventory = receipts.inventory()
        manifest = {'status':'complete', 'schema':'atlas.openalex-primary.manifest.v1', 'method_sha256':contract_hash,
            'method_file':'method.json', 'normalized_file':'normalized.sqlite', 'works_count':work_count,
            'authors_count':author_count, 'required_slices':contract['required_slices'],
            'author_history_reconstructions':[json.loads(r[0]) for r in db.execute('select payload from reconstructed_histories order by id')],
            'completed_slices':[{'topic':t,'year':y,'expected':e,'seen':s,'pages':p} for t,y,e,s,p in completed],
            'raw_receipts':inventory, 'acquisition_started_at':min(r['started_at'] for r in inventory),
            'acquisition_completed_at':max(r['completed_at'] for r in inventory),
            'normalized_sha256':sha_file(root / 'normalized.sqlite'),
            'source_max_updated_date':{'works':db.execute("select max(json_extract(payload,'$.updated_date')) from works").fetchone()[0],
                                       'authors':db.execute("select max(json_extract(payload,'$.updated_date')) from authors").fetchone()[0]},
            'replay':receipts.offline, 'finalized_at':utcnow()}
        atomic_json(manifest_path,manifest)
        (root/'checkpoint.json').unlink(missing_ok=True)
        return manifest
    except BaseException as error:
        db.rollback()
        checkpoint(type(error).__name__)
        raise
    finally:
        close_slices = getattr(source_slices,'close',None)
        if close_slices:
            close_slices()
        db.close()


@contextlib.contextmanager
def acquisition_lock(path: Path = LOCK):
    # The citation lane uses THIS same pathname. Never unlink the shared inode.
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a+b') as handle:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise BudgetStop('Another OpenAlex acquisition holds the shared lock') from None
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)



def size_inventory(transport: Any, cap: int = 7000, reserve: int = 2727) -> dict[str, Any]:
    pre = preflight(transport,cap,reserve)
    if pre['available_credits'] < len(METHOD['topics']):
        raise BudgetStop('Insufficient free quota for ten-count sizing')
    counts = []
    for topic in METHOD['topics']:
        first_year = METHOD['author_start_year'] if topic in METHOD['author_history_topics'] else METHOD['paper_start_year']
        params = work_params(topic,first_year,count_only=True)
        params['filter'] = params['filter'].replace(f'to_publication_date:{first_year}-12-31',f"to_publication_date:{METHOD['end_date']}")
        result = json.loads(transport.get('/works',params))
        count = result['meta']['count']
        if type(count) is not int or count < 0:
            raise ValueError('Invalid source sizing count')
        counts.append({'topic':topic,'first_year':first_year,'last_year':METHOD['complete_year'],'count':count})
    total = sum(r['count'] for r in counts)
    return {'status':'sizing_only','candidate_works':total,'topic_counts':counts,
            'min_work_pages':sum(math.ceil(r['count']/100) for r in counts),
            'slice_rounding_extra_pages_upper_bound':len(slices())-len(counts),
            'author_batches':'unknown until distinct two-topic authors are collected',
            'attempted_list_credits':len(counts), 'preflight':pre}


def main() -> int:
    os.umask(0o077)
    parser = SafeParser(description=__doc__)
    parser.add_argument('command', choices=['method','preflight','size','smoke','acquire','replay'])
    parser.add_argument('--private-run-dir', type=Path)
    parser.add_argument('--source-run-dir', type=Path, help='Read-only receipt source for offline replay')
    parser.add_argument('--workers',type=int,choices=range(1,5),default=4)
    parser.add_argument('--cap-credits', type=int, default=7000)
    parser.add_argument('--reserve-credits', type=int, default=2727,
                        help='Use 0 only after parent has cleared the separate citation reservation')
    args = parser.parse_args()
    if args.command == 'method':
        print(json.dumps(METHOD, indent=2))
        return 0
    if args.command in ('acquire','replay','smoke') and not args.private_run_dir:
        parser.error('--private-run-dir is required')
    if args.command == 'replay' and not args.source_run_dir:
        parser.error('--source-run-dir is required')
    root = args.private_run_dir.resolve() if args.private_run_dir else None
    repo = Path(__file__).resolve().parents[2]
    if root is not None and (root == repo or repo in root.parents):
        parser.error('Raw and author-level data must stay outside the repository')
    # Even quota probes use the shared exclusive lock. Offline method does not.
    with acquisition_lock():
        transport = CurlTransport()
        if args.command == 'preflight':
            result = preflight(transport,args.cap_credits,args.reserve_credits)
            result = {**result, 'required_slice_count':len(result['required_slices'])}
            result.pop('required_slices')
        elif args.command == 'size':
            result = size_inventory(transport,args.cap_credits,args.reserve_credits)
        elif args.command == 'replay':
            assert root is not None and args.source_run_dir is not None
            source = args.source_run_dir.resolve()
            if root == source or root.exists():
                parser.error('Replay output must be a fresh directory separate from the source')
            result = run_acquisition(root,Receipts(source,None,offline=True))
        else:
            assert root is not None
            root.mkdir(parents=True,exist_ok=True,mode=0o700)
            budget = Budget(transport,root/'budget.json',args.cap_credits,args.reserve_credits)
            receipts = Receipts(root,transport,budget)
            if args.command == 'smoke':
                params = work_params('T10429',2000)
                params['per_page'] = 1
                response = receipts.get('/works',params)
                work = response['results'][0]
                if work.get('is_authors_truncated') or len(work['authorships']) >= 100 or work.get('authors_count',len(work['authorships'])) != len(work['authorships']):
                    work = receipts.get('/works/'+entity_id(work['id'],'W'),{'select':','.join(METHOD['work_fields'])})
                normalized = normalize_work(work)
                result = {'status':'smoke_only','normalized_works':1,'source_slice_count':response['meta']['count'],
                          'authorships_verified':normalized['authors_count'], 'no_final_manifest':True,
                          'attempted_list_credits':budget.state['attempted_credits']}
                atomic_json(root/'smoke.json',result)
            else:
                result = run_acquisition(root,receipts,workers=args.workers)
                result = {key:result[key] for key in ('status','works_count','authors_count','acquisition_started_at','acquisition_completed_at','normalized_sha256')}
        print(json.dumps(result,indent=2))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except BudgetStop as error:
        print('Acquisition paused: ' + str(error) + '; no new success manifest', file=sys.stderr)
        raise SystemExit(3)
    except Exception as error:
        # Do not print provider bodies, curl stderr, arbitrary exceptions, or credentials.
        print('Acquisition stopped: ' + type(error).__name__ + '; no success manifest produced', file=sys.stderr)
        raise SystemExit(2)
