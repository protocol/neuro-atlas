# Source-free native QA: actual Next client + actual HTTP + synthetic Linear/storage only.
# Keep all images/notes outside the public checkout. Use your task-owned browser window.
import os,json,time,base64,hashlib
from pathlib import Path
from urllib.request import urlopen
out=Path(os.environ['FEEDBACK_SCREENSHOT_QA_OUT']);out.mkdir(parents=True,exist_ok=True)
origin='http://127.0.0.1:35643';peer='http://127.0.0.1:35644';run=str(time.time_ns())
def wait(expr,seconds=30):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  if js(expr):return
  time.sleep(.05)
 raise AssertionError(expr)
def click(selector):
 p=js(f"(()=>{{const e=document.querySelector({json.dumps(selector)}),r=e.getBoundingClientRect();return {{x:r.left+r.width/2,y:r.top+r.height/2}}}})()")
 click_at_xy(p['x'],p['y'])
def fill(value):
 js(f"(()=>{{const e=document.querySelector('[aria-label=Feedback]');e.focus();Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,{json.dumps(value)});e.dispatchEvent(new Event('input',{{bubbles:true}}))}})()")
def bounds():
 return js("(()=>{const r=document.querySelector('[data-feedback-composer]').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight}})()")
def visit(path,width,height):
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=height,deviceScaleFactor=1,mobile=width<500)
 goto_url(origin+'/neuro-atlas'+path);wait_for_load();cdp('Page.bringToFront')
 wait("!!document.querySelector('[data-feedback-trigger]')&&!!document.querySelector('button[aria-label^=\"Switch to\"]')")
def trigger():
 # Existing native keyboard gesture, not an injected transport or capture implementation.
 cdp('Input.dispatchKeyEvent',type='keyDown',key='F',code='KeyF',modifiers=9,windowsVirtualKeyCode=70)
 cdp('Input.dispatchKeyEvent',type='keyUp',key='F',code='KeyF',modifiers=9,windowsVirtualKeyCode=70)
 wait("!!document.querySelector('[data-feedback-selection]')")
def watch():
 js("(()=>{const original=fetch.bind(window);window.__qaPosts=[];window.__qaResponses=[];window.fetch=async(u,o)=>{const post=String(u).endsWith('/api/feedback/public')&&o?.method==='POST';if(post)__qaPosts.push({body:o.body,key:o.headers['Idempotency-Key']});const r=await original(u,o);if(post)__qaResponses.push(r.status);return r}})()")
def save_image(name):
 wait("!!document.querySelector('[data-feedback-capture] img')")
 src=js("document.querySelector('[data-feedback-capture] img').src")
 data=base64.b64decode(src.split(',')[1]);(out/(name+'.png')).write_bytes(data)
 return hashlib.sha256(data).hexdigest()
