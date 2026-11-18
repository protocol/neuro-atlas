"""Read-only native QA for the three November 18 Milestones additions.
Run inside an owned browser-harness session with QA_BASE, QA_ROOT, QA_OUT,
QA_REVISION. Exact production-built loopback HTML/assets; not hosted auth or
physical-phone touch. Does not open the outbound source links.
"""
import json, math, subprocess, time
from pathlib import Path
from urllib.parse import urlparse

assert urlparse(QA_BASE).hostname == '127.0.0.1'
ROOT = Path(QA_ROOT)
OUT = Path(QA_OUT)
OUT.mkdir(parents=True, exist_ok=True)
BASE = '509ad21e8b33ef076bdcd055f26f4c4aedf011b1'
rows = json.loads((ROOT / 'src/data/milestones.json').read_text())
baseline = json.loads(subprocess.check_output(['git', 'show', BASE + ':src/data/milestones.json'], cwd=ROOT))
new_sources = {
    'EON Systems': 'https://untappedventures.substack.com/p/untapped-ventures-invests-in-eon',
    'Hemispheric': 'https://www.calcalistech.com/ctechnews/article/rjentgbege',
    'Paradromics': 'https://paradromics.com/news/neom-investment-fund-partners-with-paradromics-to-drive-innovation-in-neurotechnology-healthcare/',
}
additions = {}
for name, source in new_sources.items():
    found = [r for r in rows if r['sourceUrl'] == source]
    assert len(found) == 1, (name, 'exactly one event')
    additions[name] = found[0]
assert [r for r in rows if r['sourceUrl'] not in new_sources.values()] == baseline
assert additions['Hemispheric']['amountUsdM'] is None
assert additions['Paradromics']['amountUsdM'] is None
assert additions['EON Systems']['amountUsdM'] == 3.5

def total(dataset, year, bci=False):
    return sum((r['amountUsdM'] or 0) for r in dataset if r['stage'] == 'capital'
               and r['activity'].strip().lower() not in ('grant', 'award')
               and (r['date'] or '').startswith(str(year))
               and (not bci or r['scope'] == 'bci'))
assert total(rows, 2025) == total(baseline, 2025) + 3.5
assert total(rows, 2026) == total(baseline, 2026)
assert all(total(rows, y, True) == total(baseline, y, True) for y in (2024, 2025, 2026))

def fmt_amount(v):
    if v >= 1000:
        return '$' + (str(int(v / 1000)) if v % 1000 == 0 else format(v / 1000, '.1f')) + 'b'
    return '$' + str(math.floor(v + .5)) + 'm'

def wait(probe, label, timeout=15):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        result = probe()
        if result:
            return result
        time.sleep(.1)
    raise AssertionError(label)

def click_expr(expr):
    p = js("""(() => {const e=EXPR;if(!e)throw Error('Missing target');e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(!e.contains(document.elementFromPoint(x,y)))throw Error('Occluded target');return {x,y}})()""".replace('EXPR', expr))
    click_at_xy(p['x'], p['y'])

def button_starts(label):
    return "[...document.querySelectorAll('button')].find(e=>e.textContent.trim().startsWith(" + json.dumps(label) + "))"

def source_anchor(source):
    return "[...document.querySelectorAll('.milestone-year-scroll a[aria-label]')].find(e=>e.getAttribute('href')===" + json.dumps(source) + ")"

def set_scope(bci):
    click_expr(button_starts('BCI only' if bci else 'All neurotech'))
    wait(lambda: js("!document.querySelector('[data-milestone-detail]')"), 'tooltip dismissed by scope change')

def set_year(year):
    if not js("document.querySelector('.milestone-year-scroll').getAttribute('aria-label').startsWith(" + json.dumps(str(year)) + ")"):
        click_expr("document.querySelector('button[aria-label^=\"Focus " + str(year) + ":\"]')")
    wait(lambda: js("document.querySelector('.milestone-year-scroll').getAttribute('aria-label').startsWith(" + json.dumps(str(year)) + ")"), 'year identity')
    wait(lambda: js("document.getAnimations().every(a=>a.playState!=='running')"), 'year transition')
    if not js("document.querySelector('button[aria-pressed=\"true\"]')?.textContent.trim()==='Fit year'"):
        click_expr(button_starts('Fit year'))
    wait(lambda: js("document.querySelector('.milestone-year-scroll').scrollWidth<=document.querySelector('.milestone-year-scroll').clientWidth+1"), 'fit year width')

