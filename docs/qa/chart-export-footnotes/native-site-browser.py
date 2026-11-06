from pathlib import Path
exec(Path('docs/qa/chart-export-footnotes/native-export-browser.py').read_text().split("cdp('Emulation.setDeviceMetricsOverride',width=1440")[0])
records=[]
for width,theme in [(1440,'light'),(390,'light'),(320,'light'),(390,'dark')]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000 if width==1440 else 844,deviceScaleFactor=1,mobile=False)
 load('/field-velocity#metric-recording-hours','Neural recording hours — selected datasets')
 q('document.documentElement.setAttribute("data-theme",'+json.dumps(theme)+');document.documentElement.classList.toggle("dark",'+str(theme=='dark').lower()+');')
 click('dialog[open] .draft-plot-data > summary')
 assert q('return document.querySelector("dialog[open] .draft-plot-data").open')
 q('document.querySelector("dialog[open] .chart-supporting-notes").scrollIntoView({block:"center",behavior:"instant"});')
 stable('dialog[open] .chart-supporting-notes')
 v=q('''const list=document.querySelector('dialog[open] .chart-supporting-notes'), rows=[...list.querySelectorAll('[data-chart-note]')];return {size:getComputedStyle(list).fontSize,color:getComputedStyle(list).color,viewport:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,rows:rows.map(e=>{const p=e.querySelector('p'),r=e.getBoundingClientRect(),t=p.getBoundingClientRect();return {text:p.textContent,color:getComputedStyle(e.querySelector('[data-chart-note-key]')).backgroundColor,box:r.toJSON(),textBox:t.toJSON(),client:p.clientWidth,scroll:p.scrollWidth}})};''')
 assert v['size']=='12px';assert len(v['rows'])==5
 assert v['scroll']<=v['client']
 for i,row in enumerate(v['rows']):
  assert row['scroll']<=row['client']
  assert row['textBox']['right']<=row['box']['right']+.1
  if i:assert row['box']['top']>=v['rows'][i-1]['box']['bottom']+10
 p=OUT/f'site-recording-notes-{width}-{theme}.png';capture_screenshot(path=str(p));v.update(file=p.name,theme=theme);records.append(v)
(OUT/'site-results.json').write_text(json.dumps({'revision':'65f92607d885c2db605cb297717111da459312f5','cases':records,'physicalPhoneTested':False},indent=2)+'\n')
print(json.dumps({'siteCases':[{'file':r['file'],'rows':len(r['rows']),'fontSize':r.get('size',r.get('fontSize'))} for r in records]}))
