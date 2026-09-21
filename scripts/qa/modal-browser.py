# Run through browser-harness stdin in an owned BU_NAME window, never standalone.
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse
OUT = Path(os.environ.get('ATLAS_QA_OUTPUT', '.qa')).resolve()
OUT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('ATLAS_QA_URL', 'http://127.0.0.1:3397/field-velocity')
parsed = urlparse(BASE)
assert parsed.hostname in ('127.0.0.1', 'localhost'), 'Local QA only'
BASE = parsed._replace(query='review=modal-qa', fragment='').geturl()
ORIGIN = parsed.scheme + '://' + parsed.netloc
CHARTS = {'simultaneously-recorded-neurons': 7, 'tissue-mapped': 7, 'neural-recording-hours': 11, 'idea_vintage': 27, 'latency_compression': 4}
def val(expr): return js('(() => ' + expr + ')()')
def snap(name):
    time.sleep(.15)
    capture_screenshot(path=str(OUT / (name + '.png')))
def click_selector(selector, scroll=False):
    if scroll:
        js('(() => {const e=document.querySelector(' + json.dumps(selector) + ');window.scrollTo({top:scrollY+e.getBoundingClientRect().top-100,behavior:"instant"});})()')
    rect = val('document.querySelector(' + json.dumps(selector) + ').getBoundingClientRect().toJSON()')
    click_at_xy(rect['x'] + rect['width']/2, rect['y'] + min(28,rect['height']/2))
def opened(): return val('document.querySelector("dialog[open]")?.getAttribute("aria-labelledby") ?? null')
def geometry(): return val('({y:scrollY, cards:[...document.querySelectorAll("[data-performance-card]")].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})})')
def stable(before):
    after = geometry()
    assert abs(before['y']-after['y']) <= 1, (before,after)
    for a,b in zip(before['cards'],after['cards']):
        assert all(abs(x-y)<=1 for x,y in zip(a,b)), (a,b)
