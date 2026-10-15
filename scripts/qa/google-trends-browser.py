# Run through canonical browser-harness stdin in an owned BU_NAME window.
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path.cwd().resolve()
OUT = ROOT / 'docs/google-trends/qa'
OUT.mkdir(parents=True, exist_ok=True)
TEMP = ROOT / '.qa/browser'
TEMP.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('TRENDS_QA_URL', 'http://127.0.0.1:3418/neuro-atlas/field-velocity')
assert urlparse(BASE).hostname in ['127.0.0.1', 'localhost'], 'Disposable local QA only'
ORIGIN = urlparse(BASE).scheme + '://' + urlparse(BASE).netloc
SOURCE = json.loads((ROOT / 'public/data/google-trends/google-trends.json').read_text())

def value(expression):
    return js('(() => (' + expression + '))()')

def ready():
    # Reload can invalidate only the in-flight read; retry the read, never navigation/input.
    for _ in range(60):
        try:
            if value('document.readyState') == 'complete':
                return
        except RuntimeError as error:
            if 'navigated or closed' not in str(error) and 'execution context' not in str(error).lower():
                raise
        time.sleep(.1)
    raise AssertionError('Document did not finish loading')

def wait(expression, expected=True):
    for _ in range(60):
        if value(expression) == expected:
            return
        time.sleep(.1)
    raise AssertionError((expression, value(expression), expected))

def shot(name, keep=False):
    cdp('Page.bringToFront')
    capture_screenshot(path=str((OUT if keep else TEMP) / (name + '.png')))

def click(selector, scroll=True):
    if scroll:
        js('(() => {document.querySelector(' + json.dumps(selector) + ').scrollIntoView({behavior:"instant",block:"center"});})()')
    point = value('(() => {const e=document.querySelector(' + json.dumps(selector) + '),r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+Math.min(24,r.height/2);return {x,y,hit:e.contains(document.elementFromPoint(x,y))}})()')
    assert point['hit'], (selector, point)
    click_at_xy(point['x'], point['y'])

def opened():
    return value('document.querySelector("dialog[open]")?.getAttribute("aria-labelledby") ?? null')

def geometry():
    return value('({y:scrollY,width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,cards:[...document.querySelectorAll("[data-trends-card]")].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})})')

def stable(before):
    after = geometry()
    assert after['width'] == after['scrollWidth'], after
    assert abs(before['y'] - after['y']) <= 1, (before, after)
    assert all(abs(a-b) <= 1 for x,y in zip(before['cards'],after['cards']) for a,b in zip(x,y)), (before, after)

