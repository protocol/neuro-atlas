"""Run inside owned browser-harness. Read-only exact-production-HTML/assets local QA.
Globals: QA_BASE, QA_ROOT, QA_OUT, QA_REVISION. No hosted/auth/touch claim.
"""
import json, time, hashlib
from pathlib import Path
from urllib.parse import urlparse
assert urlparse(QA_BASE).hostname == '127.0.0.1'
OUT=Path(QA_OUT); OUT.mkdir(parents=True,exist_ok=True)
ROOT=Path(QA_ROOT)
funding=json.loads((ROOT/'src/data/funding-index.json').read_text())
milestones=json.loads((ROOT/'src/data/milestones.json').read_text())
results=[]
def wait(probe, label, timeout=15):
    end=time.monotonic()+timeout
    while time.monotonic()<end:
        value=probe()
        if value: return value
        time.sleep(.1)
    raise AssertionError(label)
def clickexpr(expr):
    point=js("""(() => {const e=EXPR;if(!e)throw Error('Missing target');e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(!e.contains(document.elementFromPoint(x,y)))throw Error('Occluded target');return {x,y}})()""".replace('EXPR',expr))
    click_at_xy(point['x'],point['y'])
def button(label):
    return "[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==="+json.dumps(label)+")"
def navigate(path, selector):
    goto_url(QA_BASE+path);wait_for_load()
    assert wait_for_element(selector,visible=True), path
    wait(lambda:js("document.fonts.status==='loaded'"),'fonts not loaded')
def bounds():
    return js("({inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})")
def nooverflow(width):
    b=bounds();assert b['inner']==width and b['scroll']<=b['client']+1,(width,b)
    return b
for width,height in [(1440,1000),(768,1024),(390,844),(320,800)]:
    cdp('Emulation.setDeviceMetricsOverride',width=width,height=height,deviceScaleFactor=1,mobile=width<500)
    navigate('/neuro-atlas/milestones','[data-milestone-today]')
    cdp('Page.bringToFront')
    wait(lambda:js("document.getAnimations().every(a=>a.playState!=='running')"),'initial animation')
    current=js("""(() => {const s=document.querySelector('.milestone-year-scroll'),t=document.querySelector('[data-milestone-today]'),r=t.getBoundingClientRect(),v=s.getBoundingClientRect();return {left:s.scrollLeft,scroll:s.scrollWidth,client:s.clientWidth,today:r.toJSON(),viewport:v.toJSON(),label:t.getAttribute('aria-label')}})()""")
    assert current['today']['left']>=current['viewport']['left']-1 and current['today']['right']<=current['viewport']['right']+1, current
    assert current['today']['left']>=0 and current['today']['right']<=width, ('today outside actual viewport',width,current)
    current['laneLabels']=js("[...document.querySelectorAll('[data-milestone-lane-label]')].map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON()}))")
    assert len(current['laneLabels'])==3 and all(x['rect']['left']>=current['viewport']['left']-1 and x['rect']['right']<=current['viewport']['right']+1 for x in current['laneLabels']), ('lane context offscreen',width,current)
    js("document.querySelector('.milestone-year-scroll').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-60)")
    capture_screenshot(str(OUT/f'milestones-current-{width}.png'))
    clickexpr(button('Fit year'))
    wait(lambda:js("document.querySelector('.milestone-year-scroll').scrollWidth<=document.querySelector('.milestone-year-scroll').clientWidth+1"),'fit still scrolls')
    cdp('Input.dispatchMouseEvent',type='mouseMoved',x=2,y=2)
    fit=js("""(() => {const s=document.querySelector('.milestone-year-scroll'),v=s.getBoundingClientRect();return {scroll:s.scrollWidth,client:s.clientWidth,viewport:v.toJSON(),marks:[...s.querySelectorAll('a[aria-label]')].map(a=>({label:a.getAttribute('aria-label'),source:a.getAttribute('href'),rect:a.getBoundingClientRect().toJSON()}))}})()""")
    expected=[m for m in milestones if (m.get('date') or '').startswith('2026')]
    assert sorted((m['label'],m['source']) for m in fit['marks'])==sorted((m['company']+' — '+m['activity'],m['sourceUrl']) for m in expected)
    assert all(m['rect']['left']>=fit['viewport']['left']-1 and m['rect']['right']<=fit['viewport']['right']+1 and m['rect']['height']>=32 for m in fit['marks']),fit
    for i,a in enumerate(fit['marks']):
        for b in fit['marks'][i+1:]:
            x=min(a['rect']['right'],b['rect']['right'])-max(a['rect']['left'],b['rect']['left'])
            y=min(a['rect']['bottom'],b['rect']['bottom'])-max(a['rect']['top'],b['rect']['top'])
            assert not(x>1 and y>1),('overlap',width,a,b)
    capture_screenshot(str(OUT/f'milestones-fit-{width}.png'))
    results.append({'surface':'milestones','width':width,'current':current,'fit':fit,'page':nooverflow(width)})
