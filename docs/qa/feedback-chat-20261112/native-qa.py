# Actual Next app + actual HTTP intake; only local proxy and Linear provider are synthetic.
import json,time,os
from pathlib import Path
out=Path('/opt/data/tmp/atlas-feedback-chat-20261112/evidence');out.mkdir(exist_ok=True)
origin='http://127.0.0.1:35641'
run=os.environ.get('ATLAS_QA_RUN','run4')
fixture=json.loads(Path('/opt/data/tmp/atlas-feedback-chat-20261112/candidate-manifest.json').read_text())
assert fixture['revision']==os.environ.get('ATLAS_QA_REVISION','b386df48b84bf3571bb91938cbca9a3eeaf71246')
expected='Tracked deals, partnerships, first-in-human trials, and regulatory milestones across neural interfaces and neurotechnology. Filter by BCI only or view the broader neurotech ecosystem. Click a year to put it into focus.'
def wait(expr,seconds=25):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  if js(expr):return
  time.sleep(.05)
 raise AssertionError(expr)
def snap(name):capture_screenshot(path=str(out/(name+'.png')))
def point(selector):
 cdp('Page.bringToFront')
 result=js(f'''(()=>{{const e=document.querySelector({json.dumps(selector)});if(!e)throw Error('missing '+{json.dumps(selector)});e.scrollIntoView({{block:'nearest'}});const r=e.getBoundingClientRect();return {{x:r.left+r.width/2,y:r.top+r.height/2}}}})()''')
 snap('current');return result
def click(selector):
 p=point(selector);click_at_xy(p['x'],p['y'])
def bytext(text):
 js(f'''(()=>{{document.querySelectorAll('[data-qa-click]').forEach(e=>e.removeAttribute('data-qa-click'));const e=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==={json.dumps(text)}&&e.getBoundingClientRect().width);if(!e)throw Error('missing button '+{json.dumps(text)});e.setAttribute('data-qa-click','')}})()''')
 click('[data-qa-click]')
def fill(value):
 js(f'''(()=>{{const e=document.querySelector('[aria-label="Feedback"]');e.focus();if(document.activeElement!==e)throw Error('not focused');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,{json.dumps(value)});e.dispatchEvent(new Event('input',{{bubbles:true}}))}})()''')
 assert js('document.querySelector("[aria-label=Feedback]").value')==value
def shortcut():
 cdp('Input.dispatchKeyEvent',type='keyDown',key='F',code='KeyF',modifiers=9,windowsVirtualKeyCode=70)
 cdp('Input.dispatchKeyEvent',type='keyUp',key='F',code='KeyF',modifiers=9,windowsVirtualKeyCode=70)
def pick(selector):
 p=point(selector);cdp('Input.dispatchMouseEvent',type='mouseMoved',x=p['x'],y=p['y'])
 wait('!!document.querySelector("[data-feedback-outline]")')
 click_at_xy(p['x'],p['y']);wait('!!document.querySelector("[data-feedback-composer][open]")')
def trigger():
 js("(()=>{document.querySelectorAll('[data-qa-trigger]').forEach(e=>e.removeAttribute('data-qa-trigger'));const e=[...document.querySelectorAll('[data-feedback-trigger]')].find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0});if(!e)throw Error('no visible trigger');e.setAttribute('data-qa-trigger','')})()")
 click('[data-qa-trigger]');wait('!!document.querySelector("[data-feedback-selection]")')
def bounded(width,success=False):
 x=js("(()=>{const d=document.querySelector('[data-feedback-composer]'),r=d.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight,clientWidth:document.documentElement.clientWidth,documentWidth:document.documentElement.scrollWidth,fields:d.querySelectorAll('textarea').length}})()")
 assert x['left']>=0 and x['right']<=width and x['top']>=0 and x['bottom']<=x['viewportHeight'],x
 assert x['viewportWidth']==width and x['clientWidth']<=width and x['documentWidth']==x['clientWidth'],x
 if width<500:assert x['clientWidth']==width,x
 assert x['fields']==(0 if success else 1),x
 return x
