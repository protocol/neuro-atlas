import json,time
from pathlib import Path
out=[]
def p(s):return js('(() => {'+s+'})()')
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=width<600)
 goto_url('about:blank');goto_url('http://127.0.0.1:35642/neuro-atlas/field-velocity');wait_for_load();assert wait_for_element('[data-performance-card="simultaneously-recorded-neurons"]',visible=True);cdp('Page.bringToFront');js('return document.fonts.ready.then(()=>true)')
 for _ in range(100):
  radii=p('''return [...document.querySelectorAll('[data-metric-rail] article circle[data-export-r]')].map(e=>Number(e.getAttribute('r'))*Math.hypot(e.getScreenCTM().a,e.getScreenCTM().b));''')
  if radii and all(abs(r-5)<.02 for r in radii):break
  time.sleep(.08)
 assert radii and all(abs(r-5)<.02 for r in radii),(width,radii)
 gap=p('''return [...document.querySelectorAll('[data-publication-card="publication-growth"] [data-growth-series]')].map(e=>{const t=e.parentElement.querySelector('[data-growth-label="neurotech"]'),m=e.getScreenCTM();return {gap:(Number(t.getAttribute('x'))-Number(e.getAttribute('cx'))-Number(e.getAttribute('r')))*Math.hypot(m.a,m.b),value:t.textContent};});''')
 assert len(gap)==21 and all(abs(x['gap']-6)<.02 for x in gap),(width,gap)
 # Real native horizontal-wheel input changes the rail without document overflow.
 rect=p('''const r=document.querySelector('[data-metric-rail]');r.scrollIntoView({block:'center',behavior:'instant'});r.scrollLeft=0;return r.getBoundingClientRect().toJSON();''')
 cdp('Input.dispatchMouseEvent',type='mouseWheel',x=max(rect['x']+50,50),y=rect['y']+150,deltaX=350,deltaY=0)
 for _ in range(50):
  left=p('return document.querySelector("[data-metric-rail]").scrollLeft;')
  if left>10:break
  time.sleep(.05)
 assert left>10,(width,'native horizontal wheel did not scroll')
 assert p('return innerWidth===document.documentElement.clientWidth&&document.documentElement.scrollWidth===document.documentElement.clientWidth;') if width<600 else p('return document.documentElement.scrollWidth===document.documentElement.clientWidth;')
 out.append({'width':width,'previewFixedCircleCount':len(radii),'radiusMin':min(radii),'radiusMax':max(radii),'growthValueLabels':len(gap),'growthMinimumGap':min(x['gap'] for x in gap),'nativeWheelScrollLeft':left})
Path('/opt/data/tmp/atlas-chart-legibility-20261112/native-final-extra.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
