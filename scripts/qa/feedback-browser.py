# Run via browser-harness against the task-owned loopback-only fixture. Never a hosted auth bypass.
import json,time,os
from pathlib import Path
out=Path(os.environ['FEEDBACK_QA_OUT']);out.mkdir(parents=True,exist_ok=True)
base='http://127.0.0.1:35641/neuro-atlas/field-velocity'
def wait(expr):
 end=time.monotonic()+15
 while time.monotonic()<end:
  if js(expr):return
  time.sleep(.05)
 raise AssertionError(expr)
def click(selector):
 p=js(f'''(()=>{{const e=document.querySelector({json.dumps(selector)});e.scrollIntoView({{block:'nearest'}});const r=e.getBoundingClientRect();return {{x:r.left+r.width/2,y:r.top+r.height/2}}}})()''')
 capture_screenshot(path=str(out/'current.png'))
 click_at_xy(p['x'],p['y'])
def bytext(text):
 js(f'''(()=>{{document.querySelectorAll('[data-qa-click]').forEach(e=>e.removeAttribute('data-qa-click'));const e=[...document.querySelectorAll('[data-atlas-feedback] button')].find(e=>e.textContent.trim()==={json.dumps(text)});if(!e)throw Error('Missing button');e.setAttribute('data-qa-click','')}})()''')
 click('button[data-qa-click]')
def fill(label,value):
 js(f'''(()=>{{const e=document.querySelector('[aria-label={json.dumps(label)}]');const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,{json.dumps(value)});e.dispatchEvent(new Event('input',{{bubbles:true}}))}})()''')
 assert js(f'''document.querySelector('[aria-label={json.dumps(label)}]').value''')==value
results=[]
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=width<500)
 goto_url('about:blank');wait_for_load();goto_url(base+'#simultaneously-recorded-neurons');wait_for_load();cdp('Page.bringToFront')
 wait('!!document.querySelector("dialog[open] svg")')
 # Native shortcut opens feedback above the existing native chart.
 cdp('Input.dispatchKeyEvent',type='keyDown',key='F',code='KeyF',modifiers=9,windowsVirtualKeyCode=70)
 cdp('Input.dispatchKeyEvent',type='keyUp',key='F',code='KeyF',modifiers=9,windowsVirtualKeyCode=70)
 wait('!!document.querySelector("[data-feedback-composer][open]")')
 wait('document.querySelector("[data-feedback-composer]").innerText.includes("Feedback is disabled")')
 fill('Private comment','Please improve the spacing around this chart.')
 bytext('Select area');wait('!!document.querySelector("[data-feedback-selection]")')
 assert js('document.querySelectorAll("dialog:modal").length')==2
 capture_screenshot(path=str(out/f'selection-{width}.png'))
 # Click the actual visible chart center through the transparent feedback top layer.
 point=js('(()=>{const d=[...document.querySelectorAll("dialog:modal")].find(d=>!d.hasAttribute("data-atlas-feedback"));const r=d.querySelector("svg").getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+Math.min(r.height/2,150)}})()')
 click_at_xy(point['x'],point['y']);wait('!!document.querySelector("[data-feedback-composer]")')
 assert js('document.querySelector(".atlas-feedback-target").textContent')=='simultaneously-recorded-neurons'
 capture_screenshot(path=str(out/f'composer-{width}.png'))
 bytext('Review public task');wait("!!document.querySelector('[aria-label=\"Public title\"]')")
 assert js("document.querySelector('[aria-label=\"Public summary\"]').value")==''
 fill('Public title','Improve chart spacing')
 fill('Public summary','Reduce excess space around the chart legend.')
 fill('Acceptance criteria','Keep labels readable at desktop and mobile widths.')
 assert js('document.querySelector("[data-feedback-consent]").checked')==False
 assert js('document.querySelector("[data-feedback-submit]").disabled')==True
 metrics=js('''(()=>{const d=document.querySelector('[data-atlas-feedback]'),p=d.querySelector('.atlas-feedback-panel'),r=p.getBoundingClientRect(),controls=[...p.querySelectorAll('input,textarea,button')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right}});return {inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,panel:{left:r.left,right:r.right},controls}})()''')
 assert metrics['inner']==width and metrics['scroll']==metrics['client'],metrics
 assert metrics['panel']['left']>=0 and metrics['panel']['right']<=width,metrics
 assert all(c['left']>=metrics['panel']['left'] and c['right']<=metrics['panel']['right'] for c in metrics['controls']),metrics
 capture_screenshot(path=str(out/f'public-review-{width}.png'))
 press_key('Escape');wait('!document.querySelector("[data-atlas-feedback]")')
 assert js('document.querySelectorAll("dialog:modal").length')==1
 press_key('Escape');wait('document.querySelectorAll("dialog:modal").length===0')
 results.append({'width':width,'nestedNativeModal':True,'semanticSelection':True,'privatePublicSeparated':True,'consentUnchecked':True,'disabledNoSubmit':True,'layeredEscape':True,'geometry':metrics})
(out/'native-results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'allPassed':True,'cases':len(results),'widths':[1440,390,320],'evidence':'local real app; disabled backend, no live OAuth or publication'}))