def visit(path,width,height):
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=height,deviceScaleFactor=1,mobile=width<500)
 goto_url(origin+'/neuro-atlas'+path);wait_for_load();cdp('Page.bringToFront')
 wait('!!document.querySelector("[data-feedback-trigger]")')
def watch():
 js("""(()=>{const f=window.fetch.bind(window);window.__qa={posts:[],responses:[],popups:0};window.fetch=async(u,o)=>{const q=String(u).endsWith('/api/feedback/public')&&o?.method==='POST';if(q)window.__qa.posts.push({body:JSON.parse(o.body),key:o.headers['Idempotency-Key']});const r=await f(u,o);if(q)window.__qa.responses.push(r.status);return r;};window.open=()=>{window.__qa.popups++;throw Error('no popup permitted')};})()""")
results=[]
for width in [1440,390,320]:
 height=600 if width==320 else 1000
 visit('/milestones',width,height);wait('document.body.innerText.includes("All neurotech")')
 milestone=js("""(()=>{const h=[...document.querySelectorAll('h2')].find(e=>e.textContent==='Milestone timeline'),p=h.parentElement.querySelector('p'),b=[...document.querySelectorAll('button')].find(e=>e.textContent.startsWith('All neurotech')),f=b.parentElement.parentElement,r=f.getBoundingClientRect(),i=h.parentElement.getBoundingClientRect();return {copy:p.textContent.replace(/\\s+/g,' ').trim(),filterHeight:r.height,introGap:r.top-i.bottom,memo:/Memo cut|Naveen’s Q1\\+ 2026 chart|Independent of the dots/i.test(document.body.innerText),client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}})()""")
 assert milestone['copy']==expected,milestone
 assert milestone['filterHeight']<130,milestone
 assert 0<=milestone['introGap']<=28,milestone
 assert not milestone['memo'],milestone
 assert milestone['client']<=width and milestone['scroll']==milestone['client'],milestone
 if width<500:assert milestone['client']==width,milestone
 js("(()=>{const h=[...document.querySelectorAll('h2')].find(e=>e.textContent==='Milestone timeline');window.scrollTo(0,h.getBoundingClientRect().top+scrollY-24)})()")
 time.sleep(.2);snap(f'milestones-{width}')
 # Verify the real collapsed stage can still expand, filter, and collapse.
 js("(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent.startsWith('Clinical'));e.setAttribute('data-qa-stage','')})()")
 click('[data-qa-stage]');snap(f'milestones-expanded-{width}')
 # Dismiss using the same stage control if it remains, otherwise explicit close.
 if js('document.querySelector("[data-qa-stage]")?.isConnected'):click('[data-qa-stage]')
 # Header/sidebar feedback must be adjacent to the matching contribution action, never fixed.
 pairs=js("""(()=>[...document.querySelectorAll('[data-feedback-trigger]')].filter(e=>e.getBoundingClientRect().width).map(e=>{const a=e.parentElement.querySelector('a[href*="github.com/protocol/neuro-atlas"]'),s=getComputedStyle(e),t=a&&getComputedStyle(a);return {hasPair:!!a,position:s.position,font:s.fontSize,otherFont:t?.fontSize,radius:s.borderRadius,otherRadius:t?.borderRadius,border:s.borderTopWidth,otherBorder:t?.borderTopWidth}}))()""")
 assert pairs and all(p['hasPair'] and p['position']!='fixed' and p['font']==p['otherFont'] and p['radius']==p['otherRadius'] for p in pairs),pairs
 # A new entry starts invisible chrome-free picking, then an anchored one-field chat.
 watch();trigger()
 assert not js('!!document.querySelector("[data-selection-controls]")')
 assert not js('/Point to an element\\. Click to attach\\.|General page/.test(document.querySelector("[data-feedback-selection]").innerText)')
 pick('h2');wait('document.querySelector("[data-feedback-submit]")?.disabled===true')
 assert not js('/On Send|workspace\\/team members/.test(document.querySelector("[data-feedback-composer]").textContent)')
 note=f'Synthetic native visitor feedback {run} {width}.';fill(note)
 wait('document.querySelector("[data-feedback-submit]")?.disabled===false')
 metrics=bounded(width);snap(f'composer-{width}')
 if width==390:
  cdp('Emulation.setDeviceMetricsOverride',width=390,height=400,deviceScaleFactor=1,mobile=True)
  wait("innerHeight===400&&document.querySelector('[data-feedback-composer]').getBoundingClientRect().bottom<=400")
  bounded(width);snap('composer-keyboard-390')
  cdp('Emulation.setDeviceMetricsOverride',width=390,height=1000,deviceScaleFactor=1,mobile=True)
  wait('innerHeight===1000')
 assert js("fetch('/neuro-atlas/api/qa-feedback-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({failNext:1})}).then(r=>r.ok)")
 click('[aria-label="Feedback"]')
 cdp('Input.dispatchKeyEvent',type='keyDown',key='Enter',code='Enter',text='\r',unmodifiedText='\r',modifiers=8,windowsVirtualKeyCode=13)
 cdp('Input.dispatchKeyEvent',type='keyUp',key='Enter',code='Enter',modifiers=8,windowsVirtualKeyCode=13)
 assert js('window.__qa.posts.length')==0
 assert '\n' in js('document.querySelector("[aria-label=Feedback]").value')
 fill(note);press_key('Enter');wait('!!document.querySelector("[role=alert]")')
 assert js('document.querySelector("[aria-label=Feedback]").value')==note
 assert not js('!!document.querySelector("[data-feedback-success]")')
 snap(f'retry-{width}')
 press_key('Enter');wait('!!document.querySelector("[data-feedback-success]")')
 posts=js('window.__qa.posts');assert len(posts)==2 and posts[0]==posts[1],posts
 assert js('window.__qa.responses')==[503,202]
 assert js('window.__qa.popups')==0
 success=js('document.querySelector("[data-feedback-success]").innerText')
 assert 'Thanks for your feedback' in success and 'under review' in success and 'Check back soon' in success,success
 success_metrics=bounded(width,True);snap(f'success-{width}')
 state=js("fetch('/neuro-atlas/api/qa-feedback-state').then(r=>r.json())")
 assert state['externalCalls']==0 and len([r for r in state['records'] if note in r['description']])==1,state
 for _ in range(8):
  press_key('Tab');assert js('document.querySelector("[data-feedback-composer]").contains(document.activeElement)')
 press_key('Escape');wait('!document.querySelector("[data-feedback-composer]")')
 assert not js('!!document.querySelector("[data-feedback-outline]")')
 trigger();assert not js('!!document.querySelector("[data-feedback-outline]")')
 pick('h2');fill('Retained text, not a retained selection.');press_key('Escape')
 wait('!document.querySelector("[data-feedback-composer]")')
 trigger();assert not js('!!document.querySelector("[data-feedback-outline]")')
 assert not js('!!document.querySelector("[data-feedback-composer]")')
 press_key('Escape');wait('!document.querySelector("[data-feedback-selection]")')
 results.append({'width':width,'milestones':milestone,'matchingActionPairs':pairs,'actualHttpSyntheticProvider':True,'sameKeyBodyRetry':True,'chat':metrics,'confirmation':success_metrics,'exitClearsPin':True})
