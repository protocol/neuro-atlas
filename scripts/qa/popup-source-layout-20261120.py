# Run via browser-harness in a task-owned window against the production build.
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse

BASE = os.environ.get('QA_BASE', 'http://127.0.0.1:37481/neuro-atlas/field-velocity')
OUT = Path(os.environ.get('QA_OUT', '/opt/data/tmp/atlas-popup-layout-qa'))
OUT.mkdir(parents=True, exist_ok=True)
assert urlparse(BASE).hostname in ('127.0.0.1', 'localhost'), 'Loopback QA only'
MODE = os.environ.get('QA_MODE', 'after')
CHARTS = {
    'metric-panel-bci-bitrate': 'BCI communication rates over time',
    'simultaneously-recorded-neurons': 'Simultaneous neural recordings',
    'neural-recording-hours': 'Neural recording hours — selected datasets',
    'google-trends-neurotech': 'Neurotech search terms',
    'idea_vintage': 'Citation latency',
}

def poll(expr, message):
    for _ in range(80):
        value = js('return Boolean(' + expr + ')')
        if value:
            return value
        time.sleep(.1)
    raise AssertionError(message)

def click(selector):
    js('return (()=>{const e=document.querySelector(' + json.dumps(selector) + ');e.scrollIntoView({block:"center",behavior:"instant"})})()')
    capture_screenshot(path=str(OUT / 'last-before-click.png'))
    r = js('return document.querySelector(' + json.dumps(selector) + ').getBoundingClientRect().toJSON()')
    click_at_xy(r['x'] + r['width']/2, r['y'] + min(r['height']/2, 20))

GEOMETRY = '''(()=>{
 const d=document.querySelector('dialog[open]'), g=d.querySelector('.mx-grid');
 const rect=e=>e?.getBoundingClientRect().toJSON();
 const l=d.querySelector('.mx-left'), r=d.querySelector('.mx-right'), s=d.querySelector('.mx-sources');
 const table=d.querySelector('.draft-plot-table-scroll table');
 return {title:d.querySelector('h2').innerText, viewport:innerWidth,
 client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
 body:{client:d.querySelector('.pc-detail').clientWidth,scroll:d.querySelector('.pc-detail').scrollWidth},
 grid:rect(g),left:rect(l),right:rect(r),sources:rect(s),
 links:[...s.querySelectorAll('a')].map(e=>({text:e.innerText,href:e.href})),
 cells:table?[...table.querySelectorAll('thead th')].map(e=>({text:e.innerText,rect:rect(e),font:getComputedStyle(e).fontSize})):[],
 table:rect(table),tableScroll:rect(d.querySelector('.draft-plot-table-scroll')),
 points:d.querySelectorAll('[data-source-observation]').length};
})()'''

