import time, json, base64
from pathlib import Path
from PIL import Image
OUT=Path('/opt/data/tmp/atlas-export-footnotes-evidence'); OUT.mkdir(exist_ok=True)
BASE='http://127.0.0.1:35973'
def q(body): return js('(() => {'+body+'})()')
def stable(selector):
 cdp('Page.bringToFront'); assert wait_for_element(selector,visible=True),selector
 js('return document.fonts.ready.then(()=>true)')
 old=None; n=0
 for _ in range(80):
  v=q('const r=document.querySelector('+json.dumps(selector)+').getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(v=>Math.round(v*10)/10);')
  n=n+1 if old==v else 0
  if n>=3:return
  old=v;time.sleep(.05)
 raise AssertionError('Unstable '+selector)
def click(selector):
 q('document.querySelector('+json.dumps(selector)+').scrollIntoView({block:"nearest",behavior:"instant"});')
 stable(selector)
 r=q('return document.querySelector('+json.dumps(selector)+').getBoundingClientRect().toJSON();')
 x=r['x']+r['width']/2;y=r['y']+r['height']/2
 assert q('return document.querySelector('+json.dumps(selector)+').contains(document.elementFromPoint('+str(x)+','+str(y)+'));')
 click_at_xy(x,y)
def load(path,title):
 goto_url('about:blank');wait_for_load();goto_url(BASE+path);wait_for_load();stable('dialog[open] [data-download-chart]')
 assert q('return document.querySelector("dialog[open] h2").textContent')==title
 q('''window.__qaPng=null;window.__qaSvg=null;const make=URL.createObjectURL;URL.createObjectURL=function(blob){if(blob.type.startsWith('image/svg+xml'))blob.text().then(s=>window.__qaSvg=s);return make.call(this,blob)};document.addEventListener('click',async e=>{const a=e.target.closest('a[download]');if(!a||!a.download.startsWith('neuro-atlas-'))return;e.preventDefault();const b=await(await fetch(a.href)).blob();const r=new FileReader();r.onload=()=>window.__qaPng=r.result;r.readAsDataURL(b)},true);''')
def save_download(name):
 q('window.__qaPng=null;window.__qaSvg=null;');click('dialog[open] [data-download-chart]')
 for _ in range(200):
  if q('return typeof window.__qaPng==="string"&&typeof window.__qaSvg==="string"'):break
  time.sleep(.05)
 value=q('return {png:window.__qaPng,svg:window.__qaSvg,status:document.querySelector("dialog[open] [data-chart-share] [role=status]").textContent};')
 assert value['png'] and value['svg'],value['status']
 png=OUT/(name+'.png');png.write_bytes(base64.b64decode(value['png'].split(',',1)[1]));(OUT/(name+'.svg')).write_text(value['svg'])
 info=q('''const d=new DOMParser().parseFromString(window.__qaSvg,'image/svg+xml');const f=d.querySelector('[data-export-footer]'),logo=f.querySelector('[data-export-brand]'),notes=[...d.querySelectorAll('[data-export-note]')];return {width:Number(d.documentElement.getAttribute('width')),height:Number(d.documentElement.getAttribute('height')),cropBottom:Number(d.documentElement.getAttribute('data-export-crop-bottom')),footerBottom:Math.max(Number(logo.getAttribute('y'))+Number(logo.getAttribute('height')),...[...f.querySelectorAll('text')].map(t=>Number(t.getAttribute('y')))),notes:notes.map(n=>({text:[...n.querySelectorAll('text')].map(t=>t.textContent).join(' '),y:Number(n.querySelector('text').getAttribute('y')),color:n.querySelector('[data-export-note-key]')?.getAttribute('fill'),type:[...n.querySelectorAll('text')].map(t=>[t.getAttribute('font-size'),t.getAttribute('fill')])})),marks:[...d.querySelectorAll('[data-source-observation],[data-curve-point],[data-trend-point]')].map(n=>[n.getAttribute('cx'),n.getAttribute('cy'),n.getAttribute('data-value')])};''')
 assert info['footerBottom']<info['cropBottom']<min(n['y']-14 for n in info['notes'])
 assert all(t==['14','#667085'] for n in info['notes'] for t in n['type'])
 image=Image.open(png).convert('RGB');assert image.getpixel((0,0))==(255,255,255)
 assert image.width==info['width']*2
 info.update(file=png.name,nativePngWidth=image.width,nativePngHeight=image.height)
 return info
