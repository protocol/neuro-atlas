import os,json,time,base64
from pathlib import Path
BASE=os.environ['BCI_QA_BASE']
OUT=Path(os.environ['BCI_QA_OUT']);OUT.mkdir(parents=True,exist_ok=True)
SLUG='bci-information-transfer-over-time'
TITLE='BCI communication rates over time'
EXPECTED=json.loads(Path(os.environ['BCI_QA_EXPECTED']).read_text())
pre_ids={t['targetId'] for t in cdp('Target.getTargets')['targetInfos'] if t['type']=='page'}
task_tab=new_tab('about:blank')
(OUT/'tab-ownership.json').write_text(json.dumps({'pre_ids':sorted(pre_ids),'task_tab':task_tab},indent=2))
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
 val('''window.__bciPng=null;window.__bciSvg=null;const original=URL.createObjectURL.bind(URL);URL.createObjectURL=(blob)=>{if(blob.type==='image/png')window.__bciPng=blob;if(blob.type==='image/svg+xml;charset=utf-8')window.__bciSvg=blob;return original(blob)};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download?.endsWith('.png'))return;return click.call(this)};return true''')
 click('dialog[open] [data-download-chart]')
 wait('return !!window.__bciPng',45)
 enc=val("return (async()=>{const a=new Uint8Array(await window.__bciPng.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s)})()")
 (OUT/name).write_bytes(base64.b64decode(enc))
 svg=val('return window.__bciSvg.text()')
 (OUT/'native-export.svg').write_text(svg)
 state=val('''return (async()=>{const raw=await window.__bciSvg.text(),host=document.createElement('div');host.style.cssText='position:fixed;left:-20000px;top:0;opacity:0;pointer-events:none';document.body.append(host);try{const root=host.attachShadow({mode:'closed'});root.innerHTML=raw;const svg=root.querySelector('svg'),key=root.querySelector('[data-export-point-key]'),footer=root.querySelector('[data-export-footer]');return {width:+svg.getAttribute('width'),height:+svg.getAttribute('height'),cropBottom:+svg.getAttribute('data-export-crop-bottom'),footerBottom:+footer.querySelector('[data-export-brand]').getAttribute('y')+54,entries:[...key.querySelectorAll('[data-export-point-key-entry]')].map(e=>({text:[...e.querySelectorAll('text')].map(t=>t.textContent).join(' '),bounds:[...e.querySelectorAll('text')].map(t=>{const b=t.getBBox();return {x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height}})})),visible:[...svg.querySelectorAll('text')].map(t=>t.textContent).join(' ')}}finally{host.remove()}})()''')
 assert len(state['entries'])==14,state
 assert [e['text'] for e in state['entries']]==[str(i+1)+'. '+p['exportAnnotation'] for i,p in enumerate(EXPECTED['plot']['points'])],state
 assert state['cropBottom']>state['footerBottom'],state
 assert all(b['y']>state['cropBottom'] and b['x']>=48 and b['right']<=1152.6 and b['bottom']<state['height'] for e in state['entries'] for b in e['bounds']),state
 assert 'gross WPM' not in state['visible'],state
 assert 'PL R&D estimates' in state['visible'] and 'R²(log10) = '+format(EXPECTED['fit']['rSquaredLog10'],'.3f') in state['visible'],state
 assert '1 bit/char' in state['visible'] and '28-symbol' in state['visible'] and 'Mixed-model' in state['visible'],state
 assert state['height']*2 < 2974*.9,state
 (OUT/'compact-export-state.json').write_text(json.dumps(state,indent=2))
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
 assert 'Log-linear fit' in state['trendline']['label'] and str(EXPECTED['fit']['n']) in state['trendline']['label'] and 'text' in state['trendline']['label'] and state['trendline']['preview'],state['trendline']
 coords=[tuple(map(float,p.split(','))) for p in state['trendline']['points'].split()]
 assert len(coords)==2 and all(a[0]<b[0] and a[1]>b[1] for a,b in zip(coords,coords[1:])),coords
 assert 'ordinary least squares' in state['trendline']['note'] and 'R² in log10 space = '+format(EXPECTED['fit']['rSquaredLog10'],'.6f') in state['trendline']['note'],state['trendline']
 assert state['rows']==14 and len(state['marks'])==14,state
 assert not state['restingTooltip'],state
 assert '≈' in state['qualifier'] and 'All plotted values are approximate' not in state['qualifier'],state
 annotations=val('return [...document.querySelectorAll("dialog[open] [data-point-annotation] > span:last-child")].map(e=>e.textContent)')
 assert annotations==[p['annotation'] for p in EXPECTED['plot']['points']],annotations
 state['annotations']=annotations
 tick_state=val('''const s=document.querySelector('dialog[open] svg.draft-plot-svg'), els=[...s.querySelectorAll('.draft-plot-tick[text-anchor="middle"]')];return els.map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,left:r.left,right:r.right}})''')
 assert [q['text'] for q in tick_state]==['2000','2005','2010','2015','2020','2025'],tick_state
 assert all(a['right']+1<=b['left'] for a,b in zip(tick_state,tick_state[1:])),tick_state
 preview_ticks=val('''const s=document.querySelector('[data-draft-preview] [data-reference-trendline="bci-bitrate"]').closest('svg');return [...s.querySelectorAll('.draft-plot-tick[text-anchor="middle"]')].map(e=>e.textContent)''')
 assert preview_ticks==['2000','2005','2010','2015','2020','2025'],preview_ticks
 state['yearTicks']=tick_state
 state['previewYearTicks']=preview_ticks
 assert 'R²(log10) = '+format(EXPECTED['fit']['rSquaredLog10'],'.3f') in state['trendline']['label']
 assert val('return document.querySelector("dialog[open] [data-fit-methodology]")?.href')==EXPECTED['plot']['referenceTrendline']['methodologyUrl']
 assert state['doc']['inner']==width and state['doc']['scroll']<=state['doc']['client']+1,state
 assert not val('const d=document.querySelector("dialog[open]"),dr=d.getBoundingClientRect();return [...d.querySelectorAll("*")].some(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>dr.right+1&&!e.closest(".pc-modal-close")})'), 'Only the inherited close control may straddle the dialog edge'
 assert state['dialog']['scroll']<=state['dialog']['client']+12,state # Existing close control intentionally straddles the modal edge; document remains bounded.
 # A leading italic/antialiased glyph may overhang its x=0 text origin by one CSS unit.
 assert all(t['x']>=-1.2 and t['right']<=t['w']+.6 and t['y']>=-.6 and t['bottom']<=t['h']+.6 for t in state['textBounds']),state['textBounds']
 capture_screenshot(path=str(OUT/('chart-desktop.png' if width==1440 else 'chart-'+str(width)+'.png')))
 # Native keyboard inspection, exact source metric and first/second Escape boundaries.
 val('document.querySelector("dialog[open] [data-source-observation=\\"bci-slide-pandarinath\\"]").focus();return true');press_key('Enter')
 tip=wait('const t=document.querySelector("dialog[open] [role=tooltip]");return t&&t.innerText')
 assert '4.16' in tip and 'Paper-reported' in tip and 'Reported input' in tip,tip
 capture_screenshot(path=str(OUT/('inspection-'+str(width)+'.png')))
 press_key('Escape');wait('return !document.querySelector("dialog[open] [role=tooltip]")');assert val('return !!document.querySelector("dialog[open]")')
 # The three newly selected papers now own native source links and common conversion.
 for point_id,source_url,needle in [
  ('bci-slide-unlabeled-cursor-2015-lower','https://pmc.ncbi.nlm.nih.gov/articles/PMC4426256/#F3','9.4'),
  ('bci-slide-unlabeled-cursor-2016','https://pmc.ncbi.nlm.nih.gov/articles/PMC5326682/','33'),
  ('bci-slide-unlabeled-cursor-2018','https://pmc.ncbi.nlm.nih.gov/articles/PMC6093965/#F0008','6.88')]:
  val('document.querySelector('+json.dumps('dialog[open] [data-source-observation="'+point_id+'"]')+').focus();return true');press_key('Enter')
  text=wait('return document.querySelector("dialog[open] [role=tooltip]")?.innerText')
  assert needle in text and 'PL R&D estimate' in text and ('log2(28)' in text or 'log₂(28)' in text),text
  links=val('return [...document.querySelectorAll("dialog[open] [role=tooltip] a")].map(a=>a.href)')
  assert source_url in links and not val('return !!document.querySelector("dialog[open] [role=tooltip] [data-candidate-sources]")'),links
  if width==1440:capture_screenshot(path=str(OUT/(point_id+'-source.png')))
  press_key('Escape');wait('return !document.querySelector("dialog[open] [role=tooltip]")')
 # Every speech inspection retains the original study and adds the separate entropy reference.
 speech_checks=[]
 for point_id in ['bci-slide-moses','bci-slide-willett-speech','bci-slide-metzger','bci-slide-card-2024','bci-slide-card-home']:
  expected_point=next(p for p in EXPECTED['plot']['points'] if p['id']==point_id)
  val('document.querySelector('+json.dumps('dialog[open] [data-source-observation="'+point_id+'"]')+').focus();return true');press_key('Enter')
  text=wait('return document.querySelector("dialog[open] [role=tooltip]")?.innerText')
  links=val('return [...document.querySelectorAll("dialog[open] [role=tooltip] a")].map(a=>a.href)')
  stanford='https://cs.stanford.edu/people/eroberts/courses/soco/projects/1999-00/information-theory/entropy_of_english_9.html'
  assert expected_point['sourceUrl'] in links and stanford in links,(point_id,links)
  assert 'PL R&D estimate' in text and '1' in text and 'characters/word' in text and 'log2(28)' not in text,(point_id,text)
  speech_checks.append({'id':point_id,'text':text,'links':links})
  if point_id=='bci-slide-willett-speech':capture_screenshot(path=str(OUT/('speech-source-'+str(width)+'.png')))
  press_key('Escape');wait('return !document.querySelector("dialog[open] [role=tooltip]")')
 state['speechChecks']=speech_checks
 val('document.querySelector("dialog[open] [data-source-observation=\\"bci-slide-handwriting\\"]").focus();return true');press_key('Enter')
 handwriting=wait('return document.querySelector("dialog[open] [role=tooltip]")?.innerText')
 assert '90' in handwriting and 'log2(28)' in handwriting and '7.21' in handwriting,handwriting
 state['handwritingUnchanged']=handwriting
 press_key('Escape');wait('return !document.querySelector("dialog[open] [role=tooltip]")')
 if width==1440:
  for unknown in [p for p in EXPECTED['plot']['points'] if p.get('candidateSources')]:
   val('document.querySelector('+json.dumps('dialog[open] [data-source-observation="'+unknown['id']+'"]')+').focus();return true');press_key('Enter')
   wait('return !!document.querySelector("dialog[open] [role=tooltip] [data-candidate-sources]")')
   links=val('return [...document.querySelectorAll("dialog[open] [role=tooltip] [data-candidate-sources] a")].map(a=>a.href)')
   assert links==[c['url'] for c in unknown['candidateSources']],(unknown['id'],links)
   if unknown['id'].endswith('2018'):capture_screenshot(path=str(OUT/'candidate-2018.png'))
   press_key('Escape');wait('return !document.querySelector("dialog[open] [role=tooltip]")')
  val('document.querySelector('+json.dumps('dialog[open] [data-source-observation="bci-slide-moses"]')+').focus();return true');press_key('Enter')
  wait('return document.querySelector("dialog[open] [role=tooltip]")?.innerText.includes("PL R&D estimate")')
  capture_screenshot(path=str(OUT/'plrd-estimate.png'))
  press_key('Escape');wait('return !document.querySelector("dialog[open] [role=tooltip]")')
  export_png('bci-bitrate-native-export.png')
 clipboard_checks(width)
 press_key('Escape');wait('return !document.querySelector("dialog[open]")')
 # The card actually exists in the current rail, and opens via a trusted click.
 click('[data-draft-popout-trigger="metric-panel-bci-bitrate"]')
 wait('return document.querySelector("dialog[open] h2")?.textContent==='+json.dumps(TITLE))
 press_key('Escape');wait('return !document.querySelector("dialog[open]")')
 assert val('return document.activeElement?.dataset.draftPopoutTrigger==="metric-panel-bci-bitrate"')
 val('history.forward();return true');wait('return !!document.querySelector("dialog[open]")')
 val('history.back();return true');wait('return !document.querySelector("dialog[open]")')
 results.append({'width':width,'state':state,'nativeInspection':True,'remainingCandidateLinksExplicitlyUnconfirmed':True,'threeSelectedSourcesVerified':True,'nativeCardOpenEscapeFocus':True,'historyForwardBack':True,'copyLinkReadback':True})
 (OUT/'native-qa.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'task_tab':task_tab,'cases':len(results),'passed':True,'widths':[r['width']for r in results]}))
