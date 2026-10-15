# Run with an owned canonical browser-harness window; never standalone Python.
# No cookies, headers or transient widget tokens are logged or saved.
import datetime
import json
import os
from pathlib import Path
from urllib.parse import quote

ROOT = Path.cwd().resolve()
OUT = (ROOT / os.environ.get('TRENDS_CAPTURE_OUT', '.qa/trends-capture')).resolve()
assert OUT.is_relative_to(ROOT), 'Capture output must stay in this checkout'
assert not OUT.exists(), 'Use a fresh staging directory; do not overwrite prior evidence'
START = os.environ.get('TRENDS_CAPTURE_START', '2023-10-15')
END = os.environ.get('TRENDS_CAPTURE_END', '2026-10-15')
start, end = datetime.date.fromisoformat(START), datetime.date.fromisoformat(END)
assert end.year - start.year == 3 and (end.month, end.day) == (start.month, start.day), 'Exactly 36 calendar months required'
assert end <= datetime.datetime.now(datetime.timezone.utc).date(), 'No future end date'

goto_url('https://trends.google.com/trends/explore?date=' + quote(START + ' ' + END) + '&q=neurotechnology,brain-computer%20interface&hl=en-US')
wait_for_load()
assert js("location.origin === 'https://trends.google.com'")

def fetch_public(path):
    result = js('(async()=>{const r=await fetch(' + json.dumps(path) + ');return {status:r.status,body:await r.text()}})()', timeout=60)
    assert result['status'] == 200, f"Google Trends HTTP {result['status']}; stop, retain existing snapshot"
    return result['body']

captures = []
for ident, terms in [('neurotech', ['neurotechnology', 'brain-computer interface']), ('neuralink', ['Neuralink'])]:
    request = {'comparisonItem': [{'keyword': term, 'geo': '', 'time': START + ' ' + END} for term in terms], 'category': 0, 'property': ''}
    raw = fetch_public('/trends/api/explore?hl=en-US&tz=0&req=' + quote(json.dumps(request, separators=(',', ':'))))
    explore = json.loads(raw[raw.index('{'):])
    widget = next(w for w in explore['widgets'] if w['id'] == 'TIMESERIES')
    path = '/trends/api/widgetdata/multiline?hl=en-US&tz=0&req=' + quote(json.dumps(widget['request'], separators=(',', ':'))) + '&token=' + quote(widget['token'])
    timeline = fetch_public(path)
    parsed = json.loads(timeline[timeline.index('{'):])
    assert len(parsed['default']['timelineData']) > 0, 'No timeline data'
    meta = {'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'exploreRequest': request, 'widgetRequest': widget['request']}
    captures.append((ident, timeline, meta))
OUT.mkdir(parents=True)
for ident, timeline, meta in captures:
    (OUT / (ident + '.raw.json')).write_text(timeline)
    (OUT / (ident + '.request.json')).write_text(json.dumps(meta, indent=2) + '\n')
print('Saved two real Google Trends captures to staging; validate with npm run trends:refresh -- --source ' + str(OUT.relative_to(ROOT)) + ' --out .qa/trends-generated')
