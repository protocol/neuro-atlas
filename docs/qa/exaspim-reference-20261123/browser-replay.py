import os,json,time,base64
from pathlib import Path
BASE=os.environ['CITE_QA_BASE'];PHASE=os.environ.get('CITE_QA_PHASE','after');OUT=Path('/opt/data/tmp/exaspim-reference-native-20261123');OUT.mkdir(exist_ok=True)
DOI='https://doi.org/10.7554/eLife.91979'
def val(s):return js('(()=>{'+s+'})()')
def wait(s):
 end=time.monotonic()+25
 while time.monotonic()<end:
  v=val(s)
  if v:return v
  time.sleep(.1)
 raise AssertionError(s)
def click(selector):
 capture_screenshot(path=str(OUT/'before-input.png'))
 p=val('const e=document.querySelector('+json.dumps(selector)+'),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
 assert p['hit'],p
 click_at_xy(p['x'],p['y'])
results=[];cdp('Page.bringToFront')
for width in [1440,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1100,deviceScaleFactor=1,mobile=False)
 goto_url('about:blank');wait_for_load();goto_url(BASE+'/neuro-atlas/field-velocity?cite-qa='+PHASE+'#metric-panel-acquisition-economics');wait_for_load()
 wait('return document.querySelectorAll("dialog[open] [data-source-observation]").length===10&&document.fonts.status==="loaded"')
 cdp('Page.bringToFront')
 wait('return document.querySelector("dialog[open] h2")?.textContent==="Estimated acquisition efficiency"')
 state=val('const d=document.querySelector("dialog[open]");return {width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,warning:d.innerText.includes("citation mismatch"),marks:d.querySelectorAll("[data-source-observation]").length}')
 assert state['width']==width and state['scroll']<=state['client']+1,state
 assert state['warning']==(PHASE=='before'),state
 capture_screenshot(path=str(OUT/f'{PHASE}-chart-{width}.png'))
 val('document.querySelector("dialog[open] [data-source-observation=exaspim2024][tabindex]").focus();return true')
 wait('return !!document.querySelector("[role=tooltip]")')
 popup=val('const p=document.querySelector("[role=tooltip]"),r=p.getBoundingClientRect();return {text:p.innerText,links:[...p.querySelectorAll("a")].map(a=>a.getAttribute("href")),left:r.left,right:r.right}')
 if PHASE=='after':
  assert DOI in popup['links'] and 'Glaser' in popup['text'] and '2025' in popup['text'],popup
  assert 'citation mismatch' not in popup['text'] and 'HiExM' not in popup['text']
  assert popup['left']>=-1 and popup['right']<=width+1,popup
 capture_screenshot(path=str(OUT/f'{PHASE}-source-{width}.png'))
 press_key('Escape');wait('return !document.querySelector("[role=tooltip]")')
 if PHASE=='after' and width==1440:
  for metric in ['voxels-per-dollar','dollars-per-voxel']:
   click('dialog[open] [data-acquisition-metric='+metric+']')
   wait('return document.querySelector("[data-acquisition-metric='+metric+']").getAttribute("aria-pressed")==="true"')
   val('window.__citePNG=null;const original=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download&&this.href.startsWith("blob:")){fetch(this.href).then(r=>r.blob()).then(b=>new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(b);})).then(v=>window.__citePNG=v);return;}return original.call(this);};return true')
   click('dialog[open] [data-download-chart]');wait('return !!window.__citePNG')
   raw=val('return window.__citePNG');(OUT/f'after-native-{metric}.png').write_bytes(base64.b64decode(raw.split(',',1)[1]))
 state['source']=popup;results.append(state)
(OUT/f'{PHASE}-report.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps({'phase':PHASE,'cases':len(results),'widths':[r['width'] for r in results],'correctMethodLinks':PHASE=='after'}))
