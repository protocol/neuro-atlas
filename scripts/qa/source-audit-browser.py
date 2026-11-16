"""Actual production-built components/data on a loopback static fixture; no hosted/auth claim."""
import hashlib
import json
import time
from pathlib import Path
from urllib.parse import urlparse

QA_ROOT = Path(QA_ROOT)
QA_BUILD = Path(QA_BUILD)
QA_OUT = QA_ROOT / 'docs/source-audit-20261116/qa'
QA_OUT.mkdir(parents=True, exist_ok=True)
assert urlparse(QA_BASE).hostname in {'127.0.0.1', 'localhost'}
rows = json.loads((QA_BUILD / 'src/data/milestones.json').read_text())
funding = json.loads((QA_BUILD / 'src/data/funding-index.json').read_text())
results = []

def until(probe, message, tries=60):
    for _ in range(tries):
        value = probe()
        if value:
            return value
        time.sleep(.1)
    raise AssertionError(message)

def click_expr(expression):
    point = js("""(() => { const el = EXPR; if(!el) throw Error('Missing native control');
      el.scrollIntoView({block:'center',inline:'center',behavior:'instant'});
      const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      if(!el.contains(document.elementFromPoint(x,y))) throw Error('Native target occluded');
      return {x,y}; })()""".replace('EXPR', expression))
    click_at_xy(point['x'], point['y'])


def milestone_expr(row):
    return "[...document.querySelectorAll('a[aria-label]')].find(el=>el.getAttribute('href')===" + json.dumps(row['sourceUrl']) + " && el.getAttribute('aria-label')===" + json.dumps(row['company'] + ' — ' + row['activity']) + ")"


def focus_year(year):
    selector = '[aria-label="' + str(year) + ' timeline. Scroll horizontally for later months."]'
    if not js('Boolean(document.querySelector(' + json.dumps(selector) + '))'):
        click_expr("[...document.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')?.startsWith('Focus " + str(year) + ":'))")
    assert wait_for_element(selector, visible=True)
    until(lambda: js('document.getAnimations().filter(a=>a.playState==="running").length===0'), 'year transition did not settle')
    expected = [r for r in rows if (r['date'] or '').startswith(str(year))]
    actual = js("""(() => [...document.querySelector(SELECTOR).querySelectorAll('a[aria-label]')].map(a=>({label:a.getAttribute('aria-label'),source:a.getAttribute('href')})))()""".replace('SELECTOR', json.dumps(selector)))
    want = sorted((r['company'] + ' — ' + r['activity'], r['sourceUrl']) for r in expected)
    assert sorted((a['label'], a['source']) for a in actual) == want, (year, len(actual), len(want))
    return len(actual)


def hover_record(row):
    # Expanded name capsules can cover a neighboring resting mark on mobile.
    # Clear the previous hover, then measure and hit-test the new resting mark.
    cdp('Input.dispatchMouseEvent', type='mouseMoved', x=2, y=2)
    until(lambda:not js("Boolean(document.querySelector('[data-milestone-detail]'))"), 'previous detail did not dismiss')
    expression = milestone_expr(row)
    point = js("""(() => {const el=EXPR; if(!el) throw Error('Missing exact source mark');
      el.scrollIntoView({block:'center',inline:'center',behavior:'instant'});
      const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      if(!el.contains(document.elementFromPoint(x,y))) throw Error('Resting source mark occluded');
      return {x,y};})()""".replace('EXPR', expression))
    cdp('Input.dispatchMouseEvent', type='mouseMoved', x=point['x'], y=point['y'])
    until(lambda: js("document.querySelector('[data-milestone-detail]')?.innerText.includes(" + json.dumps(row['note']) + ")"), 'exact detail did not populate')
    return js("""(() => {const el=document.querySelector('[data-milestone-detail]'),r=el.getBoundingClientRect();
      return {text:el.innerText,left:r.left,right:r.right,top:r.top,bottom:r.bottom,inner:innerWidth,height:innerHeight};})()""")


