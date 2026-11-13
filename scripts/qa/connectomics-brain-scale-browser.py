# browser-harness injects these globals into this script's execution namespace.
from typing import TYPE_CHECKING, Any
if TYPE_CHECKING:
    def js(code: str, timeout: float = ...) -> Any: ...
    def cdp(method: str, **kwargs: Any) -> Any: ...
    def capture_screenshot(path: str = ...) -> Any: ...
    def click_at_xy(x: float, y: float) -> Any: ...
    def goto_url(url: str) -> Any: ...
    def wait_for_load() -> Any: ...
    def press_key(key: str) -> Any: ...

# Native two-chart scale-toggle acceptance; execute only with an owned browser-harness window.
import os,json,time,base64,hashlib
from pathlib import Path
import os,json,time,base64
from pathlib import Path
BASE=os.environ.get('BRAIN_QA_BASE','http://127.0.0.1:36471')
PHASE=os.environ.get('BRAIN_QA_PHASE','baseline')
OUT=Path(os.environ.get('BRAIN_QA_OUT','.qa/connectomics-brain-scale')); OUT.mkdir(parents=True,exist_ok=True)
CHARTS=[('selected-public-image-resource-footprints','Selected public image/resource footprints',3),('estimated-acquisition-cost-per-10m-voxels-optical-and-em','Estimated acquisition cost per 10M voxels',5)]
def val(s): return js('(() => {'+s+'})()')
def wait(s,seconds=20):
 deadline=time.monotonic()+seconds
 while time.monotonic()<deadline:
  z=val(s)
  if z:return z
  time.sleep(.08)
 raise AssertionError(s)
def geometry():return val('''const f=document.querySelector('dialog[open] figure.draft-plot'),s=f.querySelector('svg.draft-plot-svg');return {title:f.querySelector('figcaption').textContent,viewBox:s.getAttribute('viewBox'),points:[...s.querySelectorAll('[data-source-observation]')].map(e=>({id:e.dataset.sourceObservation,tag:e.tagName,cx:e.getAttribute('cx'),cy:e.getAttribute('cy'),r:e.getAttribute('r'),x:e.getAttribute('x'),y:e.getAttribute('y'),width:e.getAttribute('width'),height:e.getAttribute('height'),points:e.getAttribute('points')})),texts:[...s.querySelectorAll('text')].map(e=>({text:e.textContent,x:e.getAttribute('x'),y:e.getAttribute('y')})),table:document.querySelector('dialog[open] table').outerHTML,previews:[...document.querySelectorAll('figure[data-draft-preview] svg')].map(e=>e.outerHTML)}''')
def click(sel):
 val('const e=document.querySelector('+json.dumps(sel)+');e.scrollIntoView({block:"center"});return true')
 capture_screenshot(path=str(OUT/'before-click.png'))
 r=val('const e=document.querySelector('+json.dumps(sel)+');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e}')
 assert r['hit'],r
 click_at_xy(r['x'],r['y'])

