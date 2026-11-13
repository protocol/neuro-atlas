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
results=[]
cdp('Page.bringToFront')
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=False)
 for anchor,title,count in CHARTS:
  goto_url('about:blank');wait_for_load();goto_url(BASE+'/neuro-atlas/field-velocity?brain-qa='+PHASE+'#'+anchor);wait_for_load()
  wait('return !!document.querySelector("dialog[open] figure.draft-plot svg.draft-plot-svg") && !!document.querySelector("dialog[open] table")')
  wait('return document.fonts.status==="loaded"')
  cdp('Page.bringToFront')
  wait('const f=document.querySelector("dialog[open] figure.draft-plot"),s=f.querySelector("svg.draft-plot-svg");return Math.abs(s.viewBox.baseVal.width-Math.round(f.getBoundingClientRect().width))<.5')
  g=geometry();assert title in g['title'],g['title']
  time.sleep(.3);g=geometry()
  capture_screenshot(path=str(OUT/(PHASE+'-'+anchor+'-'+str(width)+'.png')))
  state=val('const d=document.querySelector("dialog[open]");return {width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,dialogWidth:d.clientWidth,dialogScroll:d.scrollWidth,focus:document.activeElement?.getAttribute("aria-label")}')
  assert state['width']==width and state['scroll']<=state['client']+1,state
  # Record baseline native dialog padding overflow rather than attributing it to this feature.
  if PHASE!='baseline':
   prior=json.loads((OUT/'baseline.json').read_text())
   b=next(r for r in prior if r['width']==width and r['anchor']==anchor)
   assert state['dialogScroll']-state['dialogWidth']<=b['state']['dialogScroll']-b['state']['dialogWidth']+1,state
  results.append({'width':width,'anchor':anchor,'geometry':g,'state':state})
  (OUT/(PHASE+'.json')).write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'phase':PHASE,'cases':len(results),'titles':[r['geometry']['title'] for r in results]}))
