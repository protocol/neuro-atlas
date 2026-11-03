"""Audit a single public MaleCNS image encoding using object metadata only."""
import argparse
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import urllib.parse
import urllib.request

PREFIX = 'em/em-clahe-jpeg/'
API = 'https://storage.googleapis.com/storage/v1/b/flyem-male-cns/o'


def summarize(records):
    names, levels, total = set(), {}, 0
    for item in records:
        name, size = item['name'], int(item['size'])
        if not name.startswith(PREFIX):
            raise ValueError('object outside image scope')
        if name in names:
            raise ValueError('duplicate object name')
        if size < 0:
            raise ValueError('negative object size')
        suffix = name.removeprefix(PREFIX)
        if suffix != 'info':
            parts = suffix.split('/')
            if len(parts) != 2 or not parts[1].endswith('.shard'):
                raise ValueError('unexpected object in image scope')
            levels[parts[0]] = levels.get(parts[0], 0) + size
        names.add(name)
        total += size
    return {'objects': len(names), 'bytes': total, 'PB': total / 10**15,
            'levels': levels}


def live_inventory():
    items, page, tokens = [], None, set()
    while True:
        query = {'prefix': PREFIX, 'maxResults': 1000,
                 'fields': 'items(name,size,generation,updated),nextPageToken'}
        if page:
            query['pageToken'] = page
        with urllib.request.urlopen(API + '?' + urllib.parse.urlencode(query), timeout=30) as response:
            data = json.load(response)
        items.extend(data.get('items', []))
        page = data.get('nextPageToken')
        if not page:
            return items
        if page in tokens:
            raise ValueError('repeated continuation token')
        tokens.add(page)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--snapshot', type=Path)
    mode.add_argument('--live', action='store_true')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.live:
        records = live_inventory()
    else:
        with gzip.open(args.snapshot, 'rt') as source:
            records = [json.loads(line) for line in source if line.strip()]
    result = summarize(records)
    if args.live:
        result['measurementUTC'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        result['scope'] = 'gs://flyem-male-cns/' + PREFIX
        result['complete'] = True
    if args.output:
        args.output.mkdir(parents=True, exist_ok=False)
        raw = ('\n'.join(json.dumps(item, sort_keys=True) for item in sorted(records, key=lambda x: x['name'])) + '\n').encode()
        blob = gzip.compress(raw, mtime=0)
        (args.output/'snapshot.jsonl.gz').write_bytes(blob)
        result['snapshotSHA256'] = hashlib.sha256(blob).hexdigest()
        (args.output/'summary.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))