BASE=os.environ.get('BRAIN_QA_BASE','http://127.0.0.1:36472');PHASE='candidate'
prior=json.loads((OUT/'baseline.json').read_text());results=[]
def state():return val('''const d=document.querySelector('dialog[open]'), f=d.querySelector('figure.draft-plot'),s=f.querySelector('svg.draft-plot-svg'),r=s.getBoundingClientRect();return {checked:d.querySelector('[data-brain-scale-toggle]').getAttribute('aria-checked'),state:f.getAttribute('data-brain-scale-state'),top:r.top,rectHeight:r.height,viewBox:s.getAttribute('viewBox'),points:[...s.querySelectorAll('[data-source-observation]')].map(e=>({id:e.dataset.sourceObservation,cy:e.getAttribute('cy'),y:e.getAttribute('y')})),refs:[...s.querySelectorAll('[data-brain-scale-reference]')].map(e=>({id:e.getAttribute('data-brain-scale-reference'),tag:e.tagName,text:e.textContent,y:e.getAttribute('y1')})),doc:{inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth},dialog:{client:d.clientWidth,scroll:d.scrollWidth},focus:document.activeElement?.getAttribute('data-brain-scale-toggle')};''')
def samples(reverse=False):
 val('''window.__brainSamples=[];window.__brainSamplesDone=false;const b=document.querySelector('dialog[open] [data-brain-scale-toggle]');b.addEventListener('click',()=>{let start=performance.now();const tick=(t)=>{const s=document.querySelector('dialog[open] svg.draft-plot-svg'),f=s.closest('figure'),r=s.getBoundingClientRect(),p=s.querySelector('circle[data-source-observation]');window.__brainSamples.push({t:t-start,y:+p.getAttribute('cy'),top:r.top,height:r.height,state:f.getAttribute('data-brain-scale-state'),refs:s.querySelectorAll('[data-brain-scale-reference]').length,disabled:document.querySelector('dialog[open] [data-download-chart]').disabled});if(t-start<1400)requestAnimationFrame(tick);else window.__brainSamplesDone=true};requestAnimationFrame(tick);'''+('setTimeout(()=>b.click(),220);' if reverse else '')+'''},{once:true});return true''')
 click('dialog[open] [data-brain-scale-toggle]')
 wait('return window.__brainSamplesDone',10)
 return val('return window.__brainSamples')
def export_png(anchor,name):
 val('''window.__brainPng=null;const original=URL.createObjectURL.bind(URL);URL.createObjectURL=(blob)=>{if(blob.type==='image/png')window.__brainPng=blob;return original(blob)};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download?.endsWith('.png'))return;return click.call(this)};return true''')
 click('dialog[open] [data-download-chart]')
 wait('return !!window.__brainPng',30)
 encoded=val("return (async()=>{const a=new Uint8Array(await window.__brainPng.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s)})()")
 (OUT/name).write_bytes(base64.b64decode(encoded))
