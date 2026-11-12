# Run via browser-harness stdin, in the task-owned window, against loopback QA only.
import os, json, time, base64
from pathlib import Path
from urllib.parse import urlparse
BASE=os.environ.get('ATLAS_QA_ORIGIN','http://127.0.0.1:35963')
assert urlparse(BASE).hostname=='127.0.0.1'
OUT=Path(os.environ.get('ATLAS_QA_OUTPUT','/opt/data/tmp/atlas-allchart-final-evidence'));OUT.mkdir(parents=True,exist_ok=True)
# Run from the task-owned checkout, or pass ATLAS_QA_INVENTORY explicitly.
# Never silently read a retired worktree's stale title inventory.
EXPECTED=json.loads(Path(os.environ.get('ATLAS_QA_INVENTORY', 'tests/fixtures/chart-design-inventory.json')).read_text())
def probe(body): return js('(() => {'+body+'})()')
def settle():
 cdp('Page.bringToFront');js('return document.fonts.ready.then(()=>true)')
 # Wait for actual CTM-backed type and chart sizing rather than capturing first paint.
 last=None;stable=0
 for _ in range(80):
  v=probe('return [...document.querySelectorAll("[data-metric-rail] article")].map(e=>[Math.round(e.getBoundingClientRect().height),Math.round((e.querySelector("svg")?.getBoundingClientRect().width||0)*10)]);')
  stable=stable+1 if v==last else 0
  if stable>=4:return
  last=v;time.sleep(.08)
 raise AssertionError('Layout not stable')
def snap(name):return capture_screenshot(path=str(OUT/(name+'.png')))
def click_point(selector):
 r=probe('''const original=document.querySelector('''+json.dumps(selector)+''');const year=original.getAttribute('data-year');const e=(year&&original.closest('svg')?.querySelector('[data-annual-year-target="'+year+'"]'))||original;e.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});const r=e.getBoundingClientRect();const xy=[[r.x+r.width/2,r.y+r.height/2],[r.right-.2,r.y+r.height/2],[r.left+.2,r.y+r.height/2],[r.x+r.width/2,r.top+.2],[r.x+r.width/2,r.bottom-.2]].find(([x,y])=>{const hit=document.elementFromPoint(x,y);return hit===e||e.contains(hit)});return {x:xy?.[0],y:xy?.[1],painted:!!xy};''')
 assert r['painted'], ('No painted hit target',selector,r)
 cdp('Page.bringToFront');click_at_xy(r['x'],r['y'])
def wait_popup():
 for _ in range(40):
  if probe('return !!document.querySelector("dialog [data-point-tooltip]");'):return
  time.sleep(.05)
 raise AssertionError('No source popup')
