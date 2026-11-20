"""Run via browser-harness in the task-owned window; exact local build only."""
# pyright: reportUndefinedVariable=false
# Browser operations and QA_* settings are supplied by browser-harness's execution scope.
import json
from pathlib import Path
from urllib.parse import urlparse

assert urlparse(QA_BASE).hostname in ('localhost', '127.0.0.1')
OUT = Path(QA_OUT)
OUT.mkdir(parents=True, exist_ok=True)
catalog = json.loads((Path(QA_ROOT) / 'src/data/methodology-sources.json').read_text())
expected = [row for rows in catalog.values() for row in rows]
results = []


def native_click(selector):
    js('document.querySelector(' + json.dumps(selector) + ').scrollIntoView({behavior:"instant",block:"center"})')
    capture_screenshot()
    r = js('return (()=>{const e=document.querySelector(' + json.dumps(selector) + ');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+Math.min(20,r.height/2)}})()')
    click_at_xy(r['x'], r['y'])


for width, theme in [(1440, 'light'), (768, 'dark'), (390, 'light'), (320, 'dark')]:
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=1000 if width > 768 else 844, deviceScaleFactor=1, mobile=width <= 390)
    goto_url(QA_BASE + '/methodology')
    wait_for_load()
    assert wait_for_element('[data-source-more]', visible=True)
    js('localStorage.setItem("theme",' + json.dumps(theme) + ')')
    goto_url(QA_BASE + '/methodology')
    wait_for_load()
    assert wait_for_element('[data-source-more]', visible=True)
    assert wait_for_element('button[aria-label^="Switch to"]')
    cdp('Page.bringToFront')
    actual = js('return [...document.querySelectorAll("#source-directory a[data-source-link]")].map(a=>[a.getAttribute("href"),a.textContent])')
    assert actual == expected, 'Source URLs/labels/order changed'
    check = js('return {width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,more:document.querySelectorAll("[data-source-more]").length,marks:document.querySelectorAll("#source-directory a[data-source-link] [data-source-brand-id],#source-directory a[data-source-link] [data-source-placeholder]").length,contexts:document.querySelectorAll("[data-source-context]").length,multiples:document.querySelectorAll("[data-source-context-more]").length,theme:document.documentElement.classList.contains("dark")?"dark":"light"}')
    assert check['width'] == width and check['scroll'] <= width and check['client'] <= width, check
    assert check['more'] == len(catalog) and check['marks'] == len(expected)
    assert check['contexts'] > 0 and check['multiples'] > 0 and check['theme'] == theme
    js("document.getElementById('source-directory').scrollIntoView({behavior:'instant',block:'start'})")
    js('return (async()=>{await Promise.all([...document.querySelectorAll("[data-source-brands] img")].map(i=>{i.loading="eager";return i.decode()}));return true})()')
    capture_screenshot(path=str(OUT / f'directory-{width}-{theme}.png'))
    for key in catalog:
        selector = f'#sources-{key} summary'
        native_click(selector)
        opened = js('return document.getElementById(' + json.dumps('sources-' + key) + ').open')
        assert opened, f'{width}: native summary click did not open {key}'
        assert js('return document.querySelectorAll("#source-directory details[open]").length') == 1
    js("document.getElementById('sources-reference').scrollIntoView({behavior:'instant',block:'start'})")
    capture_screenshot(path=str(OUT / f'reference-{width}-{theme}.png'))
    results.append(check)

# Native link activation to the real chart, not only a correct-looking href.
cdp('Emulation.setDeviceMetricsOverride', width=1440, height=1000, deviceScaleFactor=1, mobile=False)
goto_url(QA_BASE + '/methodology')
wait_for_load()
assert wait_for_element('button[aria-label^="Switch to"]')
js("document.getElementById('sources-datasets').scrollIntoView({behavior:'instant',block:'start'})")
native_click('#sources-datasets summary')
assert js('return document.getElementById("sources-datasets").open')
js("[...document.querySelectorAll('#sources-datasets li')].find(e=>e.querySelector('[data-source-link]').textContent.startsWith('Bock mouse V1')).querySelector('[data-source-context]').setAttribute('data-qa-context-target','')")
native_click('[data-qa-context-target]')
wait_for_load()
assert wait_for_element('dialog[open]', visible=True)
context = js('return {path:location.pathname,hash:location.hash,title:document.querySelector("dialog[open]")?.innerText.slice(0,150),sources:[...document.querySelectorAll("dialog[open] a[href]")].map(a=>a.getAttribute("href"))}')
assert context['hash'] == '#selected-tissue-volume-checkpoints', context
assert any('cellimagelibrary.org' in href for href in context['sources']), context
capture_screenshot(path=str(OUT / 'native-chart-context.png'))
record_contexts = []
for kind in ('milestones', 'funding'):
    goto_url(QA_BASE + '/methodology')
    wait_for_load()
    assert wait_for_element('button[aria-label^="Switch to"]')
    target = js('return (()=>{const a=[...document.querySelectorAll("[data-source-context]")].find(a=>a.getAttribute("href").includes(' + json.dumps('/' + kind + '?source=') + ')); if(!a)return null; a.setAttribute("data-qa-record-target",""); return {category:a.closest("details").id,href:a.getAttribute("href"),source:a.closest("li").querySelector("[data-source-link]").getAttribute("href")}})()')
    assert target, f'No {kind} citation action'
    native_click('#' + target['category'] + ' summary')
    assert js('return document.getElementById(' + json.dumps(target['category']) + ').open')
    native_click('[data-qa-record-target]')
    wait_for_load()
    assert wait_for_element('#source-context', visible=True)
    state = js('return {path:location.pathname,hash:location.hash,text:document.getElementById("source-context").innerText,sources:[...document.querySelectorAll("#source-context a")].map(a=>a.getAttribute("href"))}')
    assert state['path'].endswith('/' + kind) and state['hash'] == '#source-context'
    assert target['source'] in state['sources'], state
    assert len(state['text']) > 60
    capture_screenshot(path=str(OUT / f'native-{kind}-context.png'))
    record_contexts.append({'kind':kind,'source':target['source'],'state':state})
(OUT / 'browser-results.json').write_text(json.dumps({'revision':QA_SHA,'surface':'Local exact production build; emulated viewports, no physical-phone claim','cases':results,'nativeChartContext':context,'nativeRecordContexts':record_contexts}, indent=2) + '\n')
print(json.dumps({'status':'PASS','cases':len(results),'sourceRows':len(expected),'nativeChart':context['hash'],'nativeRecordContexts':[r['kind'] for r in record_contexts]}))
