import json,time
from pathlib import Path
O=Path('/opt/data/tmp/atlas-chart-legibility-20261112');rows=[]
def p(s):return js('(() => {'+s+'})()')
for port in [35641,35642]:
 cdp('Emulation.setDeviceMetricsOverride',width=1440,height=1000,deviceScaleFactor=1,mobile=False)
 goto_url('about:blank');goto_url(f'http://127.0.0.1:{port}/neuro-atlas/field-velocity');wait_for_load();assert wait_for_element('[data-performance-card="simultaneously-recorded-neurons"]',visible=True)
 js('return document.fonts.ready.then(()=>true)');cdp('Page.bringToFront')
 # Bounded wait for actual preview point-size settling.
 previous=None;stable=0
 for _ in range(90):
  v=p('return [...document.querySelectorAll("[data-metric-rail] article")].map(e=>Math.round(e.getBoundingClientRect().height));')
  stable=stable+1 if v==previous else 0
  if stable>=6:break
  previous=v;time.sleep(.1)
 rows.append({'port':port,'charts':p('''return [...document.querySelectorAll('[data-metric-rail] article')].map(e=>{const svg=e.querySelector('svg');return {title:e.querySelector('h3,.pc-card-title,figcaption').textContent,guides:svg.querySelectorAll('[data-year-guide]').length,marks:[...svg.querySelectorAll('[data-source-observation],[data-curve-point],[data-publication-mark],[data-trend-point],[data-source-event],[data-growth-series]')].map(m=>{const a=Object.fromEntries([...m.attributes].filter(a=>/^data-/.test(a.name)&&!['data-export-r','data-sankey-width'].includes(a.name)).map(a=>[a.name,a.value]));return {data:a,tag:m.tagName,r:m.tagName==='circle'?Number(m.getAttribute('r'))*Math.hypot(m.getScreenCTM().a,m.getScreenCTM().b):null};})};});''')})
(O/'native-source-delta-final-diagnostic.json').write_text(json.dumps(rows,indent=2))
assert len(rows[0]['charts'])==len(rows[1]['charts'])==24
for a,b in zip(rows[0]['charts'],rows[1]['charts']):
 assert a['title']==b['title']
 assert [(m['data'],m['tag']) for m in a['marks']]==[(m['data'],m['tag']) for m in b['marks']],a['title']
(O/'native-source-delta-final.json').write_text(json.dumps({'rows':rows,'exactNativeSourceMarkIdentity':True},indent=2)+'\n')
print(json.dumps({'charts':24,'sourceMarkIdentity':'identical','output':str(O/'native-source-delta-final.json')}))
