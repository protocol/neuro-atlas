"""Canonical headed-browser replay; serve an isolated loopback fixture only."""
import base64,json,os,time
from pathlib import Path
BASE=os.environ['SECTOR_QA_BASE'].rstrip('/')
OUT=Path(os.environ['SECTOR_QA_OUT']);OUT.mkdir(parents=True,exist_ok=True)
assert BASE.startswith('http://127.0.0.1:')
def wait_js(expr,timeout=20):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  value=js(expr)
  if value:return value
  time.sleep(.15)
 raise AssertionError(expr)
results=[]
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=False)
 goto_url('about:blank');wait_for_load()
 goto_url(BASE+'/neuro-atlas/field-velocity?qa=sector-type#researcher-sectors');wait_for_load()
 assert wait_for_element('dialog[open] .publication-plot-2 svg',visible=True)
 cdp('Page.bringToFront')
 wait_js('''return (()=>{const t=document.querySelector('dialog .publication-plot-2 svg text');return t&&Math.abs(parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a-24)<.05})()''')
 state=js('''return (()=>{const d=document.querySelector('dialog[open]'),s=d.querySelector('.publication-plot-2 svg'),box=s.getBoundingClientRect();return {title:d.querySelector('h2').textContent,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,marks:s.querySelectorAll('rect[data-sector]').length,inspector:d.querySelector('[data-publication-inspector]').textContent,texts:[...s.querySelectorAll('text')].map(t=>{const b=t.getBoundingClientRect();return {text:t.textContent,size:parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a,left:b.left,right:b.right,top:b.top,bottom:b.bottom}}),svg:{left:box.left,right:box.right,top:box.top,bottom:box.bottom}}})()''')
 assert state['title']=='Researchers by publication sector' and state['marks']==100 and state['inspector']=='',state
 assert state['scroll']<=state['client']+1,state
 for i,t in enumerate(state['texts']):
  assert abs(t['size']-(24 if i%2==0 else 16))<.05,t
  assert t['left']>=state['svg']['left']-1 and t['right']<=state['svg']['right']+1 and t['top']>=state['svg']['top']-1 and t['bottom']<=state['svg']['bottom']+1,t
  for b in state['texts'][i+1:]:
   assert min(t['right'],b['right'])-max(t['left'],b['left'])<.5 or min(t['bottom'],b['bottom'])-max(t['top'],b['top'])<.5,{'overlap':[t,b]}
 capture_screenshot(str(OUT/f'sector-type-{width}.png'))
 if width<700:
  # The direct key remains visible without horizontally scrolling the large plot.
  key=js('''return (()=>{const e=document.querySelector('[data-publication-sector-key]');return {text:e.innerText,display:getComputedStyle(e).display}})()''')
  assert key['display']!='none' and '24,228' in key['text'] and '347' in key['text'],key
  js("const p=document.querySelector('dialog .publication-plot-2');p.scrollLeft=p.scrollWidth;return p.scrollLeft")
  capture_screenshot(str(OUT/f'sector-type-{width}-labels.png'))
 js("document.querySelector('dialog .publication-plot-2 g[data-publication-mark]').focus();return true")
 press_key('Enter')
 wait_js('return !!document.querySelector("dialog [data-point-tooltip]")')
 text=js('return document.querySelector("dialog [data-point-tooltip]").textContent')
 assert '24,228' in text and '78.2%' in text,text
 press_key('Escape');wait_js('return !document.querySelector("dialog [data-point-tooltip]")')
 assert js('return !!document.querySelector("dialog[open]")')
 # The real native Download PNG runs; intercept only the final local download.
 js('''window.__sectorPng=null;const original=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type==='image/png')window.__sectorPng=blob;return original(blob)};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download?.endsWith('.png'))return;return click.call(this)};return true''')
 js('document.querySelector("dialog [data-download-chart=researcher-sectors]").scrollIntoView({block:"center"});return true')
 target=js('''return (()=>{const b=document.querySelector('dialog [data-download-chart=researcher-sectors]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()''')
 click_at_xy(target['x'],target['y'])
 wait_js('return !!window.__sectorPng',30)
 payload=js('''return (async()=>{const a=new Uint8Array(await window.__sectorPng.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s)})()''')
 (OUT/f'sector-export-{width}.png').write_bytes(base64.b64decode(payload))
 press_key('Escape');wait_js('return !document.querySelector("dialog[open]")')
 results.append({'width':width,'state':state,'sourcePopup':text,'pngHandler':'passed'})
(OUT/'native-results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'widths':[r['width'] for r in results],'nativeChecks':'passed','screenshotsAndExports':len(list(OUT.glob('*.png')))}))
