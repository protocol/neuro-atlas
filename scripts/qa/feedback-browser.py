# HISTORICAL: pre-chat toolbar/toast replay; not current acceptance. See docs/qa/feedback/README.md.
# Run via browser-harness on an owned window. Loopback only; no hosted auth bypass.
import json,time,os
from pathlib import Path
from urllib.parse import urlparse
out=Path(os.environ['FEEDBACK_QA_OUT']);out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('FEEDBACK_QA_BASE','http://127.0.0.1:35641/neuro-atlas/field-velocity')
parsed=urlparse(base)
assert parsed.scheme=='http' and parsed.hostname=='127.0.0.1' and parsed.port in [35641,35642] and not parsed.query and not parsed.fragment
chart=os.environ.get('FEEDBACK_QA_CHART','simultaneously-recorded-neurons')
def wait(expr):
 end=time.monotonic()+20
 while time.monotonic()<end:
  if js(expr):return
  time.sleep(.05)
 raise AssertionError(expr)
def point(selector):
 # Popup completion/other task windows can background this shared headed tab.
 # Front the owned page and force paint before measuring a native pointer target.
 cdp('Page.bringToFront')
 wait('document.visibilityState === "visible"')
 capture_screenshot(path=str(out/'current.png'))
 return js(f'''(()=>{{const e=document.querySelector({json.dumps(selector)});if(!e)throw Error('Missing '+{json.dumps(selector)});e.scrollIntoView({{block:'nearest'}});const r=e.getBoundingClientRect();return {{x:r.left+r.width/2,y:r.top+r.height/2}}}})()''')
def click(selector):
 p=point(selector);click_at_xy(p['x'],p['y'])
def bytext(text):
 js(f'''(()=>{{document.querySelectorAll('[data-qa-click]').forEach(e=>e.removeAttribute('data-qa-click'));const e=[...document.querySelectorAll('[data-atlas-feedback] button')].find(e=>e.textContent.trim()==={json.dumps(text)});if(!e)throw Error('Missing button '+{json.dumps(text)});e.setAttribute('data-qa-click','')}})()''')
 click('button[data-qa-click]')
def fill(label,value):
 js(f'''(()=>{{const e=document.querySelector('[aria-label={json.dumps(label)}]');e.focus();if(document.activeElement!==e)throw Error('Field not focused');const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,{json.dumps(value)});e.dispatchEvent(new Event('input',{{bubbles:true}}))}})()''')
 assert js(f'''document.querySelector('[aria-label={json.dumps(label)}]').value''')==value

def shortcut():
 cdp('Input.dispatchKeyEvent',type='keyDown',key='F',code='KeyF',modifiers=9,windowsVirtualKeyCode=70)
 cdp('Input.dispatchKeyEvent',type='keyUp',key='F',code='KeyF',modifiers=9,windowsVirtualKeyCode=70)
def pick(selector,name):
 p=point(selector)
 cdp('Input.dispatchMouseEvent',type='mouseMoved',x=p['x'],y=p['y'])
 wait('!!document.querySelector("[data-feedback-outline]")')
 capture_screenshot(path=str(out/f'hover-{name}.png'))
 click_at_xy(p['x'],p['y'])
 wait('!!document.querySelector("[data-feedback-composer][open]")')
def geometry(width):
 result=js('''(()=>{const d=document.querySelector('[data-feedback-composer]'),r=d.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight,documentWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,fields:d.querySelectorAll('textarea').length,inputs:d.querySelectorAll('input').length}})()''')
 assert result['left']>=0 and result['right']<=width and result['top']>=0 and result['bottom']<=result['viewportHeight'],result
 assert result['viewportWidth']==width and result['documentWidth']==result['clientWidth'],result
 assert result['width']<=320 and result['fields']==1 and result['inputs']==0,result
 anchor=js("(()=>{const e=document.querySelector('[data-feedback-outline]');if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})()")
 result['anchor']=anchor
 if anchor:
  below=anchor['bottom']+8
  above=anchor['top']-result['height']-8
  if below>=10 and below+result['height']<=result['viewportHeight']-10:assert abs(result['top']-below)<=2,result
  elif above>=10 and above+result['height']<=result['viewportHeight']-10:assert abs(result['top']-above)<=2,result
 return result
results=[]
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=600 if width==320 else 1000,deviceScaleFactor=1,mobile=width<500)
 goto_url('about:blank');wait_for_load();goto_url(base);wait_for_load();cdp('Page.bringToFront')
 wait('!!document.querySelector(".atlas-feedback-launch")')
 click('.atlas-feedback-launch');wait('!!document.querySelector("[data-feedback-selection]:popover-open")')
 assert js('document.querySelectorAll("dialog:modal").length')==0
 pick('h1',f'heading-{width}')
 wait('document.querySelector("[data-feedback-composer]").textContent.includes("Feedback is disabled")')
 fill('Feedback','Keep this private draft.')
 assert js('document.querySelector("[data-feedback-submit]").disabled')
 metrics=geometry(width);capture_screenshot(path=str(out/f'composer-{width}.png'))
 bytext('Select element');press_key('Escape');wait('!!document.querySelector("[data-feedback-composer]")')
 assert js('document.querySelector("textarea").value')=='Keep this private draft.'
 press_key('Escape');wait('!document.querySelector("[data-feedback-composer]")')
 goto_url('about:blank');wait_for_load();goto_url(base+'#'+chart);wait_for_load();wait('!!document.querySelector("dialog[open] svg")')
 shortcut();wait('!!document.querySelector("[data-feedback-selection]:popover-open")')
 assert js('document.querySelectorAll("dialog:modal").length')==1
 assert js('document.querySelector("[data-feedback-selection]").parentElement.matches("dialog:modal")')
 press_key('Tab');assert js('document.activeElement.textContent.trim()')=='General page'
 pick('dialog[open]:not([data-atlas-feedback]) svg',f'chart-{width}')
 assert js('document.querySelectorAll("dialog:modal").length')==2
 chart_metrics=geometry(width);capture_screenshot(path=str(out/f'chart-composer-{width}.png'))
 press_key('Escape');wait('!document.querySelector("[data-feedback-composer]")')
 assert js('document.querySelectorAll("dialog:modal").length')==1
 press_key('Escape');wait('document.querySelectorAll("dialog:modal").length===0')
 results.append({'width':width,'height':600 if width==320 else 1000,'freshHoverPicker':True,'headingPick':True,'chartPick':True,'realHitTesting':True,'nativeModalRetained':True,'disabledDraftRetained':True,'layeredEscape':True,'geometry':metrics,'chartGeometry':chart_metrics})
(out/'native-results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'allPassed':True,'cases':len(results),'kind':'native rendered component/app; disabled backend, no live OAuth or publication'}))