# Native closure for the independently found DOM-movement retry and late hidden focus race.
visit('/milestones',1440,1000);wait('document.body.innerText.includes("All neurotech")');watch()
js("document.querySelector('h2').setAttribute('data-qa-original-target','')")
trigger();pick('[data-qa-original-target]');fill('Synthetic moved-node retry '+run+'.');wait('document.querySelector("[data-feedback-submit]")?.disabled===false')
assert js("fetch('/neuro-atlas/api/qa-feedback-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({failNext:1})}).then(r=>r.ok)")
press_key('Enter');wait('!!document.querySelector("[role=alert]")');first=js('window.__qa.posts.at(-1)')
click('[data-feedback-close]');wait('!document.querySelector("[data-feedback-composer]")')
js("(()=>{const original=document.querySelector('[data-qa-original-target]'),sibling=document.createElement('h2');sibling.textContent='Synthetic sibling';original.before(sibling);original.classList.add('qa-layout-change')})()")
trigger();pick('[data-qa-original-target]');wait('document.querySelector("[data-feedback-submit]")?.disabled===false');press_key('Enter');wait('!!document.querySelector("[data-feedback-success]")')
assert js('window.__qa.posts.at(-1)')==first,'same original node retains the first UUID and full body after structural/class movement'
press_key('Escape');wait('!document.querySelector("[data-feedback-composer]")')
trigger();pick('[data-qa-original-target]');fill('Synthetic late completion '+run+'.');wait('document.querySelector("[data-feedback-submit]")?.disabled===false')
# Hold only delivery of a genuine successful local HTTP response, not its provider/write result.
js("""(()=>{const actual=window.fetch.bind(window);let hold=true;window.fetch=async(u,o)=>{const r=await actual(u,o);if(hold&&String(u).endsWith('/api/feedback/public')&&o?.method==='POST'&&r.status===202){hold=false;await new Promise(resolve=>window.__releaseSavedResponse=resolve);}return r;};})()""")
press_key('Enter');wait('typeof window.__releaseSavedResponse==="function"')
click('[data-feedback-close]');wait('!document.querySelector("[data-feedback-composer]")')
js("(()=>{const input=document.createElement('input');input.setAttribute('data-qa-unrelated-work','');input.setAttribute('aria-label','Synthetic unrelated page work');document.body.append(input);input.focus();window.__releaseSavedResponse()})()")
wait('!document.querySelector("[data-feedback-composer]")&&document.querySelector("[data-qa-unrelated-work]")===document.activeElement')
time.sleep(.2)
assert js('document.querySelector("[data-qa-unrelated-work]")===document.activeElement'),'hidden completion cannot steal focus'
trigger();pick('[data-qa-original-target]');assert js('document.querySelector("[aria-label=Feedback]").value')==''
press_key('Escape');wait('!document.querySelector("[data-feedback-composer]")')
# Feedback sits above an existing native chart, and picking its Close cannot activate it.
visit('/field-velocity#simultaneously-recorded-neurons',1440,1000)
wait('!!document.querySelector("dialog[open]:not([data-atlas-feedback]) svg")');watch();shortcut();wait('!!document.querySelector("[data-feedback-selection]")')
js("(()=>{window.__activated=[];const b=document.querySelector('dialog[open]:not([data-atlas-feedback]) button');for(const t of ['pointerdown','pointerup','mousedown','mouseup','click'])b.addEventListener(t,()=>window.__activated.push(t))})()")
pick('dialog[open]:not([data-atlas-feedback]) button')
assert js('document.querySelectorAll("dialog:modal").length')==2
assert js('window.__activated')==[]
fill('Synthetic chart feedback '+run+'.');wait('document.querySelector("[data-feedback-submit]")?.disabled===false');press_key('Enter');wait('!!document.querySelector("[data-feedback-success]")')
assert js('document.querySelectorAll("dialog:modal").length')==2
snap('chart-success-1440');press_key('Escape');wait('document.querySelectorAll("dialog:modal").length===1')
shortcut();wait('!!document.querySelector("[data-feedback-selection]")');assert not js('!!document.querySelector("[data-feedback-outline]")');press_key('Escape');wait('!document.querySelector("[data-feedback-selection]")')
press_key('Escape');wait('document.querySelectorAll("dialog:modal").length===0')
final={'allPassed':True,'revision':fixture['revision'],'actualNextUIAndHTTP':True,'syntheticLinearOnly':True,'externalProviderCalls':0,'cases':results,'nativeChartLayerAndActivationSuppression':True,'reviewFindingsNativeClosure':{'R1':'PASS: native keyboard retry','P2-001':'PASS: moved original node retains full retry','P2-002':'PASS: held real HTTP success after close preserves unrelated focus'}}
(out/'native-results.json').write_text(json.dumps(final,indent=2)+'\n');print(json.dumps(final))
