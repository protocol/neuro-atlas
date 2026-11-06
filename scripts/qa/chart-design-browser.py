# Run via browser-harness stdin in an owned window. Never standalone.
# ATLAS_QA_ORIGIN must be the task-owned, loopback-only app fixture.
import json, os, time
from pathlib import Path
from urllib.parse import urlparse
BASE = os.environ.get('ATLAS_QA_ORIGIN', 'http://127.0.0.1:35961')
assert urlparse(BASE).hostname in ('localhost', '127.0.0.1'), 'Loopback QA only'
OUT = Path(os.environ.get('ATLAS_QA_OUTPUT', '/opt/data/tmp/atlas-chart-design-evidence'))
OUT.mkdir(parents=True, exist_ok=True)
MODE = os.environ.get('ATLAS_QA_MODE', 'after')
CATEGORY = '[data-metrics-category="Human interfaces and recordings"]'
DRAFT = CATEGORY + ' article:nth-of-type(2)'
RECORDING = '[data-performance-card="simultaneously-recorded-neurons"]'
def probe(expr): return js('(() => {' + expr + '})()')
def click(selector):
    rect = probe('const e=document.querySelector(' + json.dumps(selector) + '); e.scrollIntoView({block:"center",behavior:"instant"}); return e.getBoundingClientRect().toJSON();')
    click_at_xy(rect['x'] + rect['width']/2, rect['y'] + min(rect['height']/2, 24))
def snap(name): return capture_screenshot(path=str(OUT / f'{MODE}-{name}.png'))
def settle():
    # Font hydration and equalized card sizing must finish before measuring/capturing.
    js('return document.fonts.ready.then(()=>true)')
    previous=None; stable=0
    for _ in range(80):
        current=probe('return {height:document.documentElement.scrollHeight, cards:[...document.querySelectorAll('+json.dumps(CATEGORY)+'+" article")].map(e=>Math.round(e.getBoundingClientRect().height))};')
        stable=stable+1 if current==previous else 0
        if stable>=5: return
        previous=current;time.sleep(.1)
    raise AssertionError('Chart layout did not settle')
