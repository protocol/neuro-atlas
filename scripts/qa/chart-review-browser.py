import json,time
from pathlib import Path
R=Path(globals().get('ATLAS_REVIEW_OUT','/opt/data/tmp/atlas-chart-review-replay'));R.mkdir(parents=True,exist_ok=True);O=R/'native-qa';O.mkdir(exist_ok=True)
BASE=globals().get('ATLAS_REVIEW_URL','http://127.0.0.1:3278/neuro-atlas/field-velocity');DATA=json.loads(Path(globals().get('ATLAS_REVIEW_DATA','src/data/draft-chart-evidence.json')).read_text());records=[]
keys=['acquisition-economics','connectomics-roboem-human-split-merge','neuralink-cumulative','precision-temporary-recording','neuralink-private-intracortical-hours','paired-manual','public-data-size']
plots={p['id']:p for c in DATA.values() for p in c['plots']}
def until(fn,name):
 for _ in range(100):
  v=fn()
  if v:return v
  time.sleep(.08)
 raise AssertionError(name)
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1050,deviceScaleFactor=1,mobile=False)
 goto_url('about:blank');goto_url(BASE+'#metric-panel-acquisition-economics');wait_for_load()
 until(lambda:js("document.querySelector('[aria-current=true]')?.textContent==='Metrics'&&document.querySelector('[data-source-observation=exm2015]')!==null"),'hydrated metrics')
 for key in keys:
  anchor='metric-panel-'+key;goto_url(BASE+'#'+anchor);wait_for_load()
  until(lambda:js(f"(() => {{let e=document.getElementById({json.dumps(anchor)});return e&&!e.closest('[hidden]')}})()"),'visible '+key)
  sel='#draft-panel-'+key+' .draft-plot'
  js(f"document.querySelector({json.dumps(sel)}).scrollIntoView({{behavior:'instant',block:'start'}})")
  result=js(f"(() => {{const f=document.querySelector({json.dumps(sel)}),e=f.querySelector('.draft-plot-svg'),r=e.getBoundingClientRect();return {{width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,viewBox:e.getAttribute('viewBox'),marks:[...e.querySelectorAll('[data-source-observation]')].map(p=>({{id:p.dataset.sourceObservation,tag:p.tagName,fill:getComputedStyle(p).fill,label:p.getAttribute('aria-label'),tabindex:p.getAttribute('tabindex')}})),x:r.x,right:r.right}};}})()")
  assert result['width']==width and result['scroll']<=width+1,result
  assert [p['id'] for p in result['marks']]==[p['id'] for p in plots[key]['points']],key
  assert all(p['tabindex']=='0' and p['label'] for p in result['marks']),key
  if key=='connectomics-roboem-human-split-merge':assert [sum(p['tag']==t for p in result['marks']) for t in ['circle','rect','polygon']]==[4,5,3],result
  # Native focus/keyboard interaction keeps all marker glyphs inspectable.
  mid=result['marks'][-1]['id'];js(f"document.querySelector('[data-source-observation={mid}]').focus()")
  press_key('Enter')
  until(lambda:js(f"!!document.querySelector({json.dumps(sel)}+' [role=tooltip]')"),'inspector '+key)
  js(f"document.querySelector({json.dumps(sel)}).scrollIntoView({{behavior:'instant',block:'start'}})")
  if key in ['acquisition-economics','connectomics-roboem-human-split-merge','neuralink-cumulative','neuralink-private-intracortical-hours','public-data-size']:
   capture_screenshot(path=str(O/f'{width}-{key}.png'))
  records.append({'case':key,'width':width,'marks':len(result['marks']),'passed':True})
 for old,new in [('draft-panel-connectomics-roboem-mouse-split-merge','draft-panel-connectomics-roboem-human-split-merge'),('metric-panel-connectomics-roboem-mouse-split-merge','draft-panel-connectomics-roboem-human-split-merge'),('draft-panel-paradromics-connect-one','draft-panel-neuralink-cumulative'),('metric-panel-paradromics-connect-one','draft-panel-neuralink-cumulative')]:
  goto_url(BASE+'#'+old);wait_for_load()
  until(lambda:js(f"(() => {{let a=document.getElementById({json.dumps(old)}),p=document.getElementById({json.dumps(new)});return !!a&&!!p&&!p.closest('[hidden]')&&a.closest('[data-draft-panel]')===p}})()"),'alias '+old)
  records.append({'case':old,'width':width,'passed':True})
 print('Passed viewport',width,flush=True)
cdp('Emulation.clearDeviceMetricsOverride')
(R/'native-qa-receipt.json').write_text(json.dumps({'sha':globals().get('ATLAS_REVIEW_SHA','unprovided'),'cases':records,'limits':'loopback disposable fixture; desktop viewport emulation, not physical phone; production auth unchanged'},indent=2))
print('Passed',len(records),'native cases')
