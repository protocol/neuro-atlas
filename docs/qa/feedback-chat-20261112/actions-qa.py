import time,json
from pathlib import Path
out=Path('/opt/data/tmp/atlas-feedback-chat-20261112/evidence')
report=[]
for width in (1440,390,320):
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=900,deviceScaleFactor=1,mobile=width<500)
 goto_url('http://127.0.0.1:35641/neuro-atlas');wait_for_load()
 end=time.monotonic()+20
 while time.monotonic()<end and not js('!!document.querySelector(".landing-actions [data-feedback-trigger]")'):time.sleep(.1)
 js("window.scrollTo(0,0)")
 data=js("(()=>{const b=document.querySelector('.landing-actions [data-feedback-trigger]'),a=b.previousElementSibling,x=getComputedStyle(b),y=getComputedStyle(a);return {pair:a.textContent.includes('Contribute via PR'),b:{font:x.fontSize,padding:x.padding,radius:x.borderRadius,border:x.borderTopWidth,height:b.getBoundingClientRect().height},a:{font:y.fontSize,padding:y.padding,radius:y.borderRadius,border:y.borderTopWidth,height:a.getBoundingClientRect().height},innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}})()")
 assert data['pair'] and data['b']==data['a'],data
 assert data['innerWidth']==width and data['client']==data['scroll'],data
 capture_screenshot(path=str(out/f'actions-home-{width}.png'));report.append(data)
(out/'actions-native-results.json').write_text(json.dumps({'allPassed':True,'cases':report},indent=2))
print(report)