cdp('Emulation.setDeviceMetricsOverride',width=1440,height=1000,deviceScaleFactor=1,mobile=False)
new_tab(BASE+'/field-velocity');wait_for_load()
results=[]
cases=[('recording-hours-desktop','/field-velocity#metric-recording-hours','Neural recording hours — selected datasets',12),('recording-optical','/field-velocity?recordingView=optical#simultaneously-recorded-neurons','Simultaneous neural recordings',1),('neuroai','/field-velocity#metric-panel-neuroai-imagenet','NeuroAI performance–cost frontier',6),('trends','/field-velocity#google-trends-neurotech','Neurotech search terms',None),('annual','/field-velocity#publication-output','Neurotech papers per year',None)]
for name,path,title,count in cases:
 load(path,title)
 source=q('return [...document.querySelectorAll("dialog[open] svg [data-source-observation],dialog[open] svg [data-curve-point],dialog[open] svg [data-trend-point]")].map(n=>[n.getAttribute("cx"),n.getAttribute("cy"),n.getAttribute("data-value")]);')
 if count is not None:assert len(source)==count,(name,len(source))
 info=save_download(name);assert info['marks']==source,name
 if name=='annual':
  geometry=q("const keys=['cx','cy','points','d'];const shape=e=>[e.localName,...keys.map(k=>e.getAttribute(k))];const live=document.querySelector('dialog[open] .publication-full-plot svg');const doc=new DOMParser().parseFromString(window.__qaSvg,'image/svg+xml');const saved=doc.querySelector('svg > svg');return {source:[...live.querySelectorAll('circle,polyline,polygon,path')].filter(e=>!e.closest('[data-export-exclude]')).map(shape),exported:[...saved.querySelectorAll('circle,polyline,polygon,path')].map(shape),values:[...saved.querySelectorAll('[data-value]')].map(e=>e.getAttribute('data-value'))};")
  assert geometry['source']==geometry['exported']
  assert len(geometry['values'])==16
  info['publicationGeometry']={'shapes':len(geometry['exported']),'paperValues':geometry['values']}
 if name=='recording-hours-desktop':
  keyed=[n for n in info['notes'] if n.get('color')];assert len(keyed)==5
  assert [n['color'] for n in keyed]==['#9275ca','#238e91','#cd732f','#647d3d','#cb6285']
  im=Image.open(OUT/info['file']);im.crop((0,0,im.width,int(info['cropBottom']*2))).save(OUT/'recording-hours-crop-example.png')
 info['chart']=title;info['viewport']=1440;results.append(info)
# Narrow-source export and an actual clipboard readback of the note-heavy chart.
cdp('Emulation.setDeviceMetricsOverride',width=390,height=844,deviceScaleFactor=1,mobile=False)
load('/field-velocity#metric-recording-hours','Neural recording hours — selected datasets')
info=save_download('recording-hours-390');assert len(info['marks'])==12
info.update(chart='Neural recording hours — selected datasets',viewport=390);results.append(info)
click('dialog[open] [data-copy-chart]')
for _ in range(200):
 status=q('return document.querySelector("dialog[open] [data-chart-share] [role=status]").textContent')
 if not status.startswith('Preparing'):break
 time.sleep(.05)
assert status.startswith('Chart copied.'),status
previous=js("return navigator.permissions.query({name:'clipboard-read'}).then(p=>p.state)")
cdp('Browser.setPermission',permission={'name':'clipboard-read'},setting='granted',origin=BASE)
try:
 clip=js('''return navigator.clipboard.read().then(async items=>{const item=items[0];const png=await item.getType('image/png');const data=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(png)});return {types:item.types,png:data,text:await(await item.getType('text/plain')).text(),html:await(await item.getType('text/html')).text()}})''')
finally:cdp('Browser.setPermission',permission={'name':'clipboard-read'},setting=previous,origin=BASE)
assert set(clip['types'])=={'image/png','text/plain','text/html'}
assert clip['text']==BASE+'/field-velocity#metric-recording-hours'
assert '<img' in clip['html'] and 'data:image/png;base64,' in clip['html']
(OUT/'recording-hours-clipboard.png').write_bytes(base64.b64decode(clip['png'].split(',',1)[1]))
assert Image.open(OUT/'recording-hours-clipboard.png').size==Image.open(OUT/'recording-hours-390.png').size
(OUT/'results.json').write_text(json.dumps({'revision':'65f92607d885c2db605cb297717111da459312f5','exports':results,'clipboard':{'types':clip['types'],'url':clip['text'],'status':status,'imageDimensions':Image.open(OUT/'recording-hours-clipboard.png').size},'physicalPhoneTested':False},indent=2)+'\n')
capture_screenshot(path=str(OUT/'mobile-dialog.png'))
print(json.dumps({'exports':[{'file':r['file'],'chart':r['chart'],'points':len(r['marks']),'notes':len(r['notes']),'width':r['nativePngWidth'],'height':r['nativePngHeight']} for r in results],'clipboard':clip['types']}))
