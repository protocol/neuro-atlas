# Run inside the existing browser-harness task scope. Synthetic invalid password only.
import json, time
from pathlib import Path
from urllib.parse import urlsplit

BASE = globals().get('QA_BASE', 'http://localhost:3183')
OUT = Path(globals().get('QA_OUT', '/opt/data/tmp/atlas-launch-browser'))
assert urlsplit(BASE).hostname in ('127.0.0.1', 'localhost')
OUT.mkdir(parents=True, exist_ok=True)
report = []

def state():
    return js('''return (()=>{const stage=document.querySelector('[data-title-stage]'),form=document.querySelector('form'),r=form.getBoundingClientRect(),canvas=stage.querySelector('canvas'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let dots=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])dots++;return {width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,phase:stage.dataset.phase,ready:stage.dataset.ready,dots,units:document.querySelectorAll('.countdown > .countdown-unit').length,form:{left:r.left,right:r.right,bottom:r.bottom},hover:matchMedia('(hover:hover)').matches}})()''')

for width, height, mobile in [(1440,900,False),(390,844,True),(320,740,True)]:
    cdp('Emulation.setDeviceMetricsOverride', width=width,height=height,deviceScaleFactor=1,mobile=mobile)
    cdp('Emulation.setTouchEmulationEnabled',enabled=mobile,maxTouchPoints=1)
    cdp('Input.dispatchMouseEvent',type='mouseMoved',x=2,y=2)
    path=f'/neuro-atlas/field-velocity?view=charts&qaViewport={width}#neural-recording'
    goto_url(BASE+path)
    wait_for_load()
    assert wait_for_element('[data-title-stage][data-ready=true]',visible=True)
    s=state()
    assert s['width']==s['client']==s['scroll']==width, s
    assert s['dots']>500 and s['units']==4 and s['phase']=='atlas', s
    assert s['form']['left']>=0 and s['form']['right']<=width and s['form']['bottom']<=height, s
    assert js('return document.querySelector("[name=returnTo]").value')==path
    capture_screenshot(path=str(OUT/f'gate-{width}.png'))
    rect=js('return (()=>{const r=document.querySelector("[data-title-toggle]").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()')
    click_at_xy(rect['x'],rect['y'])
    time.sleep(1.1)
    assert state()['phase']=='countdown'
    assert js('return document.querySelector("[data-title-toggle]").getAttribute("aria-pressed")')=='true'
    capture_screenshot(path=str(OUT/f'countdown-{width}.png'))
    # Keyboard remains a real activation path, not just pointer CSS.
    js('document.querySelector("[data-title-toggle]").focus()')
    press_key('Escape')
    assert state()['phase']=='atlas'
    press_key('Enter')
    assert state()['phase']=='countdown'
    press_key('Escape')
    # Reduced-motion preference is handled live without hiding the information.
    cdp('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'reduce'}])
    assert wait_for_element('[data-title-stage][data-ready=false]',visible=True), state()
    press_key('Enter')
    bounds=js('''return (()=>{const h=document.querySelector('h1'),r=h.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(h);const t=range.getBoundingClientRect();return {text:h.textContent,left:t.left,right:t.right,stageLeft:r.left,stageRight:r.right,opacity:getComputedStyle(h).opacity}})()''')
    assert bounds['left']>=bounds['stageLeft'] and bounds['right']<=bounds['stageRight'] and bounds['opacity']=='1',bounds
    capture_screenshot(path=str(OUT/f'reduced-countdown-{width}.png'))
    cdp('Emulation.setEmulatedMedia',features=[])
    report.append({'width':width,'mobile_emulation':mobile,'checks':'title + real canvas dots + native toggle + keyboard + reduced motion + bounds + deep link', 'initial':s})

# Wrong password is submitted through the real native form; no credential is read.
goto_url(BASE+'/neuro-atlas/field-velocity?view=charts#neural-recording')
wait_for_load()
assert wait_for_element('[name=password]',visible=True)
fill_input('[name=password]', 'synthetic-invalid-launch-qa-only')
assert js('return document.activeElement===document.querySelector("[name=password]")')
press_key('Enter')
wait_for_load()
assert wait_for_element('[role=alert]',visible=True)
error=js('return document.querySelector("[role=alert]").textContent')
assert 'password' in error.lower() and 'synthetic-invalid' not in error
capture_screenshot(path=str(OUT/'wrong-password-320.png'))
report.append({'wrong_password':'native form rejected, usable retry, no echo','error':error})
# Persist the fake browser wall clock into the next document; reload alone would
# discard a one-realm override and would not prove this claim.
clock_script=cdp('Page.addScriptToEvaluateOnNewDocument',source='Date.now=()=>Date.parse("2026-11-20T15:00:00Z")')['identifier']
try:
    cdp('Page.reload')
    wait_for_load()
    assert wait_for_element('[name=password]',visible=True)
    assert js('return Date.now()===Date.parse("2026-11-20T15:00:00Z")')
    assert js('return document.querySelectorAll("[data-countdown]")[0].textContent')!='00'
    report.append({'client_clock_tamper':'future Date.now persisted into new document; still gated and countdown anchored to server time'})
finally:
    cdp('Page.removeScriptToEvaluateOnNewDocument',identifier=clock_script)
(OUT/'report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
