import os,json,time,base64
from pathlib import Path
BASE=os.environ['BCI_QA_BASE']
OUT=Path(os.environ['BCI_QA_OUT']);OUT.mkdir(parents=True,exist_ok=True)
SLUG='bci-information-transfer-over-time'
TITLE='BCI information transfer over time'
def val(s):return js('(() => {'+s+'})()')
def wait(s,seconds=25):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  z=val(s)
  if z:return z
  time.sleep(.08)
 raise AssertionError(s)
def click(sel):
 val('const e=document.querySelector('+json.dumps(sel)+');e.scrollIntoView({block:"center"});return true')
 capture_screenshot(path=str(OUT/'before-action.png'))
 r=val('const e=document.querySelector('+json.dumps(sel)+'),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
 assert r['hit'],r
 click_at_xy(r['x'],r['y'])
def export_png(name):
 val('''window.__bciPng=null;const original=URL.createObjectURL.bind(URL);URL.createObjectURL=(blob)=>{if(blob.type==='image/png')window.__bciPng=blob;return original(blob)};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download?.endsWith('.png'))return;return click.call(this)};return true''')
 click('dialog[open] [data-download-chart]')
 wait('return !!window.__bciPng',45)
 enc=val("return (async()=>{const a=new Uint8Array(await window.__bciPng.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s)})()")
 (OUT/name).write_bytes(base64.b64decode(enc))
def clipboard_checks(width):
 permission=js('(async()=> (await navigator.permissions.query({name:"clipboard-read"})).state)()')
 cdp('Browser.setPermission',permission={'name':'clipboard-read'},setting='granted',origin=BASE)
 try:
  click('dialog[open] [data-copy-draft-link]')
  wait('return document.querySelector("dialog[open] .draft-chart-share [role=status]")?.textContent==="Copied"')
  cdp('Page.bringToFront')
  link=js('(async()=>await navigator.clipboard.readText())()')
  assert link==BASE+'/neuro-atlas/field-velocity?bci-qa='+str(width)+'#'+SLUG,link
  if width==1440:
   click('dialog[open] [data-copy-chart]')
   wait('return document.querySelector("dialog[open] .pc-share [role=status]")?.textContent.startsWith("Chart copied.")',45)
   cdp('Page.bringToFront')
   item=js("""(async()=>{const items=await navigator.clipboard.read(),i=items.find(i=>i.types.includes('image/png'));if(!i)return {types:items.map(i=>i.types)};const b=await i.getType('image/png'),a=new Uint8Array(await b.arrayBuffer());let s='';for(let n=0;n<a.length;n+=8192)s+=String.fromCharCode(...a.subarray(n,n+8192));const img=await createImageBitmap(b);return {types:i.types,width:img.width,height:img.height,png:btoa(s),text:await (await i.getType('text/plain')).text()}})()""")
   assert 'image/png' in item['types'] and 'text/plain' in item['types'],item
   assert item['text']==BASE+'/neuro-atlas/field-velocity#'+SLUG,item['text']
   (OUT/'bci-bitrate-native-clipboard.png').write_bytes(base64.b64decode(item.pop('png')))
   (OUT/'clipboard.json').write_text(json.dumps(item,indent=2)+'\n')
 finally:
  cdp('Browser.setPermission',permission={'name':'clipboard-read'},setting=permission,origin=BASE)
results=[]
cdp('Page.bringToFront')
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=width < 600)
 goto_url('about:blank');wait_for_load();goto_url(BASE+'/neuro-atlas/field-velocity?bci-qa='+str(width)+'#'+SLUG);wait_for_load();cdp('Page.bringToFront')
 wait('return document.querySelector("dialog[open] h2")?.textContent==='+json.dumps(TITLE))
 wait('return document.fonts.status==="loaded"')
 wait('const f=document.querySelector("dialog[open] figure.draft-plot"),s=f.querySelector("svg.draft-plot-svg");return Math.abs(s.viewBox.baseVal.width-Math.round(f.getBoundingClientRect().width))<.5')
 wait('return document.querySelectorAll("dialog[open] [data-source-observation]").length===14')
 time.sleep(.2)
 state=val('''const d=document.querySelector('dialog[open]'),s=d.querySelector('svg.draft-plot-svg');return {title:d.querySelector('h2').textContent,marks:[...s.querySelectorAll('[data-source-observation]')].map(e=>({id:e.dataset.sourceObservation,tag:e.tagName,label:e.getAttribute('aria-label')})),rows:d.querySelectorAll('tbody tr').length,restingTooltip:!!d.querySelector('[role=tooltip]'),qualifier:d.querySelector('[data-visible-qualifications]')?.textContent,doc:{inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth},dialog:{client:d.clientWidth,scroll:d.scrollWidth},focus:document.activeElement?.textContent?.slice(0,30),textBounds:[...s.querySelectorAll('text')].map(e=>{const r=e.getBBox();return {text:e.textContent,x:r.x,y:r.y,right:r.x+r.width,bottom:r.y+r.height,w:s.viewBox.baseVal.width,h:s.viewBox.baseVal.height}})}''')
 state['trendline']=val("const d=document.querySelector('dialog[open]'),p=d.querySelector('[data-reference-trendline]');return {points:p.getAttribute('points'),label:d.querySelector('[data-reference-trendline-key]').textContent,note:p.querySelector('title').textContent,preview:!!document.querySelector('[data-draft-preview] [data-reference-trendline]')}")
 assert 'Log-linear fit' in state['trendline']['label'] and '14 approximate points' in state['trendline']['label'] and state['trendline']['preview'],state['trendline']
 coords=[tuple(map(float,p.split(','))) for p in state['trendline']['points'].split()]
 assert len(coords)==2 and all(a[0]<b[0] and a[1]>b[1] for a,b in zip(coords,coords[1:])),coords
 assert 'ordinary least squares' in state['trendline']['note'] and 'R² in log10 space = 0.46' in state['trendline']['note'],state['trendline']
 assert state['rows']==14 and len(state['marks'])==14,state
 assert not state['restingTooltip'],state
 assert 'approximate' in state['qualifier'].lower(),state
 assert state['doc']['inner']==width and state['doc']['scroll']<=state['doc']['client']+1,state
 assert not val('const d=document.querySelector("dialog[open]"),dr=d.getBoundingClientRect();return [...d.querySelectorAll("*")].some(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>dr.right+1&&!e.closest(".pc-modal-close")})'), 'Only the inherited close control may straddle the dialog edge'
 assert state['dialog']['scroll']<=state['dialog']['client']+12,state # Existing close control intentionally straddles the modal edge; document remains bounded.
 assert all(t['x']>=-.6 and t['right']<=t['w']+.6 and t['y']>=-.6 and t['bottom']<=t['h']+.6 for t in state['textBounds']),state['textBounds']
 capture_screenshot(path=str(OUT/('chart-desktop.png' if width==1440 else 'chart-'+str(width)+'.png')))
 # Native keyboard inspection, exact source metric and first/second Escape boundaries.
 val('document.querySelector("dialog[open] [data-source-observation=\\"bci-slide-pandarinath\\"]").focus();return true');press_key('Enter')
 tip=wait('const t=document.querySelector("dialog[open] [role=tooltip]");return t&&t.innerText')
 assert '4.16' in tip and 'digitized' in tip,tip
 capture_screenshot(path=str(OUT/('inspection-'+str(width)+'.png')))
 press_key('Escape');wait('return !document.querySelector("dialog[open] [role=tooltip]")');assert val('return !!document.querySelector("dialog[open]")')
 # Unknown points must disclose no source, not render an invented link.
 val('document.querySelector("dialog[open] [data-source-observation=\\"bci-slide-unlabeled-cursor-2016\\"]").focus();return true');press_key('Enter')
 wait('return document.querySelector("dialog[open] [role=tooltip]")?.innerText.includes("unresolved")')
 assert not val('return !!document.querySelector("dialog[open] [role=tooltip] a")')
 press_key('Escape');wait('return !document.querySelector("dialog[open] [role=tooltip]")')
 if width==1440:export_png('bci-bitrate-native-export.png')
 clipboard_checks(width)
 press_key('Escape');wait('return !document.querySelector("dialog[open]")')
 # The card actually exists in the current rail, and opens via a trusted click.
 click('[data-draft-popout-trigger="metric-panel-bci-bitrate"]')
 wait('return document.querySelector("dialog[open] h2")?.textContent==='+json.dumps(TITLE))
 press_key('Escape');wait('return !document.querySelector("dialog[open]")')
 assert val('return document.activeElement?.dataset.draftPopoutTrigger==="metric-panel-bci-bitrate"')
 val('history.forward();return true');wait('return !!document.querySelector("dialog[open]")')
 val('history.back();return true');wait('return !document.querySelector("dialog[open]")')
 results.append({'width':width,'state':state,'nativeInspection':True,'unknownNoFakeLink':True,'nativeCardOpenEscapeFocus':True,'historyForwardBack':True,'copyLinkReadback':True})
 (OUT/'native-qa.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'cases':len(results),'passed':True,'widths':[r['width']for r in results]}))