report=[]
for width in [1440,390,320]:
    cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=width<600)
    goto_url(BASE + '/field-velocity');wait_for_load()
    assert wait_for_element(RECORDING, visible=True)
    settle()
    probe('const c=document.querySelector(' + json.dumps(CATEGORY) + ');window.scrollTo({top:scrollY+c.getBoundingClientRect().top-90,behavior:"instant"});const r=c.querySelector("[data-metric-rail]");r.scrollLeft=r.scrollWidth-r.clientWidth;')
    settle()
    snap(f'comparison-{width}')
    values=probe('''const c=document.querySelector(''' + json.dumps(CATEGORY) + ''');return [...c.querySelectorAll('article')].map(e=>({title:e.querySelector('figcaption,.pc-card-title')?.textContent, height:e.getBoundingClientRect().height, marks:[...e.querySelectorAll('svg circle[data-source-observation],.pc-preview svg circle')].filter(p=>p.getAttribute('fill')!=='none').map(p=>({r:Number(p.getAttribute('r'))*Math.hypot(p.getScreenCTM().a,p.getScreenCTM().b),stroke:parseFloat(getComputedStyle(p).strokeWidth),vectorEffect:getComputedStyle(p).vectorEffect,x:p.getAttribute('cx'),y:p.getAttribute('cy')}))}));''')
    assert len(values)==3,values
    radii=[p['r'] for v in values for p in v['marks']]
    assert radii and all(r>0 for r in radii)
    assert probe('return innerWidth;')==width
    assert probe('return document.documentElement.clientWidth<=innerWidth && document.documentElement.clientWidth===document.documentElement.scrollWidth;')
    if MODE!='before':
        assert max(abs(r-4) for r in radii)<.12,values
        assert all(abs(p['stroke']-1.5)<.01 and p['vectorEffect']=='non-scaling-stroke' for v in values for p in v['marks']),values
        assert max(v['height'] for v in values)-min(v['height'] for v in values)<=1,values
    # Open the actual recording card using native input. A fresh detail stays empty.
    click(RECORDING+' .pc-trigger');settle();snap(f'recording-open-{width}')
    assert probe('return document.querySelector("dialog[open]")?.getAttribute("aria-labelledby") === "simultaneously-recorded-neurons-title";')
    assert probe('return document.querySelector("dialog .pc-point-readout").textContent === "";')
    detail=probe('return [...document.querySelectorAll("dialog [data-curve-point]")].map(p=>({id:p.getAttribute("data-curve-point"),r:Number(p.getAttribute("r"))*Math.hypot(p.getScreenCTM().a,p.getScreenCTM().b),value:p.getAttribute("data-value")}));')
    if MODE!='before': assert all(abs(p['r']-5)<.12 for p in detail),detail
    assert len(detail)==3
    click('dialog [data-curve-point]');settle();snap(f'recording-inspect-{width}')
    assert probe('return document.querySelector("dialog .pc-point-readout").textContent.length>0;')
    if MODE!='before':
        assert abs(probe('const p=document.querySelector("dialog [data-curve-point]");return Number(p.getAttribute("r"))*Math.hypot(p.getScreenCTM().a,p.getScreenCTM().b);')-7)<.12
    # Separate channels and optical views, retained source counts and no extrapolation.
    for label, count in [('Human implant channels',2),('Optical cellular signals',1)]:
        options=probe('return [...document.querySelector("dialog [data-recording-view-select]").options].map(o=>({text:o.text,value:o.value}));')
        item=next(o for o in options if label.lower() in o['text'].lower())
        probe('const s=document.querySelector("dialog [data-recording-view-select]");s.value='+json.dumps(item['value'])+';s.dispatchEvent(new Event("change",{bubbles:true}));')
        settle()
        assert probe('return document.querySelectorAll("dialog [data-curve-point]").length;')==count
        assert probe('return document.querySelector("dialog .pc-point-readout").textContent==="";')
        assert not probe('return !!document.querySelector("dialog [data-extrapolation-line],dialog [role=switch]");')
    snap(f'optical-{width}')
    press_key('Escape');settle()
    assert not probe('return !!document.querySelector("dialog[open]");')
    assert probe('return document.activeElement===document.querySelector('+json.dumps(RECORDING+' .pc-trigger')+');')
    report.append({'width':width,'preview_mark_radii':radii,'recording_detail':detail,'initial_empty_readout':True,'native_inspection':True,'measurement_views':True,'escape_focus_return':True,'no_page_overflow':True})
# Exercise the real Download PNG handler without changing Chrome's shared download directory.
# The generated local Blob is captured at the final anchor click and saved as exact bytes.
if MODE != 'before':
    import base64
    cdp('Emulation.setDeviceMetricsOverride',width=1440,height=1000,deviceScaleFactor=1,mobile=False)
    goto_url(BASE+'/field-velocity?recordingView=electrical#simultaneously-recorded-neurons');wait_for_load();settle()
    probe('''window.__chartQaPng=null;document.addEventListener('click',async e=>{const a=e.target.closest('a[download]');if(!a || !a.download.startsWith('neuro-atlas-'))return;e.preventDefault();const blob=await (await fetch(a.href)).blob();const reader=new FileReader();reader.onload=()=>{window.__chartQaPng=reader.result};reader.readAsDataURL(blob);},true);''')
    click('dialog [data-download-chart]')
    for _ in range(100):
        if probe('return typeof window.__chartQaPng === "string";'): break
        time.sleep(.1)
    png=probe('return window.__chartQaPng;')
    assert png and png.startswith('data:image/png;base64,')
    raw=base64.b64decode(png.split(',',1)[1]);assert raw[:8]==b'\x89PNG\r\n\x1a\n'
    (OUT/'after-recording-native-export.png').write_bytes(raw)
    assert probe('return document.querySelector("dialog [data-chart-share] [role=status]").textContent.includes("PNG downloaded");')
    snap('export-success')
    press_key('Escape');settle()
(OUT/f'{MODE}-browser-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