results=[]
for width,height in [(1440,1000),(390,900),(320,600)]:
 visit('/milestones',width,height)
 wait("[...document.querySelectorAll('img')].filter(e=>e.complete&&e.naturalWidth>0).length>40")
 js("(()=>{const s=[...document.querySelectorAll('svg')].find(e=>e.classList.contains('pointer-events-none')&&e.getBoundingClientRect().width>100);window.__lane=s.parentElement;__lane.setAttribute('data-qa-lane','');__lane.scrollIntoView({block:'center',inline:'nearest'})})()")
 time.sleep(.15);watch();trigger()
 p=js("(()=>{const r=__lane.getBoundingClientRect();return {x:Math.min(innerWidth-25,Math.max(25,r.left+Math.min(r.width*.85,innerWidth*.6))),y:Math.min(innerHeight-40,r.top+r.height*.8)}})()")
 click_at_xy(p['x'],p['y']);wait("!!document.querySelector('[data-feedback-composer][open]')")
 wait("document.querySelector('[data-feedback-capture]')?.textContent.includes('Screenshot attached')")
 image_hash=save_image('capital-selection-'+str(width))
 preview=js("(()=>{const r=document.querySelector('[data-feedback-capture] img').getBoundingClientRect();return {width:r.width,height:r.height}})()")
 assert preview=={'width':72,'height':48},preview
 capture_screenshot(path=str(out/('composer-'+str(width)+'.png')))
 metric=bounds();assert metric['left']>=0 and metric['right']<=width and metric['top']>=0 and metric['bottom']<=height,metric
 if width==390:
  cdp('Emulation.setDeviceMetricsOverride',width=390,height=400,deviceScaleFactor=1,mobile=True)
  wait("document.querySelector('[data-feedback-composer]').getBoundingClientRect().bottom<=400")
  assert bounds()['top']>=0
  capture_screenshot(path=str(out/'composer-keyboard-390.png'))
  cdp('Emulation.setDeviceMetricsOverride',width=390,height=900,deviceScaleFactor=1,mobile=True)
  wait('innerHeight===900')
 note='Synthetic screenshot HTTP QA '+run+' '+str(width);fill(note)
 # Next saves the issue but loses its independent readback. Retry must reuse every byte.
 urlopen(peer+'/control').read();press_key('Enter');wait("!!document.querySelector('[role=alert]')")
 assert js('window.__qaPosts.length')==1
 assert not js("!!document.querySelector('[data-feedback-success]')")
 # Mutating the original chart after the snapshot must not mutate the retained image.
 js("__lane.style.background='rgb(255,0,255)'")
 press_key('Enter');wait("!!document.querySelector('[data-feedback-success]')")
 assert js('window.__qaPosts.length===2&&__qaPosts[0].body===__qaPosts[1].body&&__qaPosts[0].key===__qaPosts[1].key')
 assert js('JSON.stringify(__qaResponses)')=='[503,202]'
 state=json.loads(urlopen(peer+'/state').read());matches=[r for r in state['records'] if note in r['description']];assert len(matches)==1
 assert any(i['sha256']==image_hash for i in state['images'])
 assert image_hash in matches[0]['description'];assert 'data:image' not in matches[0]['description']
 capture_screenshot(path=str(out/('saved-'+str(width)+'.png')))
 results.append({'width':width,'height':height,'imageSha256':image_hash,'preview':preview,'geometry':metric,'sameKeyBodyRetry':True,'nextHttpSyntheticPrivateLinearVerified':True})
 press_key('Escape');wait("!document.querySelector('[data-feedback-composer]')");assert not js("!!document.querySelector('[data-feedback-outline]')")
# Actual chart/SVG preview, distinct from the real Milestones capital lane above.
visit('/field-velocity',1440,1000);wait("!!document.querySelector('[data-performance-card=idea_vintage] svg')")
js("document.querySelector('[data-performance-card=idea_vintage]').scrollIntoView({block:'center'})")
trigger();click('[data-performance-card=idea_vintage] svg');wait("!!document.querySelector('[data-feedback-composer][open]')")
wait("document.querySelector('[data-feedback-capture]')?.textContent.includes('Screenshot attached')")
save_image('citation-chart-svg');capture_screenshot(path=str(out/'citation-chart-composer.png'));press_key('Escape')
# ASCR-001 actual-product reproduction: Commercial near the viewport bottom,
# with the timeline root substantially above the viewport (nonzero crop translation).
visit('/milestones',390,900)
wait("[...document.querySelectorAll('img')].filter(e=>e.complete&&e.naturalWidth>0).length>40")
js("""(()=>{const label=[...document.querySelectorAll('span')].find(e=>e.textContent==='Commercial'&&e.parentElement.matches('div.absolute'));window.__commercial=label.parentElement;const root=__commercial.closest('.milestone-year-scroll');window.scrollTo(0,scrollY+root.getBoundingClientRect().top+96);__commercial.setAttribute('data-qa-commercial','')})()""")
time.sleep(.15)
commercial=js("(()=>{const r=__commercial.getBoundingClientRect(),root=__commercial.closest('.milestone-year-scroll').getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,bottom:r.bottom,rootTop:root.top}})()")
assert commercial['rootTop']<0 and 600<commercial['top']<850,commercial
trigger();click_at_xy(commercial['right']-14,commercial['top']+8)
wait("document.querySelector('[data-feedback-capture]')?.textContent.includes('Screenshot attached')")
save_image('commercial-offset-390');capture_screenshot(path=str(out/'commercial-offset-actual-390.png'));press_key('Escape')
(out/'commercial-offset-geometry.json').write_text(json.dumps(commercial,indent=2))
(out/'native-results.json').write_text(json.dumps({'provider':'synthetic only','screenshots':'actual headed client rendering','results':results},indent=2))
print(json.dumps({'passed':len(results),'resultsFile':str(out/'native-results.json')}))