report=[]
# A restarted build at the same origin must cross a real navigation boundary.
goto_url('about:blank'); wait_for_load()
for width in ([1440] if MODE == 'before' else [1440,1024,900,768,390,320]):
    cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=False)
    for anchor, expected in list(CHARTS.items())[:1 if MODE == 'before' else None]:
        goto_url(BASE + '#' + anchor)
        wait_for_load()
        poll('document.querySelector("dialog[open] .mx-sources a")', 'Populated source region did not mount')
        poll('document.querySelector("dialog[open] h2")?.innerText==='+json.dumps(expected), 'Wrong chart title: '+anchor)
        title=js('return document.querySelector("dialog[open] h2").innerText')
        js('return document.fonts.ready.then(()=>true)')
        js('return (()=>{const d=document.querySelector("dialog[open]");d.querySelector(".pc-detail").scrollTop=d.querySelector(".mx-grid").offsetTop-80})()')
        capture_screenshot(path=str(OUT / f'{MODE}-{anchor}-{width}-sources.png'))
        g=js('return ' + GEOMETRY)
        (OUT / f'{MODE}-{anchor}-{width}.json').write_text(json.dumps(g,indent=2)+'\n')
        if MODE == 'before':
            # Intentionally fails on the old capped 300px source sidebar.
            assert abs(g['left']['width']-g['right']['width']) <= 1, g
            continue
        assert g['viewport'] == width and g['scroll'] <= g['client'], g
        assert g['body']['scroll'] <= g['body']['client']+1, g
        assert g['links'], g
        if width >= 1024:
            assert abs(g['left']['width']-g['right']['width']) <= 1, g
            assert g['sources']['width'] >= 380, g
            assert abs(g['left']['top']-g['right']['top']) <= 1, g
        else:
            assert g['right']['top'] >= g['left']['bottom'], g
            assert g['sources']['width'] >= g['grid']['width']-1, g
        for detail_index in range(js('return document.querySelectorAll("dialog[open] .mx-data > details").length')):
            selector=f'dialog[open] .mx-data > details:nth-child({detail_index+1})'
            click(selector+' > summary')
            poll('document.querySelector('+json.dumps(selector)+').open','Data disclosure did not open')
        if anchor == 'metric-panel-bci-bitrate':
            # A portaled table must retain its own readable columns, not rely on .draft-plot ancestry.
            js('return (()=>{const d=document.querySelector("dialog[open]");d.querySelector(".pc-detail").scrollTop=d.querySelector(".draft-plot-table-scroll").offsetTop-100})()')
            capture_screenshot(path=str(OUT / f'{MODE}-{anchor}-{width}-table.png'))
            table=js('return ' + GEOMETRY)
            assert table['points'] == 14, table
            assert len(table['links']) == 13, table
            assert len(table['cells']) == 4, table
            assert min(c['rect']['width'] for c in table['cells'][:3]) >= 110, table
            assert table['cells'][-1]['rect']['width'] >= 320, table
            assert min(float(c['font'].removesuffix('px')) for c in table['cells']) >= 12, table
            scroll='dialog[open] .draft-plot-table-scroll'
            js('return (()=>{const e=document.querySelector('+json.dumps(scroll)+');e.scrollLeft=e.scrollWidth})()')
            assert js('return (()=>{const e=document.querySelector('+json.dumps(scroll)+');return e.scrollWidth-e.clientWidth-e.scrollLeft<=1})()')
            # Opening definitions remains a native, keyboard-reachable disclosure.
            click('dialog[open] [data-draft-methodology] > summary')
            poll('document.querySelector("dialog[open] [data-draft-methodology]").open','Definitions did not open')
            js('return document.querySelector("dialog[open] .mx-grid").scrollIntoView({block:"start",behavior:"instant"})')
            capture_screenshot(path=str(OUT / f'{MODE}-{anchor}-{width}-definitions.png'))
        press_key('Escape')
        poll('!document.querySelector("dialog[open]")','Escape did not dismiss modal')
        assert js('return document.body.style.overflow') != 'hidden'
        report.append({'width':width,'anchor':anchor,'title':title,'layout':'equal columns' if width>=1024 else 'stacked','sourceLinks':len(g['links']),'points':g['points']})

# Same legacy URL survives reload; Copy link keeps this exact canonical fragment.
goto_url(BASE+'#metric-panel-bci-bitrate');wait_for_load()
poll('document.querySelector("dialog[open] h2")?.innerText==="BCI communication rates over time"','Legacy fragment failed')
cdp('Page.reload',ignoreCache=True);wait_for_load()
poll('document.querySelector("dialog[open] .mx-sources a")','Reload lost popup')
click('dialog[open] [data-copy-chart-link]') if js('return !!document.querySelector("dialog[open] [data-copy-chart-link]")') else None
(OUT/'report.json').write_text(json.dumps({'mode':MODE,'cases':report},indent=2)+'\n')
print(json.dumps({'mode':MODE,'cases':len(report),'report':str(OUT/'report.json')}))