(OUT/'milestones-native.json').write_text(json.dumps({'revision':QA_REVISION,'fixture':'Exact production-built HTML/RSC/assets, Host-restricted loopback viewer; not hosted auth or physical touch','cases':results},indent=2)+'\n')
print(json.dumps({'milestones':'PASS','cases':len(results)}))

funding_cases=[]
for width,height in [(1440,1000),(768,1024),(390,844),(320,800)]:
    cdp('Emulation.setDeviceMetricsOverride',width=width,height=height,deviceScaleFactor=1,mobile=width<500)
    navigate('/neuro-atlas/funding?qa=one&qa=two#kept','[data-funding-toolbar]')
    wait(lambda:js("!!document.querySelector('[data-funding-company-identity]')"),'funding hydrated')
    if width<500:
        clickexpr("document.querySelector('button[aria-label=\"Open navigation\"]')")
        wait(lambda:js("!!document.querySelector('dialog:modal')?.querySelector('nav[aria-label=\"Mobile navigation\"]')"),'menu not modal')
        menu=js("document.querySelector('dialog:modal').getBoundingClientRect().toJSON()")
        assert menu['left']>=0 and menu['right']<=width,menu
        capture_screenshot(str(OUT/f'mobile-menu-{width}.png'))
        boundary_stops=0
        for _ in range(9):
            press_key('Tab')
            inside=js("document.querySelector('dialog:modal').contains(document.activeElement)")
            if not inside:
                assert js("document.activeElement===document.body && !!document.querySelector('dialog:modal')"),'nonmodal page control gained focus'
                boundary_stops+=1
                press_key('Tab');assert js("document.querySelector('dialog:modal').contains(document.activeElement)"),'native modal wrap did not return'
        press_key('Escape');wait(lambda:js("!document.querySelector('dialog:modal')"),'menu escape')
        assert js("document.activeElement?.getAttribute('aria-label')==='Open navigation'"),'menu focus return'
        # Exercise a real Next Link navigation, not only direct-route loading.
        clickexpr("document.querySelector('button[aria-label=\"Open navigation\"]')")
        clickexpr("document.querySelector('dialog:modal a[href=\"/neuro-atlas/milestones\"]')")
        wait(lambda:js("location.pathname==='/neuro-atlas/milestones' && !!document.querySelector('[data-milestone-today]')"),'menu route navigation')
        assert js("!document.querySelector('dialog:modal')"),'menu remained modal on route'
        navigate('/neuro-atlas/funding?qa=one&qa=two#kept','[data-funding-toolbar]')
        clickexpr("document.querySelector('button[aria-label=\"Toggle company search\"]')")
        wait(lambda:js("document.activeElement===document.querySelector('#funding-company-search input')"),'search focus')
        fill_input('#funding-company-search input','Science Corporation')
        wait(lambda:js("document.querySelectorAll('[data-funding-company-identity]').length===1 && document.querySelector('[data-funding-company-identity]').dataset.fundingCompanyIdentity==='science-corporation'"),'search did not filter')
        press_key('Escape');assert js("document.activeElement?.getAttribute('aria-label')==='Toggle company search'")
        assert js("getComputedStyle(document.querySelector('#funding-company-search')).display==='none'")
        clickexpr("document.querySelector('button[aria-label=\"Toggle company search\"]')")
        fill_input('#funding-company-search input','')
        press_key('Escape')
        wait(lambda:js("document.querySelectorAll('[data-funding-company-identity]').length===25"),'search reset')
        clickexpr("document.querySelector('button[aria-label=\"Toggle company filters\"]')")
        clickexpr("document.querySelector('select[aria-label=\"Filter by scope\"]')")
        press_key('End');press_key('Enter')
        wait(lambda:js("document.querySelector('select[aria-label=\"Filter by scope\"]').value==='Implant-adjacent'"),'scope native selection')
        expected=sum(c['scope']=='Implant-adjacent' for c in funding['companies'])
        assert js("document.querySelectorAll('[data-funding-company-identity]').length")==expected
        clickexpr(button('Reset filters'));clickexpr(button('Done'))
    js("document.querySelector('[data-funding-toolbar]').scrollIntoView({block:'start',behavior:'instant'})")
    tool=js("document.querySelector('[data-funding-toolbar]').getBoundingClientRect().toJSON()")
    if width<500:
        assert tool['height']<=110,tool
        assert js("getComputedStyle(document.querySelector('#funding-company-search')).display==='none'")
        assert js("getComputedStyle(document.querySelector('#funding-company-filters')).display==='none'")
    capture_screenshot(str(OUT/f'funding-compact-{width}.png'))
    # Native horizontal wheel then exact sticky-lane hit test.
    pos=js("""(() => {const r=document.querySelector('[role=region][aria-label^=\"Company financing timeline\"]').getBoundingClientRect();return {x:r.x+r.width/2,y:Math.min(innerHeight-60,r.y+100)}})()""")
    cdp('Input.dispatchMouseEvent',type='mouseWheel',x=pos['x'],y=pos['y'],deltaX=10000,deltaY=0)
    wait(lambda:js("(() => {const s=document.querySelector('[role=region][aria-label^=\"Company financing timeline\"]');return s.scrollLeft>=s.scrollWidth-s.clientWidth-2})()"),'did not scroll to last years')
    pin=js("""(() => {const s=document.querySelector('[role=region][aria-label^=\"Company financing timeline\"]'),e=s.querySelector('[data-funding-company-identity]'),r=e.getBoundingClientRect(),v=s.getBoundingClientRect();return {slug:e.dataset.fundingCompanyIdentity,text:e.innerText,rect:r.toJSON(),viewport:v.toJSON(),font:getComputedStyle(e.querySelector('div>div')).fontSize,bg:getComputedStyle(e).backgroundColor,scroll:s.scrollLeft}})()""")
    assert pin['rect']['left']>=pin['viewport']['left']-1 and pin['rect']['right']<=pin['viewport']['right']+1,pin
    assert pin['bg']!='rgba(0, 0, 0, 0)',pin
    capture_screenshot(str(OUT/f'funding-pinned-{width}.png'))
    clickexpr("document.querySelector('[data-funding-company-identity]')")
    wait(lambda:js("!!document.querySelector('[role=dialog] #company-detail-title')"),'pinned name not clickable')
    company=next(c for c in funding['companies'] if c['slug']==pin['slug'])
    assert js("document.querySelector('#company-detail-title').textContent")==company['name']
    press_key('Escape');wait(lambda:js("!document.querySelector('#company-detail-title')"),'company detail did not close')
    clickexpr(button('stage'))
    wait(lambda:js("[...document.querySelectorAll('h2')].some(e=>e.textContent==='Undisclosed')"),'stage missing')
    stages=js("[...document.querySelectorAll('article h2')].map(e=>e.textContent)")
    assert stages.count('Undisclosed')==1 and 'Investment' not in stages and 'Financing' not in stages,stages
    stage_bounds=nooverflow(width)
    capture_screenshot(str(OUT/f'funding-stages-{width}.png'))
    clickexpr(button('investors'))
    wait(lambda:js("!!document.querySelector('[data-funding-portfolio]')"),'portfolio missing')
    assert js("location.search==='?qa=one&qa=two&view=investors' && location.hash==='#kept'"),'URL not preserved'
    counts=js("({total:document.querySelector('[data-portfolio-total]').textContent,matched:document.querySelector('[data-portfolio-matched]').textContent,financing:document.querySelector('[data-family-financing-count]').textContent,links:[...document.querySelectorAll('[data-portfolio-company]>a')].map(a=>({name:a.textContent.replace(/ ↗$/,''),href:a.getAttribute('href')}))})")
    assert (counts['total'],counts['matched'],counts['financing'])==('10','6','3'),counts
    assert sorted((c['name'],c['href']) for c in counts['links'])==sorted((c['name'],c['website']) for c in funding['portfolioDisclosures'][0]['companies'])
    js("document.querySelector('[data-funding-portfolio]').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-65)")
    capture_screenshot(str(OUT/f'investors-{width}.png'))
    js('history.back()')
    wait(lambda:js("!document.querySelector('[data-funding-portfolio]') && !location.search.includes('view=')"),'Back did not restore companies')
    js('history.forward()')
    wait(lambda:js("!!document.querySelector('[data-funding-portfolio]') && location.search.includes('view=investors')"),'Forward did not restore investors')
    cdp('Page.reload',ignoreCache=True);wait_for_load()
    wait(lambda:js("document.querySelector('[data-portfolio-total]')?.textContent==='10'"),'reload did not restore investors')
    investor_bounds=nooverflow(width)
    funding_cases.append({'width':width,'toolbar':tool,'pinned':pin,'stages':stages,'stageBounds':stage_bounds,'portfolio':counts,'investorBounds':investor_bounds,'historyReload':True,'mobileMenuSearchFilters':width<500})
(OUT/'funding-native.json').write_text(json.dumps({'revision':QA_REVISION,'fixture':'Exact Next production HTML/RSC/assets, Host-restricted loopback viewer; native pointer and viewport emulation, not hosted auth or physical-phone touch','cases':funding_cases},indent=2)+'\n')
cdp('Emulation.clearDeviceMetricsOverride')
print(json.dumps({'funding':'PASS','cases':len(funding_cases)}))