results = []
for width, height in [(1440, 1000), (768, 1024), (390, 844), (320, 800)]:
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=width<500)
    goto_url(QA_BASE + '/neuro-atlas/milestones')
    wait_for_load()
    assert wait_for_element('[data-milestone-today]', visible=True)
    cdp('Page.bringToFront')
    wait(lambda: js("document.fonts.status==='loaded'"), 'fonts')
    wait(lambda: js("document.getAnimations().every(a=>a.playState!=='running')"), 'initial transition')
    view = {'width': width, 'events': [], 'scopeChecks': []}
    for name, row in additions.items():
        set_scope(False)
        year = int(row['date'][:4])
        set_year(year)
        expr = source_anchor(row['sourceUrl'])
        wait(lambda: js('Boolean(' + expr + ')'), name + ' is rendered')
        p = js("""(() => {const e=EXPR;e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,hit:e.contains(document.elementFromPoint(x,y)),label:e.getAttribute('aria-label'),href:e.getAttribute('href')}})()""".replace('EXPR', expr))
        assert p['hit'] and p['label'] == row['company'] + ' — ' + row['activity'], p
        cdp('Input.dispatchMouseEvent', type='mouseMoved', x=p['x'], y=p['y'])
        wait(lambda: js("document.querySelector('[data-milestone-detail]')?.textContent.includes(" + json.dumps(row['note']) + ")"), name + ' exact note')
        detail = js("""(() => {const t=document.querySelector('[data-milestone-detail]');return {text:t.innerText,rect:t.getBoundingClientRect().toJSON()}})()""")
        assert 'Announced' in detail['text'], detail
        if name == 'Hemispheric':
            assert '$52' in detail['text'] and 'aggregate' in detail['text'].lower(), detail
        if name == 'Paradromics':
            assert 'undisclosed' in detail['text'].lower(), detail
        assert detail['rect']['left'] >= -1 and detail['rect']['right'] <= width + 1, detail
        capture_screenshot(str(OUT / (name.lower().replace(' ', '-') + '-' + str(width) + '.png')))
        cdp('Input.dispatchMouseEvent', type='mouseMoved', x=2, y=2)
        wait(lambda: js("!document.querySelector('[data-milestone-detail]')"), 'tooltip closes')
        set_scope(True)
        actual = js('Boolean(' + expr + ')')
        assert actual == (row['scope'] == 'bci'), (name, 'BCI filter', actual)
        view['scopeChecks'].append({'company':name, 'visibleInBciOnly':actual})
        view['events'].append({'company':name, 'source':p['href'], 'label':p['label'], 'tooltip':detail})
    set_scope(False)
    set_year(2026)
    expected_line_points = 1 + sum(1 for r in baseline if r['stage'] == 'capital'
                                   and r['activity'].strip().lower() not in ('grant', 'award')
                                   and r['amountUsdM'] and (r['date'] or '').startswith('2026'))
    line_points = js("document.querySelector('.milestone-year-scroll polyline').getAttribute('points').trim().split(/\\s+/).length")
    assert line_points == expected_line_points, ('Hemispheric must not add a $52M curve step', line_points, expected_line_points)
    view['capitalLinePointCount'] = line_points
    if width >= 1024:
        annual = js("[...document.querySelectorAll('aside button')].filter(e=>e.querySelector('span.tnum > span')).map(e=>e.innerText)")
        assert any('2026' in s and fmt_amount(total(rows, 2026)) in s for s in annual), annual
        view['annualRail'] = annual
    b = js("({inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})")
    assert b['inner'] == width and b['scroll'] <= b['client'] + 1, b
    view['bounds'] = b
    results.append(view)

cdp('Emulation.clearDeviceMetricsOverride')
receipt = {'revision':QA_REVISION, 'base':BASE, 'fixture':'Exact production-built HTML/RSC/assets, Host-restricted loopback viewer; native pointer with viewport emulation, not hosted authentication or physical-phone touch', 'allScopeTotals':{str(y):total(rows,y) for y in (2024,2025,2026)}, 'baselineAllScopeTotals':{str(y):total(baseline,y) for y in (2024,2025,2026)}, 'cases':results}
(OUT / 'milestones-coverage-native.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({'milestonesCoverage':'PASS','widths':len(results),'eventChecks':sum(len(c['events']) for c in results)}))