report = []
goto_url(BASE); ready(); wait_for_element('#google-trends', visible=True)
permission = js('(async()=> (await navigator.permissions.query({name:"clipboard-read"})).state)()')
cdp('Browser.setPermission', permission={'name':'clipboard-read'}, setting='granted', origin=ORIGIN)
try:
    for width in [1440, 390, 320]:
        cdp('Emulation.setDeviceMetricsOverride', width=width, height=1000, deviceScaleFactor=1, mobile=False)
        goto_url(BASE); ready(); cdp('Page.reload', ignoreCache=True); ready(); wait_for_element('#google-trends', visible=True)
        js('(() => {const e=document.querySelector("#google-trends");window.scrollTo({top:scrollY+e.getBoundingClientRect().top-95,behavior:"instant"});})()')
        rect = value('document.querySelector("#google-trends").getBoundingClientRect().toJSON()')
        assert 0 <= rect['top'] < 200, rect
        assert geometry()['width'] == geometry()['scrollWidth']
        labels = value('[...document.querySelectorAll(".gt-preview-axis,.gt-preview-dates")].map(e=>({text:e.textContent,font:parseFloat(getComputedStyle(e).fontSize),width:e.getBoundingClientRect().width}))')
        assert all(label['font'] >= 11 for label in labels), labels
        shot(f'local-overview-{width}', True)
        for group in SOURCE['groups']:
            ident = 'google-trends-' + group['id']
            target = BASE + '#' + ident
            goto_url(target); ready()
            wait('document.querySelector("dialog[open]")?.getAttribute("aria-labelledby")', ident + '-title')
            expected = [{'date':r['date'],'value':v,'term':group['terms'][i]} for r in group['rows'] if not r['partial'] for i,v in enumerate(r['values']) if v is not None]
            points = value('[...document.querySelectorAll("dialog [data-trend-point]")].map(e=>({date:e.dataset.date,value:Number(e.dataset.value),term:e.dataset.term}))')
            assert points == expected
            assert value('document.querySelectorAll("dialog [data-trends-row]").length') == 157
            assert value('document.querySelector(' + json.dumps('dialog [data-trends-row="2026-10-11"]') + ').textContent.includes("Partial · excluded")')
            assert value('document.activeElement.getAttribute("aria-label")').startswith('Close ')
            assert geometry()['width'] == geometry()['scrollWidth']
            ticks = value('[...document.querySelectorAll("dialog svg text")].map(e=>({text:e.textContent,size:parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a}))')
            assert min(t['size'] for t in ticks) >= 14, ticks
            shot(f'local-modal-{group["id"]}-{width}', True)
            press_key('Tab', modifiers=8)
            shot(f'wrap-last-{ident}-{width}')
            assert value('document.activeElement.tagName') == 'SUMMARY'
            press_key('Tab'); shot(f'wrap-first-{ident}-{width}')
            assert value('document.activeElement.getAttribute("aria-label")').startswith('Close ')
            click('dialog .pc-share button'); shot(f'copy-{ident}-{width}')
            assert js('(async()=> await navigator.clipboard.readText())()') == target
            csv = js('(async()=>{const a=document.querySelector(' + json.dumps('dialog a[download][href$=".csv"]') + '),r=await fetch(a.href);return {path:new URL(a.href).pathname,status:r.status,robots:r.headers.get("X-Robots-Tag"),body:await r.text()}})()')
            assert csv['path'] == '/neuro-atlas/data/google-trends/' + group['id'] + '.csv'
            assert csv['status'] == 200 and csv['robots'] == 'noindex, nofollow'
            assert csv['body'] == (ROOT / ('public/data/google-trends/' + group['id'] + '.csv')).read_text()
            click('dialog summary'); shot(f'values-open-{ident}-{width}')
            wait('document.querySelector("dialog details").open')
            assert value('document.querySelector("dialog .pc-table-scroll").getAttribute("tabindex")') == '0'
            if group['id'] == 'neurotech' and width == 390:
                shot('local-values-390', True)
            click('dialog summary'); shot(f'values-closed-{ident}-{width}')
            wait('document.querySelector("dialog details").open', False)
            assert value('document.querySelector("dialog .pc-table-scroll").hasAttribute("tabindex")') is False
            click('dialog .pc-modal-header button'); shot(f'closed-{ident}-{width}')
            wait('document.querySelector("dialog[open]") === null')
            trigger = '[data-trends-card="' + group['id'] + '"] .pc-trigger'
            js('(() => {const e=document.querySelector(' + json.dumps(trigger) + ');window.scrollTo({top:scrollY+e.getBoundingClientRect().top-100,behavior:"instant"});})()')
            before = geometry()
            click(trigger, False); shot(f'clicked-{ident}-{width}'); wait('document.querySelector("dialog[open]")?.getAttribute("aria-labelledby")', ident + '-title'); stable(before)
            js('history.back()'); wait('document.querySelector("dialog[open]") === null'); shot(f'back-{ident}-{width}'); stable(before)
            js('history.forward()'); wait('document.querySelector("dialog[open]")?.getAttribute("aria-labelledby")', ident + '-title'); shot(f'forward-{ident}-{width}'); stable(before)
            press_key('Escape'); wait('document.querySelector("dialog[open]") === null'); shot(f'escape-{ident}-{width}'); stable(before)
            assert value('document.activeElement === document.querySelector(' + json.dumps(trigger) + ')')
            click(trigger, False); wait('document.querySelector("dialog[open]")?.getAttribute("aria-labelledby")', ident + '-title'); shot(f'backdrop-open-{ident}-{width}')
            click_at_xy(2,2); wait('document.querySelector("dialog[open]") === null'); shot(f'backdrop-closed-{ident}-{width}'); stable(before)
            report.append({'width':width,'chart':ident,'plotted_values':len(points),'source_rows':157,'partial_excluded':True,'fresh_url':True,'clipboard_exact':True,'csv_exact_basepath_noindex':True,'focus_wrap_restore':True,'values_toggle':True,'close_escape_backdrop':True,'history_geometry_stable':True,'page_overflow':0,'preview_label_font_px':11,'minimum_expanded_tick_font_px':min(t['size'] for t in ticks)})
        goto_url(BASE+'#expectations');ready()
        goto_url(BASE+'#google-trends-neurotech');ready();wait('document.querySelector("dialog[open]")?.getAttribute("aria-labelledby")','google-trends-neurotech-title')
        shot(f'pane-recovery-{width}')
    (OUT / 'browser-report.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report,indent=2))
finally:
    cdp('Browser.setPermission', permission={'name':'clipboard-read'}, setting={'prompt':'prompt','granted':'granted','denied':'denied'}[permission], origin=ORIGIN)
