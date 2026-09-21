# Run in browser-harness owned BU_NAME with ATLAS_QA_URL and ATLAS_QA_OUTPUT.
import json,os,time
from pathlib import Path
from urllib.parse import urlparse
BASE=os.environ['ATLAS_QA_URL'];OUT=Path(os.environ['ATLAS_QA_OUTPUT']);OUT.mkdir(parents=True,exist_ok=True)
assert urlparse(BASE).hostname in ('127.0.0.1','localhost')
DATA=json.loads(Path(os.environ['ATLAS_QA_DATA']).read_text())
EXPECTED={p['id']:p for v in DATA.values() for plot in v['plots'] for p in plot['points']}
def val(expr):return js('(() => '+expr+')()')
def shot(name):capture_screenshot(path=str(OUT/(name+'.png')))
def place(selector):
 js('(() => document.querySelector('+json.dumps(selector)+').scrollIntoView({block:"center",behavior:"instant"}))()')
 r=val('document.querySelector('+json.dumps(selector)+').getBoundingClientRect().toJSON()');assert r['width']>0 and r['height']>0;return r
def click(selector):
 r=place(selector);x=r['x']+r['width']/2;y=r['y']+r['height']/2
 assert 0<x<val('innerWidth') and 0<y<val('innerHeight'),r
 assert val('document.querySelector('+json.dumps(selector)+').contains(document.elementFromPoint('+str(x)+','+str(y)+'))'),selector
 click_at_xy(x,y)
def bounds(width):
 b=val('({inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
 assert b['inner']==width and b['scroll']<=width,b
 return b
report=[]
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=False)
 goto_url(BASE+'#draft-charts');wait_for_load();cdp('Page.reload',ignoreCache=True);wait_for_load();cdp('Page.bringToFront');time.sleep(.2)
 for attempt in range(50):
  if val('document.querySelector("main button[aria-current=true]")?.textContent')=='Draft charts':break
  time.sleep(.1)
 assert val('getComputedStyle(document.querySelector(".draft-plot-tick")).fontSize')=='11px'
 assert val('document.querySelector("main button[aria-current=true]")?.textContent')=='Draft charts'
 assert val('document.querySelectorAll("[data-draft-chart-card]").length')==len(DATA)
 assert val('document.querySelectorAll("[data-draft-chart-status=plotted]").length')==sum(v['status']=='plotted' for v in DATA.values())
 assert val('document.querySelectorAll(".draft-plot-svg:not([data-draft-event-timeline])").length')==sum(len(v['plots']) for v in DATA.values())
 actual=val('[...document.querySelectorAll("[data-source-observation]")].map(e=>({id:e.dataset.sourceObservation,label:e.getAttribute("aria-label"),x:e.getAttribute("cx"),y:e.getAttribute("cy"),svg:e.ownerSVGElement.getBoundingClientRect().toJSON(),r:e.getBoundingClientRect().toJSON(),tab:e.getAttribute("tabindex")}))')
 assert len(actual)==len(EXPECTED),(len(actual),len(EXPECTED))
 for p in actual:
  exp=EXPECTED[p['id']];assert exp['label'] in p['label'];assert p['tab']=='0';assert p['x'] not in ['NaN','Infinity'] and p['y'] not in ['NaN','Infinity'];assert p['r']['left']>=p['svg']['left']-1 and p['r']['right']<=p['svg']['right']+1,p
 # Actual rendered SVG text must fit, not only page container.
 clipped=val('[...document.querySelectorAll(".draft-charts svg text")].filter(e=>{let r=e.getBoundingClientRect(),s=e.ownerSVGElement.getBoundingClientRect();return r.left<s.left-1||r.right>s.right+1||r.top<s.top-1||r.bottom>s.bottom+1}).map(e=>({text:e.textContent,r:e.getBoundingClientRect().toJSON(),s:e.ownerSVGElement.getBoundingClientRect().toJSON()}))')
 assert not clipped,clipped
 dimensions=bounds(width)
 # Native point activation, keyboard inspection, and source table disclosure.
 point='[data-source-observation="flywire-neurons"]';click(point);shot('connectome-inspected-'+str(width))
 assert '139,255' in val('document.querySelector('+json.dumps(point)+').closest("figure").innerText')
 press_key('Escape')
 js('(() => document.querySelector('+json.dumps(point)+').focus())()');press_key('Enter')
 assert 'FlyWire' in val('document.querySelector('+json.dumps(point)+').closest("figure").innerText')
 summary='[data-draft-chart-card="Largest published connectome over time"] .draft-plot-data summary';click(summary)
 assert val('document.querySelector('+json.dumps(summary)+').parentElement.open')
 assert val('document.querySelector('+json.dumps(summary)+').parentElement.querySelectorAll("tbody tr").length')==4
 shot('connectome-source-table-'+str(width));click(summary)
 # Existing modal link interaction and exact focus return must survive.
 for anchor in ['tissue-mapped','neural-recording-hours']:
  sel='.draft-charts a[href="#'+anchor+'"]';click(sel);shot('existing-'+anchor+'-'+str(width))
  assert val('document.querySelector("dialog[open]")?.getAttribute("aria-labelledby")')==anchor+'-title'
  press_key('Escape');time.sleep(.2)
  assert val('location.hash')=='#draft-charts'
  assert val('document.activeElement===document.querySelector('+json.dumps(sel)+')')
 # Real gap disclosure: no synthetic axes/marks.
 gap='[data-draft-chart-status="gap"] summary';click(gap)
 assert val('document.querySelector('+json.dumps(gap)+').parentElement.open')
 assert val('document.querySelectorAll("[data-draft-chart-status=gap] svg").length')==0
 shot('evidence-gaps-'+str(width))
 for name,selector in [('mapping','.draft-charts-header'),('connectome','[data-draft-chart-card="Largest published connectome over time"]'),('neuroai','[data-draft-chart-card="NeuroAI performance–cost frontier over time"]'),('applications','[data-draft-chart-card="Demonstrated applications enabled by connectomics over time"]')]:
  js('(() => document.querySelector('+json.dumps(selector)+').scrollIntoView({block:"start",behavior:"instant"}))()');time.sleep(.1)
  r=val('document.querySelector('+json.dumps(selector)+').getBoundingClientRect().toJSON()');assert -1<=r['top']<200,r
  shot(name+'-'+str(width))
 bounds(width)
 report.append(dict(width=width,candidates=len(DATA),points=len(actual),svg_text_unclipped=True,native_point_and_keyboard=True,source_table=True,existing_modals_and_focus=True,explicit_gaps=True,bounds=dimensions))
(OUT/'actual-charts-browser-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