# Inventory initial tabs without exposing their URLs. This script reuses one task-owned tab.
preexisting_ids = [t['targetId'] for t in cdp('Target.getTargets')['targetInfos'] if t['type']=='page']
if globals().get('QA_REUSE_TAB', False):
    assert js('location.origin===' + json.dumps(QA_BASE)), 'Reuse only this task-owned fixture tab'
    goto_url(QA_BASE + '/milestones')
else:
    new_tab(QA_BASE + '/milestones')
for width, height in [(1440,1000), (390,844), (320,800)]:
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=False)
    goto_url(QA_BASE + '/milestones')
    cdp('Page.bringToFront')
    wait_for_load()
    assert wait_for_element('.milestone-year-scroll', visible=True)
    # The timeline is server-rendered; its presence alone is not hydration readiness.
    until(lambda: js("[...document.querySelectorAll('div')].some(el=>el.textContent==='today')"), 'timeline hydration marker absent')
    until(lambda: js("document.fonts.status==='loaded'"), 'fonts not settled')
    assert js("document.body.innerText.includes('Clinical / regulatory')")
    inventories = {year: focus_year(year) for year in [2024,2025,2026]}
    assert sum(inventories.values()) == len(rows)
    cases = [
      ('envoy', 'envoy-medical', lambda r: r['stage']=='capital', '$30m financing', 'up to $48m'),
      ('synchron', 'synchron', lambda r: 'techtimes.com' in r['sourceUrl'], 'pivotal planned', 'Reported Jun 6, 2026'),
      ('phantom', 'phantom-neuro', lambda r: 'insidebci.com' in r['sourceUrl'], 'FIH approved', 'Australia'),
      ('inbrain-month', 'inbrain-neuroelectronics', lambda r:r['activity']=='TAP', 'Event date Jan 2024', 'FDA TAP'),
      ('forest-commitment', 'forest-neurotech', lambda r:True, '$14m committed', 'Eric Schmidt'),
      ('precision-fda', 'precision-neuroscience', lambda r:r['activity']=='510(k)', 'Event date Mar 30, 2025', 'less than 30 days'),
    ]
    for name,slug,predicate,needle,other in cases:
        row = next(r for r in rows if r['slug']==slug and predicate(r))
        focus_year(int(row['date'][:4]))
        detail=hover_record(row)
        assert needle in detail['text'] and other in detail['text'], (name,detail)
        if name=='phantom': assert 'FDA approval' not in detail['text']
        if name=='inbrain-month': assert 'Jan 1,' not in detail['text']
        if name=='forest-commitment': assert 'committed raised' not in detail['text']
        assert detail['left']>=-1 and detail['right']<=width+1, (name,width,detail)
        assert detail['top']>=-1 and detail['bottom']<=height+1, (name,width,detail)
        if name in {'envoy','inbrain-month','forest-commitment'} and width in {1440,390}:
            capture_screenshot(path=str(QA_OUT/f'milestones-{name}-{width}.png'))
        results.append({'width':width,'route':'milestones','record':name,'detail':detail,'inventories':inventories})
    goto_url(QA_BASE + '/funding')
    wait_for_load()
    assert wait_for_element('[data-founding-year]', visible=True)
    assert js("document.querySelectorAll('[data-founding-year]').length") == 25
    for slug in ['neuracle-technology','forest-neurotech','neuroxess','neurobionics']:
        click_expr("document.querySelector('[data-founding-year=" + json.dumps(slug)[1:-1] + "]')")
        assert wait_for_element('[role="dialog"]', visible=True)
        company=next(c for c in funding['companies'] if c['slug']==slug)
        assert js("document.querySelector('#company-detail-title').textContent") == company['name']
        history=[r for r in funding['rounds'] if r['companySlug']==slug]
        for row in history:
            # Check the actual backer paragraph, not a note that can mention nonparticipants.
            assert js("""(() => {const d=document.querySelector('[role=dialog]');return [...d.querySelectorAll('article')].some(a=>a.innerText.includes(STAGE)&&[...a.querySelectorAll('p')].some(p=>p.textContent===BACKERS)&&a.querySelector('a')?.getAttribute('href')===SOURCE);})()""".replace('STAGE',json.dumps(row['stage'])).replace('BACKERS',json.dumps(' · '.join(row['investors']))).replace('SOURCE',json.dumps(row['sourceUrl']))), slug
        if slug=='forest-neurotech':
            text=js("document.querySelector('[role=dialog]').innerText")
            assert 'Indexed financing' in text and '$14m committed' in text and 'not a cash-receipts total' in text
        if slug=='neuroxess': assert js("document.querySelector('[role=dialog]').innerText.includes('Angel + pre-Series A (combined)')")
        if slug=='neurobionics': assert js("document.querySelector('[role=dialog]').innerText.includes('Endovascular (clinical device)')")
        if slug in {'neuracle-technology','forest-neurotech'} and width in {1440,390}:
            js("document.querySelector('[role=dialog] h3').scrollIntoView({block:'start',behavior:'instant'})")
            capture_screenshot(path=str(QA_OUT/f'funding-{slug}-{width}.png'))
        bounds=js("""(() => {const d=document.querySelector('[role=dialog]'),r=d.getBoundingClientRect();return {left:r.left,right:r.right,scroll:d.scrollWidth,client:d.clientWidth};})()""")
        assert bounds['left']>=-1 and bounds['right']<=width+1 and bounds['scroll']<=bounds['client']+1, (slug,width,bounds)
        press_key('Escape')
        until(lambda:not js("Boolean(document.querySelector('[role=dialog]'))"), 'Escape did not close detail')
        results.append({'width':width,'route':'funding','company':slug,'roundsChecked':len(history),'bounds':bounds})
    click_expr("[...document.querySelectorAll('button')].find(el=>el.textContent==='investors')")
    until(lambda:js("document.body.innerText.includes('Most active indexed investors and funders')"), 'investor view missing')
    nti=js("""(() => {const n=[...document.querySelectorAll('div')].find(el=>el.textContent==='NeuroTechnology Investors'); if(!n)return null;return n.parentElement.parentElement.innerText;})()""")
    assert nti and '4 financing records' in nti and '$325M' in nti, nti
    assert js("[...document.querySelectorAll('div')].filter(el=>el.textContent==='Neurotechnology Investors').length") == 0
    if width in {1440,390}:
        js("[...document.querySelectorAll('div')].find(el=>el.textContent==='NeuroTechnology Investors').scrollIntoView({block:'center',behavior:'instant'})")
        capture_screenshot(path=str(QA_OUT/f'funding-investors-{width}.png'))
    results.append({'width':width,'route':'funding-investors','nti':nti})

# Return viewport to desktop without touching any pre-existing tab.
cdp('Emulation.clearDeviceMetricsOverride')
remaining_ids = [t['targetId'] for t in cdp('Target.getTargets')['targetInfos'] if t['type']=='page']
assert set(preexisting_ids).issubset(remaining_ids)
receipt={'status':'PASS','runtimeCommit':QA_SHA,'fixture':'Actual Next production-built HTML/assets on loopback; not authenticated hosted verification','buildId':(QA_BUILD/'.next/BUILD_ID').read_text().strip(),'fundingDataSha256':hashlib.sha256((QA_BUILD/'src/data/funding-index.json').read_bytes()).hexdigest(),'milestonesDataSha256':hashlib.sha256((QA_BUILD/'src/data/milestones.json').read_bytes()).hexdigest(),'cases':results,'preexistingTabsPreserved':True}
(QA_OUT/'browser-results.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':'PASS','cases':len(results),'runtimeCommit':QA_SHA,'allMilestoneLinks':len(rows),'companies':25}))
