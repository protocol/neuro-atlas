# Run only via browser-harness in an owned window, against the isolated loopback production fixture.
import json, time, base64
from pathlib import Path
BASE='http://127.0.0.1:36184'
OUT=Path('/opt/data/tmp/atlas-blue-evidence');OUT.mkdir(parents=True,exist_ok=True)
def probe(body):return js('(() => {'+body+'})()')
def native_click(selector):
    rect=probe('const e=[...document.querySelectorAll('+json.dumps(selector)+')].find(e=>e.getBoundingClientRect().width>0 && e.getBoundingClientRect().height>0);if(!e)throw new Error("missing visible target");e.scrollIntoView({block:"center",behavior:"instant"});return e.getBoundingClientRect().toJSON();')
    click_at_xy(rect['x']+rect['width']/2,rect['y']+min(rect['height']/2,22))
def ready():
    cdp('Page.bringToFront')
    assert wait_for_element('h1',visible=True)
    for _ in range(100):
        if probe('return [...document.querySelectorAll('+json.dumps('button[aria-label^="Switch to "]')+')].some(e=>e.getBoundingClientRect().width>0);'): break
        time.sleep(.1)
    else: raise AssertionError('No visible theme control')
    js('return document.fonts.ready.then(()=>true)')
    time.sleep(.35)
def theme(value):
    if probe('return document.documentElement.classList.contains("dark");') != (value=='dark'):
        native_click('button[aria-label^="Switch to "]')
        time.sleep(.3)
    assert probe('return document.documentElement.classList.contains("dark");') == (value=='dark')
def snap(name):capture_screenshot(path=str(OUT/(name+'.png')))
report=[]
for width in [1440,390,320]:
    cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000 if width==1440 else 844,deviceScaleFactor=1,mobile=width<600)
    for mode in ['light','dark']:
        for route in ['/','/milestones','/field-velocity','/funding','/methodology']:
            goto_url(BASE+route);wait_for_load();ready();theme(mode)
            dimensions=probe('return {width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,accent:getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),h1:document.querySelector("h1").textContent};')
            assert dimensions['width']==width,dimensions
            assert dimensions['scroll']<=width,dimensions
            assert dimensions['accent']==('#115ef7' if mode=='light' else '#78a6ff'),dimensions
            if route in ['/milestones','/funding','/field-velocity']:
                assert probe('const e=document.querySelector(".bg-accent.text-accent-foreground");return e && getComputedStyle(e).color;')==('rgb(255, 255, 255)' if mode=='light' else 'rgb(12, 12, 14)')
            if route=='/':
                assert probe('return getComputedStyle(document.querySelector(".landing-explore")).backgroundColor;')=='rgb(120, 166, 255)'
                assert probe('return getComputedStyle(document.querySelector(".landing-visual [fill*=accent]")).fill;')=='rgb(120, 166, 255)'
                if width!=320:snap(f'landing-{mode}-{width}')
            if route in ['/milestones','/funding','/field-velocity'] and width in [1440,390]:
                snap(f'{route[1:]}-{mode}-{width}')
            report.append({'route':route,'theme':mode,**dimensions})
# Native keyboard focus on the blue landing CTA and exploration links.
cdp('Emulation.setDeviceMetricsOverride',width=1440,height=1000,deviceScaleFactor=1,mobile=False)
goto_url(BASE);wait_for_load();ready();theme('light')
native_click('.landing-explore');time.sleep(.2)
assert probe('return location.hash==="#explore" && document.activeElement.id==="explore";')
press_key('Tab');time.sleep(.1)
assert probe('return getComputedStyle(document.activeElement).outlineColor;')=='rgb(17, 94, 247)'
# Real point plot and actual export handler; capture the generated local PNG Blob.
goto_url(BASE+'/field-velocity#publication-output');wait_for_load();ready();theme('light')
assert wait_for_element('dialog[open]',visible=True)
assert probe('return getComputedStyle(document.querySelector("dialog [data-publication-mark][data-year]")).fill;')=='rgb(17, 94, 247)'
snap('publication-modal-light-1440')
probe('''window.__bluePng=null;document.addEventListener('click',async e=>{const a=e.target.closest('a[download]');if(!a||!a.download.startsWith('neuro-atlas-'))return;e.preventDefault();const blob=await(await fetch(a.href)).blob();const reader=new FileReader();reader.onload=()=>window.__bluePng=reader.result;reader.readAsDataURL(blob);},true);''')
native_click('dialog [data-download-chart]')
for _ in range(100):
    if probe('return typeof window.__bluePng==="string";'):break
    time.sleep(.1)
encoded=probe('return window.__bluePng;');assert encoded and encoded.startswith('data:image/png;base64,')
raw=base64.b64decode(encoded.split(',',1)[1]);assert raw[:8]==b'\x89PNG\r\n\x1a\n'
(OUT/'publication-native-export.png').write_bytes(raw)
press_key('Escape');time.sleep(.2)
assert not probe('return !!document.querySelector("dialog[open]");')
(OUT/'browser-report.json').write_text(json.dumps({'routes':report,'keyboardFocus':'PASS','publicationPlot':'PL R&D blue','nativePngExport':'PASS','modalEscape':'PASS'},indent=2)+'\n')
print(json.dumps({'routeThemeViewportChecks':len(report),'widths':[1440,390,320],'keyboard':'PASS','plot':'PASS','nativeExport':'PASS','modalEscape':'PASS'}))
