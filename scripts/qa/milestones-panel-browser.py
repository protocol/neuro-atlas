"""Actual Next UI replay through browser-harness; loopback fixture only, no writes."""
import json, os, time
from pathlib import Path

ROOT = Path(os.environ['MILESTONES_QA_ROOT'])
OUT = Path(os.environ['MILESTONES_QA_OUT'])
BASE = os.environ['MILESTONES_QA_ORIGIN']
SHA = os.environ['MILESTONES_QA_SHA']
assert BASE.startswith('http://127.0.0.1:') and BASE.endswith('/neuro-atlas')
assert len(SHA) == 40 and all(c in '0123456789abcdef' for c in SHA)
OUT.mkdir(parents=True, exist_ok=True)
FOLD = 'main button[aria-label="Fold side panel to show the full year"]'
OPEN = 'main button[aria-label="Open side panel"]'
PANEL = 'main aside'
rows = json.loads((ROOT / 'src/data/milestones.json').read_text())
amount = sum(row.get('amountUsdM') or 0 for row in rows if row['stage'] == 'capital'
             and row['activity'].strip().lower() != 'grant' and (row.get('date') or '').startswith('2026-'))
expected = ('$' + (f'{amount / 1000:.0f}' if amount % 1000 == 0 else f'{amount / 1000:.1f}') + 'b') if amount >= 1000 else f'${round(amount)}m'

def wait(expression):
    until = time.monotonic() + 30
    while time.monotonic() < until:
        result = js(expression)
        if result:
            return result
        time.sleep(.1)
    raise AssertionError('Timed out: ' + expression)

def visible(selector):
    return js('return [...document.querySelectorAll(' + json.dumps(selector) + ')].filter(e=>e.getClientRects().length && getComputedStyle(e).visibility!=="hidden").length')

def click(selector):
    js('document.querySelector(' + json.dumps(selector) + ').scrollIntoView({block:"center",behavior:"instant"})')
    time.sleep(.15)
    point = js('return (()=>{const e=document.querySelector(' + json.dumps(selector) + ');const r=e.getBoundingClientRect();if(!r.width||!r.height)throw Error("Hidden control");return {x:r.x+r.width/2,y:r.y+r.height/2}})()')
    click_at_xy(point['x'], point['y'])

def viewport(width):
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=1000 if width == 1440 else 844, deviceScaleFactor=1, mobile=width < 500)
    wait('return innerWidth===' + str(width))

def capture(name):
    capture_screenshot(path=str(OUT / (name + '.png')))

def summary():
    return js('return (()=>{const a=document.querySelector("main aside");if(!a)return null;const b=[...a.querySelectorAll("button")].find(e=>e.querySelector("span.tnum > span")?.textContent==="2026");const c=[...a.querySelectorAll(".space-y-3 > div")].find(e=>e.firstElementChild.textContent==="Capital");return {text:a.innerText,annual:b?.querySelector("span.tnum").lastElementChild.textContent,period:c?.querySelector(".tnum").textContent}})()')

def bounds(width):
    state = js('return (()=>{const p=document.querySelector(".milestone-year-scroll");const a=document.querySelector("main aside");return {inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,railVisible:!!a?.getClientRects().length,plot:p.getBoundingClientRect().toJSON(),localScroll:p.scrollWidth,localClient:p.clientWidth}})()')
    assert state['inner'] == width and state['client'] <= width and state['scroll'] <= width, state
    assert state['plot']['left'] >= 0 and state['plot']['right'] <= state['client'] + 1, state
    return state

before = [t['targetId'] for t in cdp('Target.getTargets')['targetInfos'] if t['type'] == 'page']
new_tab(BASE + '/milestones')
wait_for_load()
after = [t['targetId'] for t in cdp('Target.getTargets')['targetInfos'] if t['type'] == 'page']
owned = [t for t in after if t not in before]
assert len(owned) == 1, owned
(OUT / 'browser-targets.json').write_text(json.dumps({'before': before, 'owned': owned}))
results = []
for width in [1440, 390, 320]:
    viewport(width)
    goto_url(BASE + '/milestones')
    wait_for_load()
    assert wait_for_element('.milestone-year-scroll', visible=True)
    wait('return [...document.querySelectorAll("button")].some(e=>e.getAttribute("aria-label")?.includes("mode"))')
    assert js('return location.pathname') == '/neuro-atlas/milestones'
    assert js('return fetch(location.href).then(r=>r.headers.get("x-atlas-qa-source"))') == SHA
    js('return (()=>{const s=document.createElement("style");s.textContent="nextjs-portal{display:none!important}";document.head.append(s);document.querySelector(".milestone-year-strip").scrollIntoView({block:"start",behavior:"instant"});return true})()')
    time.sleep(.3)
    capture(f'initial-{width}')
    initial = summary()
    assert initial and initial['annual'] == expected and initial['period'] == expected, initial
    state = bounds(width)
    assert visible(OPEN) == 0
    if width == 1440:
        assert state['railVisible'] and visible(FOLD) == 1, state
        assert 'Capital raised' in initial['text'] and 'Jan 1 – Dec 31, 2026' in initial['text']
        click(FOLD)
        wait('return !document.querySelector("main aside")')
        assert visible(OPEN) == 1
        folded = bounds(width)
        assert folded['plot']['width'] > state['plot']['width'], (state, folded)
        capture('folded-1440')
        # A manual fold survives a responsive roundtrip in the same mounted page.
        viewport(320)
        assert visible(OPEN) == 0
        bounds(320)
        viewport(1440)
        assert visible(OPEN) == 1 and summary() is None
        click(OPEN)
        wait('return !!document.querySelector("main aside")')
        assert visible(FOLD) == 1 and summary() == initial
        capture('reopened-1440')
        # The default-open state is hidden by the existing mobile CSS, not reset.
        viewport(390)
        assert visible(PANEL) == 0 and visible(FOLD) == 0 and summary() is not None
        bounds(390)
        viewport(1440)
        assert visible(PANEL) == 1 and summary() == initial
        results.append({'width': width, 'initialSummary': initial, 'bounds': state, 'foldedBounds': folded,
                        'nativeFoldOpenRoundtrip': True, 'sameMountResponsiveStateRetained': True})
    else:
        assert not state['railVisible'] and visible(FOLD) == 0, state
        # Preserve the existing small-screen local horizontal timeline, not viewport overflow.
        assert state['localScroll'] > state['localClient'], state
        js('document.querySelector(".milestone-year-scroll").scrollLeft=250')
        wait('return document.querySelector(".milestone-year-scroll").scrollLeft>0')
        results.append({'width': width, 'bounds': state, 'railHiddenByExistingResponsiveCSS': True,
                        'localTimelineScrollWorks': True, 'summaryPresentWithoutManualOpen': True})
report = {'source': SHA, 'actualNextUI': True, 'syntheticLoopbackGateOnly': True, 'hostedAuthUntouched': True,
          'noProviderWrites': True, 'expected2026CapitalUsdM': amount, 'checks': results}
(OUT / 'native-results.json').write_text(json.dumps(report, indent=2))
print(json.dumps({'passed': True, 'widths': [r['width'] for r in results], 'source': SHA, 'expected2026Capital': expected}))