report=[]
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=width<600)
 goto_url('about:blank');wait_for_load();goto_url(BASE+'/field-velocity');wait_for_load();assert wait_for_element('[data-performance-card="simultaneously-recorded-neurons"]',visible=True);settle()
 previews=probe('''return [...document.querySelectorAll('[data-metric-rail] article')].filter(e=>!e.closest('[hidden],[inert]')).map(e=>{const h=e.querySelector('h3,.pc-card-title,figcaption'),s=e.querySelector('svg'),r=s?.getBoundingClientRect(),hr=h.getBoundingClientRect();const texts=[...e.querySelectorAll('svg text')].map(t=>{const b=t.getBoundingClientRect(),m=t.getScreenCTM();return {text:t.textContent,px:parseFloat(getComputedStyle(t).fontSize)*Math.hypot(m.a,m.b),x:b.left-r.left,right:b.right-r.right,top:b.top-r.top,bottom:b.bottom-r.bottom,leftOfHeading:b.left-hr.left};});return {title:h.textContent,height:e.getBoundingClientRect().height,texts};});''')
 assert [p['title'] for p in previews]==[p['title'] for p in EXPECTED], 'Changed chart inventory/order'
 for p in previews:
  assert all(abs(t['px']-12)<.15 for t in p['texts']),(width,p)
  assert all(t['x']>=-1.1 and t['right']<=1.1 and t['top']>=-1.1 and t['bottom']<=1.1 for t in p['texts']),(width,p)
  assert all(t['leftOfHeading']>=-1 for t in p['texts']),(width,p)
 assert max(p['height'] for p in previews)-min(p['height'] for p in previews)<=1, (width,'Unequal card heights')
 assert probe('return document.documentElement.scrollWidth===document.documentElement.clientWidth;'),(width,'Page overflow')
 dialogs=[]
 for index,p in enumerate(previews):
  r=probe('''const a=[...document.querySelectorAll('[data-metric-rail] article')].filter(e=>!e.closest('[hidden],[inert]'))['''+str(index)+'''];const b=a.querySelector('button[aria-haspopup="dialog"]');b.scrollIntoView({block:'center',inline:'center',behavior:'instant'});return b.getBoundingClientRect().toJSON();''')
  cdp('Page.bringToFront');click_at_xy(r['x']+min(r['width']/2,80),r['y']+min(r['height']/2,24));settle()
  assert probe('return !!document.querySelector("dialog[open]");'),(width,p['title'],'Dialog not open')
  assert not probe('return !!document.querySelector("dialog [data-point-tooltip]");'),(width,p['title'],'Popup preselected')
  assert not probe('return !!document.querySelector("dialog .draft-plot-inspector,dialog .pc-point-readout");'),(width,p['title'],'Old gray source panel')
  values=probe('''const d=document.querySelector('dialog'),s=d.querySelector('.draft-plot-svg,.pc-plot svg,.publication-full-plot svg,.gt-plot svg');return {title:d.querySelector('h2').textContent,hasPlot:!!s,marks:s?[...s.querySelectorAll('[data-source-observation],[data-curve-point],[data-publication-mark],[data-trend-point]')].map(e=>({id:e.getAttribute('data-source-observation')??e.getAttribute('data-curve-point'),value:e.getAttribute('data-value'),date:e.getAttribute('data-date'),label:e.getAttribute('aria-label')})):[],labels:s?[...s.querySelectorAll('text')].map(e=>({text:e.textContent,expected:Number(e.getAttribute('data-export-font-size')||12),px:parseFloat(getComputedStyle(e).fontSize)*Math.hypot(e.getScreenCTM().a,e.getScreenCTM().b)})):[]};''')
  assert values['title']==p['title'],(width,p['title'],'Wrong dialog identity',values['title'])
  if values['hasPlot']:
   assert all(abs(t['px']-t['expected'])<.15 for t in values['labels']),(width,p['title'],'Modal type',values['labels'])
  mark='dialog [data-source-observation][tabindex="0"],dialog [data-curve-point][tabindex="0"],dialog [data-publication-mark][tabindex="0"],dialog [data-trend-point][tabindex="0"]'
  hasmark=probe('return !!document.querySelector('+json.dumps(mark)+');')
  if hasmark:
   click_point(mark);wait_popup()
   tip=probe('const t=document.querySelector("dialog [data-point-tooltip]"),r=t.getBoundingClientRect();return {text:t.textContent,x:r.left,y:r.top,right:r.right,bottom:r.bottom,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};')
   assert tip['text'].strip() and tip['x']>=7 and tip['right']<=width-7 and tip['y']>=7 and tip['bottom']<=1000-7,(width,p['title'],tip)
   assert tip['scrollWidth']==tip['clientWidth'],(width,'Tooltip overflow')
   if index in [0,8,10]:snap('tooltip-'+str(width)+'-'+str(index))
   press_key('Escape')
   for _ in range(60):
    if not probe('return !!document.querySelector("dialog [data-point-tooltip]");'):break
    time.sleep(.05)
   assert not probe('return !!document.querySelector("dialog [data-point-tooltip]");')
   assert probe('return !!document.querySelector("dialog[open]");'),'Tooltip Escape closed chart'
   values['sourcePopup']=tip['text']
  press_key('Escape')
  for _ in range(60):
   if not probe('return !!document.querySelector("dialog[open]");'):break
   time.sleep(.05)
  assert not probe('return !!document.querySelector("dialog[open]");'),(width,p['title'],'Chart failed to close')
  dialogs.append(values)
 report.append({'width':width,'previews':previews,'dialogs':dialogs,'noPageOverflow':True})
(OUT/'all-chart-native-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'widths':[r['width'] for r in report],'chartCount':len(EXPECTED),'dialogVisits':sum(len(r['dialogs']) for r in report),'report':str(OUT/'all-chart-native-report.json')}))
