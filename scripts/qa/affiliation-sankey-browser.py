import json,time,base64,pathlib,os
ROOT=pathlib.Path(os.environ.get('SANKEY_QA_OUT',str(pathlib.Path.cwd()/'.qa/affiliation-sankey')));ROOT.mkdir(exist_ok=True)
BASE=os.environ.get('SANKEY_QA_BASE','http://127.0.0.1:3320')
DATA=pathlib.Path(os.environ.get('SANKEY_QA_DATA',str(pathlib.Path.cwd()/'src/data/publications/publication-charts.snapshot.json')))
snapshot=json.loads(DATA.read_text());sectors=['Academic','Industry','Other institutions','No listed affiliation']
rows=snapshot['tables']['nt_talent_endpoints']['rows'];audit=snapshot['audit']['affiliationEndpointCohort']
expected={(r[0],sectors[i]):r[i+1] for r in rows for i in range(4)}
total=sum(expected.values());assert total==audit['eligibleAuthors']
results=[]
for width in [1440,390,320]:
  cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000 if width==1440 else 900,deviceScaleFactor=1,mobile=False)
  goto_url(BASE+f'/neuro-atlas/field-velocity?sankeyQA=fddf3cf-{width}#researcher-sector-changes');wait_for_load();assert wait_for_element('dialog[open] [data-sankey-node]',visible=True)
  cdp('Page.bringToFront')
  state=js('''return (()=>{const svg=document.querySelector('dialog .publication-sankey'),r=svg.getBoundingClientRect();return {w:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,width:r.width,height:r.height,labels:[...svg.querySelectorAll('[data-sankey-label]')].map(t=>{const b=t.getBoundingClientRect();return {text:t.textContent,left:b.left-r.left,right:b.right-r.left,top:b.top-r.top,bottom:b.bottom-r.top,pixels:parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a}}),nodes:[...svg.querySelectorAll('[data-sankey-node]')].map(n=>({side:n.dataset.side,sector:n.dataset.sector,count:Number(n.dataset.count)})),marks:[...svg.querySelectorAll('[data-publication-mark]')].map(p=>({from:p.dataset.from,to:p.dataset.to,count:Number(p.dataset.value),width:Number(p.dataset.sankeyWidth),same:p.dataset.sameSector})),inspector:document.querySelector('[data-publication-inspector]').textContent,subtitle:document.querySelector('[data-change-subtitle]').textContent}})()''')
  assert state['w']==width and state['scroll']<=state['client']
  assert len(state['labels'])==8 and len(state['nodes'])==8
  actual={(p['from'],p['to']):p['count'] for p in state['marks']};assert actual=={k:v for k,v in expected.items() if v>0}
  for n in state['nodes']:
    wanted=sum(v for (s,t),v in expected.items() if (s if n['side']=='source' else t)==n['sector'])
    assert n['count']==wanted
  ratios=[m['width']/m['count'] for m in state['marks']];assert max(ratios)-min(ratios)<1e-9
  assert state['inspector']==''
  for a in state['labels']:
    assert a['left']>=-1 and a['right']<=state['width']+1 and a['top']>=0 and a['bottom']<=state['height']+1,a
    assert a['pixels']>=13,a
  for i,a in enumerate(state['labels']):
    for b in state['labels'][i+1:]:
      assert not(min(a['right'],b['right'])>max(a['left'],b['left'])+1 and min(a['bottom'],b['bottom'])>max(a['top'],b['top'])+1),(a,b)
  capture_screenshot(path=str(ROOT/f'full-{width}.png'))
  if width<700:
    js("document.querySelector('dialog .publication-full-plot').scrollLeft=9999")
    capture_screenshot(path=str(ROOT/f'full-{width}-right.png'))
  # Actual SVG focus/keyboard and endpoint interpretation, never continuous-stayer wording.
  js("document.querySelector('dialog [data-same-sector=\"true\"]').focus()")
  assert 'Same sector at first and latest paper' in js("return document.querySelector('[data-publication-inspector]').textContent")
  press_key('Tab')
  assert js("return document.activeElement.hasAttribute('data-publication-mark')")
  # The exact downloaded anonymous source must contain every cell, and retain the old null diagonals.
  download=js("return JSON.parse(decodeURIComponent(document.querySelector('dialog a[download$=\"-source.json\"]').href.split(',')[1]))")
  assert download['tables']['nt_talent_endpoints']==snapshot['tables']['nt_talent_endpoints']
  assert download['tables']['nt_talent_moves']==snapshot['tables']['nt_talent_moves']
  press_key('Escape');assert not js("return !!document.querySelector('dialog[open]')")
  js("document.querySelector('[data-publication-card=\"researcher-sector-changes\"] .publication-preview').scrollIntoView({block:'center',inline:'center'})")
  time.sleep(.2)
  preview=js('''return (()=>{const svg=[...document.querySelectorAll('[data-publication-card="researcher-sector-changes"] .publication-preview svg')].find(s=>!s.closest('[inert]'));const r=svg.getBoundingClientRect();return {width:r.width,height:r.height,marks:svg.querySelectorAll('[data-publication-mark]').length,labels:[...svg.querySelectorAll('[data-sankey-label]')].map(t=>{const b=t.getBoundingClientRect();return {text:t.textContent,left:b.left-r.left,right:b.right-r.left,top:b.top-r.top,bottom:b.bottom-r.top,pixels:parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a}})}})()''')
  assert preview['marks']==len(actual)
  for a in preview['labels']:
    assert a['left']>=-1 and a['right']<=preview['width']+1 and a['bottom']<=preview['height']+1,a
    assert abs(a['pixels']-11)<.15,a
  for i,a in enumerate(preview['labels']):
    for b in preview['labels'][i+1:]:
      assert not(min(a['right'],b['right'])>max(a['left'],b['left'])+1 and min(a['bottom'],b['bottom'])>max(a['top'],b['top'])+1),(a,b)
  capture_screenshot(path=str(ROOT/f'preview-{width}.png'))
  results.append({'width':width,'full':state,'preview':preview})
(ROOT/'geometry.json').write_text(json.dumps({'eligibleAuthors':total,'audit':audit,'states':results},indent=2))
# Full PNG through the actual native Download PNG click. Base paints must survive selected flow styling.
cdp('Emulation.setDeviceMetricsOverride',width=1440,height=1000,deviceScaleFactor=1,mobile=False)
goto_url(BASE+'/neuro-atlas/field-velocity?sankeyQA=fddf3cf-png#researcher-sector-changes');wait_for_load();assert wait_for_element('dialog[open] [data-sankey-node]',visible=True)
js("document.querySelector('dialog [data-same-sector=\"true\"]').focus();window.__pngs=[];window.__oldCreate=URL.createObjectURL;URL.createObjectURL=(blob)=>{if(blob.type==='image/png')window.__pngs.push(blob);return window.__oldCreate(blob)}")
box=js("return (()=>{const b=document.querySelector('dialog [data-download-chart]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()")
click_at_xy(box['x'],box['y'])
for _ in range(50):
  if js('return window.__pngs.length'):break
  time.sleep(.15)
assert js('return window.__pngs.length')==1
encoded=js('''return (async()=>{const b=new Uint8Array(await window.__pngs[0].arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s)})()''',await_promise=True)
(ROOT/'export.png').write_bytes(base64.b64decode(encoded))
print({'result':'PASS','widths':[1440,390,320],'eligibleAuthors':total,'ribbons':len(actual),'sameSectorAuthors':audit['sameSectorAuthors'],'changedSectorAuthors':audit['changedSectorAuthors'],'nativePNGBytes':(ROOT/'export.png').stat().st_size})
