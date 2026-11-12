import json,time
from pathlib import Path
OUT=Path('/opt/data/tmp/atlas-chart-legibility-20261112/comparison-final');OUT.mkdir(exist_ok=True)
rows=[]
def p(s):return js('(() => {'+s+'})()')
def settle():
 cdp('Page.bringToFront');js('return document.fonts.ready.then(()=>true)');last=None;n=0
 for _ in range(100):
  v=p('return [...document.querySelectorAll("[data-metric-rail] article")].map(e=>Math.round(e.getBoundingClientRect().height));')
  n=n+1 if v==last else 0
  if n>=6:return
  last=v;time.sleep(.08)
 raise AssertionError('unstable')
for label,port in [('before',35641),('after',35642)]:
 for width in [1440,390,320]:
  cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=width<600)
  goto_url('about:blank');goto_url(f'http://127.0.0.1:{port}/neuro-atlas/field-velocity');wait_for_load();assert wait_for_element('[data-performance-card="simultaneously-recorded-neurons"]',visible=True);settle()
  values=p('''return [...document.querySelectorAll('[data-metric-rail] article')].map(e=>{const s=e.querySelector('svg'),r=e.getBoundingClientRect();return {title:e.querySelector('h3,.pc-card-title,figcaption').textContent,height:r.height,width:r.width,svgWidth:s.getBoundingClientRect().width,svgHeight:s.getBoundingClientRect().height,guides:s.querySelectorAll('[data-year-guide]').length};});''')
  for index,key in [(8,'hours'),(17,'cost'),(5,'growth')]:
   p('''const e=[...document.querySelectorAll('[data-metric-rail] article')]['''+str(index)+'''];e.scrollIntoView({block:'center',inline:'center',behavior:'instant'});''');settle()
   capture_screenshot(path=str(OUT/f'{label}-{key}-{width}.png'))
  growth=p('''const s=document.querySelector('[data-publication-card="publication-growth"] svg'),r=s.getBoundingClientRect();return [...s.querySelectorAll('text')].filter(e=>e.textContent==='BRAIN-COMPUTER INTERFACE').map(e=>({text:e.textContent,rightOverflow:e.getBoundingClientRect().right-r.right}));''')
  rows.append({'label':label,'width':width,'charts':values,'growthHeading':growth})
(OUT/'geometry.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps([{'label':r['label'],'width':r['width'],'first':r['charts'][0],'growthHeading':r['growthHeading']} for r in rows],indent=2))