cdp('Page.bringToFront')
cdp('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'no-preference'}])
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=False)
 for anchor,title,count in CHARTS:
  goto_url('about:blank');wait_for_load();goto_url(BASE+'/neuro-atlas/field-velocity?brain-qa=candidate#'+anchor);wait_for_load();cdp('Page.bringToFront')
  wait('return !!document.querySelector("dialog[open] [data-brain-scale-toggle]") && !!document.querySelector("dialog[open] table")')
  wait('return document.fonts.status==="loaded"')
  wait('const f=document.querySelector("dialog[open] figure.draft-plot"),s=f.querySelector("svg.draft-plot-svg");return Math.abs(s.viewBox.baseVal.width-Math.round(f.getBoundingClientRect().width))<.5');time.sleep(.35)
  assert title in geometry()['title'],geometry()['title']
  off=geometry();b=next(r for r in prior if r['width']==width and r['anchor']==anchor)
  assert off==b['geometry'],{'changedOffGeometry':(width,anchor),'keys':[k for k in off if off[k]!=b['geometry'][k]]}
  assert state()['checked']=='false'
  capture_screenshot(path=str(OUT/('candidate-off-'+anchor+'-'+str(width)+'.png')))
  on_motion=samples();on=state()
  assert on['checked']=='true',on
  # Multiple measured native positions proves axis/observation motion, not just a CSS declaration.
  assert len({round(r['y'],3) for r in on_motion})>=6,{'noAnimation':on_motion}
  assert any(r['disabled'] for r in on_motion[:20]),on_motion
  assert max(r['top'] for r in on_motion)-min(r['top'] for r in on_motion)<2,{'topJump':on_motion}
  assert max(r['height'] for r in on_motion)-min(r['height'] for r in on_motion)<2,{'heightJump':on_motion}
  assert on['doc']['inner']==width and on['doc']['scroll']<=on['doc']['client']+1,on
  assert on['dialog']['scroll']-on['dialog']['client']<=b['state']['dialogScroll']-b['state']['dialogWidth']+1,on
  assert len(on['refs'])>=count,on
  labels=val('''const s=document.querySelector('dialog[open] svg.draft-plot-svg');const v=s.viewBox.baseVal;return [...s.querySelectorAll('g:has(> line[data-brain-scale-reference]) > text')].map(e=>{const b=e.getBBox();return {text:e.textContent,x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height,w:v.width,h:v.height,size:parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().d}})''')
  assert len(labels)==count,labels
  assert all(z['x']>=-.5 and z['right']<=z['w']+.5 and z['y']>=0 and z['bottom']<=z['h'] for z in labels),labels
  for i,a in enumerate(labels):
   for z in labels[i+1:]:assert min(a['right'],z['right'])-max(a['x'],z['x'])<.5 or min(a['bottom'],z['bottom'])-max(a['y'],z['y'])<.5,labels
  badges=val('return [...document.querySelectorAll("dialog[open] [data-annotation-key] rect")].map(e=>{const b=e.getBBox();return {id:e.parentElement.dataset.annotationKey,x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height}})')
  for a in badges:
   for z in labels:assert min(a['right'],z['right'])-max(a['x'],z['x'])<.5 or min(a['bottom'],z['bottom'])-max(a['y'],z['y'])<.5,{'badgeOverTarget':a,'target':z,'width':width}
  capture_screenshot(path=str(OUT/('candidate-on-'+anchor+'-'+str(width)+'.png')))
  if width==1440:export_png(anchor,'native-export-'+anchor+'.png')
  back_motion=samples();assert geometry()==off,{'restoration':(width,anchor)}
  rapid=samples(True);assert geometry()==off and state()['checked']=='false',{'reversal':(width,anchor)}
  assert len({round(r['y'],3) for r in rapid})>=6,rapid
  # Real keyboard control; reduced motion should settle directly, no traversed domain.
  cdp('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'reduce'}])
  val('document.querySelector("dialog[open] [data-brain-scale-toggle]").focus();return true');press_key('Enter')
  wait('return document.querySelector("dialog[open] [data-brain-scale-toggle]").getAttribute("aria-checked")==="true"');time.sleep(.15)
  reduced=state();assert reduced['points']==on['points'],{'reduced':reduced,'on':on}
  press_key('Enter');time.sleep(.15);assert geometry()==off
  cdp('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'no-preference'}])
  # A previously pinned inspector is stale once the scale starts moving.
  val('document.querySelector("dialog[open] [data-source-observation]").focus();return true');press_key('Enter')
  wait('return !!document.querySelector("dialog[open] [role=tooltip]")')
  val('document.querySelector("dialog[open] [data-brain-scale-toggle]").focus();return true');press_key('Enter')
  wait('return document.querySelector("dialog[open] figure.draft-plot").getAttribute("data-brain-scale-state")==="on"')
  assert not val('return !!document.querySelector("dialog[open] [role=tooltip]")')
  assert val('return document.activeElement===document.querySelector("dialog[open] [data-brain-scale-toggle]")')
  click('dialog[open] [data-brain-scale-toggle]')
  wait('return document.querySelector("dialog[open] figure.draft-plot").getAttribute("data-brain-scale-state")==="off"')
  assert geometry()==off
  # Native source focus still opens correct tooltip, first Escape dismisses it only.
  val('document.querySelector("dialog[open] [data-source-observation]").focus();return true');press_key('Enter')
  wait('return !!document.querySelector("dialog[open] [role=tooltip]")')
  press_key('Escape');wait('return !document.querySelector("dialog[open] [role=tooltip]")');assert val('return !!document.querySelector("dialog[open]")')
  press_key('Escape');wait('return !document.querySelector("dialog[open]")')
  results.append({'width':width,'anchor':anchor,'offGeometryMatchesBaseline':True,'on':on,'labels':labels,'forward':on_motion,'back':back_motion,'rapid':rapid,'reduced':reduced})
  (OUT/'candidate-motion.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'cases':len(results),'nativeAcceptance':'passed','motionPositions':[len({round(r['y'],3)for r in x['forward']})for x in results]}))
