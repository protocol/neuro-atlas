# Additional native icon-button/outline and dark-mode checks on the real loopback app.
from pathlib import Path
import os
root=Path(os.environ['FEEDBACK_QA_ROOT'])
exec((root/'scripts/qa/feedback-browser.py').read_text().split('results=[]')[0])
cdp('Emulation.setDeviceMetricsOverride',width=1440,height=1000,deviceScaleFactor=1,mobile=False)
goto_url(base);wait_for_load();cdp('Page.bringToFront');wait('!!document.querySelector(".atlas-feedback-launch")')
# The fixture alone owns this origin's theme preference; restore its light default at the end.
if js('document.documentElement.classList.contains("dark")'):
 click('button[aria-label="Switch to light mode"]')
wait('!document.documentElement.classList.contains("dark")')
theme='button[aria-label="Switch to dark mode"]'
js(f'(()=>{{window.__extraPickEvents=[];const e=document.querySelector({json.dumps(theme)});["pointerdown","pointerup","mousedown","mouseup","click"].forEach(t=>e.addEventListener(t,()=>window.__extraPickEvents.push(t)))}})()')
click('.atlas-feedback-launch');wait('!!document.querySelector("[data-feedback-selection]:popover-open")')
p=point(theme+' svg');cdp('Input.dispatchMouseEvent',type='mouseMoved',x=p['x'],y=p['y']);wait('!!document.querySelector("[data-feedback-outline]")')
measure=js(f'(()=>{{const a=document.querySelector("[data-feedback-outline]").getBoundingClientRect(),b=document.querySelector({json.dumps(theme)}).getBoundingClientRect();return {{deltaLeft:Math.abs(a.left-b.left),deltaTop:Math.abs(a.top-b.top),deltaWidth:Math.abs(a.width-b.width),deltaHeight:Math.abs(a.height-b.height)}}}})()')
assert all(v<=1 for v in measure.values()),measure
capture_screenshot(path=str(out/'hover-button-1440.png'))
click_at_xy(p['x'],p['y']);wait('!!document.querySelector("[data-feedback-composer][open]")')
assert js('window.__extraPickEvents')==[]
assert not js('document.documentElement.classList.contains("dark")')
capture_screenshot(path=str(out/'button-composer-1440.png'))
press_key('Escape');wait('!document.querySelector("[data-feedback-composer]")')
click('button[aria-label="Switch to dark mode"]');wait('document.documentElement.classList.contains("dark")')
click('.atlas-feedback-launch')
# Reopening a pinned draft intentionally resumes its field, rather than selecting a new target.
if js('!!document.querySelector("[data-feedback-composer][open]")'):
 bytext('Select element')
wait('!!document.querySelector("[data-feedback-selection]:popover-open")')
p=point('h1');cdp('Input.dispatchMouseEvent',type='mouseMoved',x=p['x'],y=p['y']);click_at_xy(p['x'],p['y']);wait('!!document.querySelector("[data-feedback-composer][open]")')
colors=js('''(()=>{const d=document.querySelector('[data-feedback-composer]'),i=d.querySelector('textarea'),a=getComputedStyle(d),b=getComputedStyle(i);const lum=s=>{const c=s.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722};const x=lum(a.backgroundColor),y=lum(b.color);return {background:a.backgroundColor,input:b.color,contrast:(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}})()''')
capture_screenshot(path=str(out/'dark-composer-1440.png'))
press_key('Escape');wait('!document.querySelector("[data-feedback-composer]")')
click('button[aria-label="Switch to light mode"]');wait('!document.documentElement.classList.contains("dark")')
result={'nativeNestedSvgButtonPick':True,'underlyingThemeActionSuppressed':True,'hoverOutlineMatchesActualButton':measure,'darkComposer':colors,'lightThemeRestored':True}
(out/'extra-native-results.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
assert colors['contrast']>=4.5,colors
