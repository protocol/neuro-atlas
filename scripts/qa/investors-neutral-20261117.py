"""Run in an owned browser-harness session with QA_BASE/QA_ROOT/QA_OUT/QA_REVISION.
Exact production HTML/assets on loopback only; no hosted-auth/physical-touch claim.
"""
import json, time
from pathlib import Path
from urllib.parse import urlparse
assert urlparse(QA_BASE).hostname == '127.0.0.1'
OUT = Path(QA_OUT); OUT.mkdir(parents=True, exist_ok=True)
data = json.loads((Path(QA_ROOT) / 'src/data/funding-index.json').read_text())
expected = data['investors'][:24]
family_name = 'Protocol Labs / PLC Neurotech'

def wait(probe, label, timeout=15):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        result = probe()
        if result: return result
        time.sleep(.1)
    raise AssertionError(label)

def click_button(label):
    point = js("""(() => {const e=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===LABEL);if(!e)throw Error('Missing button');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(!e.contains(document.elementFromPoint(x,y)))throw Error('Covered button');return {x,y}})()""".replace('LABEL', json.dumps(label)))
    click_at_xy(point['x'], point['y'])

cases = []
for width, height in [(1440,1000), (768,1024), (390,844), (320,800)]:
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=width<500)
    goto_url(QA_BASE + '/neuro-atlas/funding?view=investors&qa=a&qa=b#kept'); wait_for_load()
    assert wait_for_element('[data-indexed-investor]', visible=True)
    wait(lambda: js("document.querySelectorAll('[data-indexed-investor]').length===24 && document.fonts.status==='loaded'"), 'investors not hydrated')
    cdp('Page.bringToFront')
    assert js("!document.querySelector('[data-funding-portfolio]') && !document.querySelector('a[href^=\"#funding-portfolio\"]')"), 'PL showcase remains'
    assert js("[...document.querySelectorAll('h2')][0]?.textContent==='Most active indexed investors and funders'"), 'ranking does not lead the lens'
    rows = js("[...document.querySelectorAll('[data-indexed-investor]')].map(e=>({name:e.dataset.indexedInvestor,text:e.innerText,classes:e.className,rank:e.firstElementChild.textContent}))")
    assert [row['name'] for row in rows] == [row['name'] for row in expected], 'ranking/order diverges from source model'
    assert len({row['classes'] for row in rows}) == 1, 'investor-specific styling'
    for rank, (actual, model) in enumerate(zip(rows, expected), start=1):
        assert actual['rank'] == str(rank).zfill(2)
        label = f"{model['roundCount']} financing " + ('record' if model['roundCount']==1 else 'records')
        assert label in actual['text'], (actual, model)
    family = next(row for row in rows if row['name']==family_name)
    assert '4 financing records' in family['text'], family
    geometry = js("({inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})")
    assert geometry['inner']==width and geometry['scroll']<=geometry['client']+1, geometry
    js("[...document.querySelectorAll('h2')].find(e=>e.textContent==='Most active indexed investors and funders').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-85)")
    capture_screenshot(str(OUT/f'investors-neutral-{width}.png'))
    js("document.querySelector('[data-indexed-investor=\"Protocol Labs / PLC Neurotech\"]').scrollIntoView({block:'center',behavior:'instant'})")
    rect = js("document.querySelector('[data-indexed-investor=\"Protocol Labs / PLC Neurotech\"]').getBoundingClientRect().toJSON()")
    assert rect['left']>=0 and rect['right']<=width and rect['top']>=0 and rect['bottom']<=height, rect
    capture_screenshot(str(OUT/f'investors-family-row-{width}.png'))
    click_button('companies')
    wait(lambda: js("!document.querySelector('[data-indexed-investor]')"), 'companies lens not restored')
    assert js("!new URLSearchParams(location.search).has('view') && JSON.stringify(new URLSearchParams(location.search).getAll('qa'))==='[\"a\",\"b\"]' && location.hash==='#kept'"), 'unrelated URL state lost'
    js('history.back()')
    wait(lambda: js("document.querySelectorAll('[data-indexed-investor]').length===24 && new URLSearchParams(location.search).get('view')==='investors'"), 'Back failed')
    js('history.forward()')
    wait(lambda: js("!document.querySelector('[data-indexed-investor]') && !new URLSearchParams(location.search).has('view')"), 'Forward failed')
    click_button('investors')
    cdp('Page.reload', ignoreCache=True); wait_for_load()
    wait(lambda: js("document.querySelectorAll('[data-indexed-investor]').length===24"), 'reload failed')
    assert js("!document.querySelector('[data-funding-portfolio]')"), 'showcase returned on reload'
    click_button('companies')
    wait(lambda: js("!!document.querySelector('[data-funding-company-identity=\"merge-labs\"]')"), 'Merge company row absent')
    point = js("""(() => {const e=document.querySelector('[data-funding-company-identity="merge-labs"]');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()""")
    click_at_xy(point['x'], point['y'])
    wait(lambda: js("document.querySelector('#company-detail-title')?.textContent==='Merge Labs'"), 'wrong company detail')
    evidence = js("""(() => {const d=document.querySelector('[role=dialog]'),a=d.querySelector('article');return {text:a.innerText,links:[...a.querySelectorAll('a')].map(e=>({text:e.textContent,href:e.getAttribute('href')})),rect:d.getBoundingClientRect().toJSON()}})()""")
    merge = next(row for row in data['rounds'] if row['companySlug']=='merge-labs')
    assert all(name in evidence['text'] for name in merge['investors']), evidence
    assert any(link['href']==merge['sourceUrl'] for link in evidence['links'])
    assert any(link['href']==merge['investorEvidence'][0]['sourceUrl'] and link['text']=='PL Capital participation source ↗' for link in evidence['links']), evidence
    assert evidence['rect']['left']>=0 and evidence['rect']['right']<=width, evidence['rect']
    js("document.querySelector('[role=dialog] article').scrollIntoView({block:'start',behavior:'instant'})")
    capture_screenshot(str(OUT/f'merge-participation-source-{width}.png'))
    press_key('Escape')
    wait(lambda: js("!document.querySelector('[role=dialog]')"), 'company detail did not dismiss')
    cases.append({'width':width,'height':height,'rows':rows,'family':family,'familyBounds':rect,'document':geometry,'historyReload':True,'mergeEvidence':evidence})
cdp('Emulation.clearDeviceMetricsOverride')
(OUT/'investors-native.json').write_text(json.dumps({'revision':QA_REVISION,'fixture':'Exact production-built HTML/assets, Host-restricted loopback; native pointer and viewport emulation, not hosted authentication or physical-phone touch','cases':cases}, indent=2)+'\n')
print(json.dumps({'investors':'PASS','cases':len(cases)}))