def no_overflow(): assert val('document.documentElement.scrollWidth<=document.documentElement.clientWidth')
report=[]
goto_url(BASE); wait_for_load()
permission=js('(async () => (await navigator.permissions.query({name:"clipboard-read"})).state)()')
cdp('Browser.setPermission',permission={'name':'clipboard-read'},setting='granted',origin=ORIGIN)
try:
    for width in [1440,390,320]:
        cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=False)
        for ident,count in CHARTS.items():
            expected = BASE + '#' + ident
            goto_url(expected); wait_for_load(); cdp("Page.reload", ignoreCache=True); wait_for_load()
            for attempt in range(50):
                if opened() == ident + '-title': break
                time.sleep(.1)
            snap(f'modal-fresh-{ident}-{width}')
            assert opened() == ident + '-title'
            assert val('document.querySelectorAll("dialog [data-source-observation]").length') == count
            assert val('document.querySelectorAll("[data-curve-point]").length') == count
            assert val('document.body.style.overflow') == 'hidden'
            assert val('document.activeElement.getAttribute("aria-label")').startswith('Close ')
            press_key('Tab',modifiers=8); snap(f'modal-focus-last-{ident}-{width}')
            assert val('document.querySelector("dialog").contains(document.activeElement)')
            press_key('Tab'); snap(f'modal-focus-first-{ident}-{width}')
            assert val('document.activeElement.getAttribute("aria-label")').startswith('Close ')
            click_selector('dialog .pc-share button'); snap(f'modal-copy-{ident}-{width}')
            assert js('(async () => await navigator.clipboard.readText())()') == expected
            assert val('document.querySelector("dialog .pc-share a").href') == expected
            click_selector('dialog .pc-modal-header button'); snap(f'modal-fresh-closed-{ident}-{width}')
            assert opened() is None
            trigger = '[data-performance-card="' + ident + '"] .pc-trigger'
            # Scroll to the compact card BEFORE measuring, never during modal navigation.
            js('(() => {const e=document.querySelector(' + json.dumps(trigger) + ');window.scrollTo({top:scrollY+e.getBoundingClientRect().top-100,behavior:"instant"});})()')
            before = geometry()
            click_selector(trigger); snap(f'modal-click-{ident}-{width}')
            assert opened() == ident + '-title'; stable(before); no_overflow()
            js('(() => history.back())()'); snap(f'modal-back-{ident}-{width}')
            assert opened() is None; stable(before)
            js('(() => history.forward())()'); snap(f'modal-forward-{ident}-{width}')
            assert opened() == ident + '-title'; stable(before)
            press_key('Escape'); snap(f'modal-escape-{ident}-{width}')
            assert opened() is None; stable(before)
            assert val('document.activeElement===document.querySelector(' + json.dumps(trigger) + ')')
            click_selector(trigger); snap(f'modal-backdrop-open-{ident}-{width}')
            click_at_xy(2,2); snap(f'modal-backdrop-closed-{ident}-{width}')
            assert opened() is None; stable(before); no_overflow()
            report.append({'width':width,'chart':ident,'source_points':count,'fresh_url':True,'clipboard':True,'focus_wrap_restore':True,'close_escape_backdrop':True,'back_forward_no_layout_or_scroll_shift':True})
        goto_url(BASE+'#expectations');wait_for_load();snap(f'modal-expectations-{width}')
        goto_url(BASE+'#idea_vintage');wait_for_load();snap(f'modal-expectations-recovery-{width}')
        assert opened()=='idea_vintage-title'
    # Graph-to-graph history across separately subscribed card groups.
    cdp('Emulation.setDeviceMetricsOverride',width=1440,height=1000,deviceScaleFactor=1,mobile=False)
    goto_url(BASE+'#performance_curves');wait_for_load()
    for ident in ['idea_vintage','tissue-mapped','latency_compression']:
        goto_url(BASE+'#'+ident);wait_for_load();snap('modal-history-'+ident)
        assert opened()==ident+'-title'
        assert val('document.body.style.overflow')=='hidden'
    for ident in ['tissue-mapped','idea_vintage']:
        js('(() => history.back())()');snap('modal-history-back-'+ident)
        assert opened()==ident+'-title'
        assert val('document.body.style.overflow')=='hidden'
    for ident in ['tissue-mapped','latency_compression']:
        js('(() => history.forward())()');snap('modal-history-forward-'+ident)
        assert opened()==ident+'-title'
        assert val('document.body.style.overflow')=='hidden'
    goto_url(BASE+'#expectations');wait_for_load();snap('modal-history-expectations')
    goto_url(BASE+'#tissue-mapped');wait_for_load();snap('modal-history-metrics')
    js('(() => history.back())()');snap('modal-back-expectations')
    assert opened() is None
    assert val('document.querySelector("button[aria-current=true]").textContent')=='Expectations'
    js('(() => history.forward())()');snap('modal-forward-metrics')
    assert opened()=='tissue-mapped-title'
    # Exact fixed-axis filtering and keyboard priority over stationary hover.
    coords=val('[...document.querySelectorAll("dialog [data-curve-point]")].map(p=>[p.getAttribute("data-curve-point"),p.getAttribute("cx"),p.getAttribute("cy")])')
    click_selector('dialog select');press_key('ArrowDown');press_key('Enter');snap('modal-filtered-track')
    filtered=val('[...document.querySelectorAll("dialog [data-curve-point]")].map(p=>[p.getAttribute("data-curve-point"),p.getAttribute("cx"),p.getAttribute("cy")])')
    assert filtered and len(filtered)<len(coords) and all(p in coords for p in filtered)
    click_selector('dialog select');press_key('Home');press_key('Enter');snap('modal-all-tracks')
    js('(() => {const p=document.querySelectorAll("dialog [data-curve-point]");p[0].dispatchEvent(new MouseEvent("mouseover",{bubbles:true}));p[1].focus();})()');snap('modal-mixed-focus')
    assert val('document.querySelector("dialog .pc-point-readout").textContent===document.querySelectorAll("dialog [data-curve-point]")[1].getAttribute("aria-label")')
    js('(() => document.querySelectorAll("dialog [data-curve-point]")[1].blur())()');snap('modal-hover-restored')
    assert val('document.querySelector("dialog .pc-point-readout").textContent===document.querySelectorAll("dialog [data-curve-point]")[0].getAttribute("aria-label")')
    cdp('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'reduce'}])
    previous_theme=val('document.documentElement.className')
    js('(() => document.documentElement.classList.add("dark"))()');snap('modal-dark-reduced-motion')
    assert val('matchMedia("(prefers-reduced-motion: reduce)").matches');no_overflow()
    press_key('Escape');snap('modal-dark-closed')
    js('(() => document.documentElement.className='+json.dumps(previous_theme)+')()')
    cdp('Emulation.setEmulatedMedia',features=[])
    # Existing implemented plates remain reachable; no duplicate roadmap cards.
    goto_url(BASE);wait_for_load();snap('modal-overview-final')
    assert not val('document.body.innerText.includes("Open Neural Data Hours")')
    assert not val('document.body.innerText.includes("The Implant Ledger")')
    for route in ['milestones','funding','ecosystem']:
        goto_url(ORIGIN+'/'+route);wait_for_load();snap('modal-regression-'+route)
        assert val('document.querySelector("h1")?.textContent')
        no_overflow()
    (OUT/'modal-regression-report.json').write_text(json.dumps({'graph_history':True,'expectations_back_forward':True,'fixed_axis_filter':True,'mixed_input':True,'dark_reduced_motion':True,'routes':['milestones','funding','ecosystem']},indent=2)+'\n')
    (OUT/'modal-browser-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
finally:
    cdp('Browser.setPermission',permission={'name':'clipboard-read'},setting=permission,origin=ORIGIN)
