# Run inside an owned browser-harness window; no independent browser instance.
import os, json, time
from pathlib import Path
BASE=os.environ.get('TOGGLE_QA_BASE','http://127.0.0.1:36587')
OUT=Path(os.environ.get('TOGGLE_QA_OUT','.qa/chart-toggle-urls'))
OUT.mkdir(parents=True,exist_ok=True)
CASES=[
 ('selected-public-image-resource-footprints','Whole-brain scale'),
 ('estimated-acquisition-cost-per-10m-voxels-optical-and-em','Human-brain cost targets'),
]
def val(code):return js('return (()=>{'+code+'})()')
def wait(code,seconds=25):
 deadline=time.monotonic()+seconds
 while time.monotonic()<deadline:
  x=val(code)
  if x:return x
  time.sleep(.08)
 raise AssertionError(code)
def switch():
 return val('const e=document.querySelector("dialog[open] [role=switch]");return e?{on:e.getAttribute("aria-checked"),url:location.href,label:e.textContent}:null')
def click(sel):
 val('const e=document.querySelector('+json.dumps(sel)+');e.scrollIntoView({block:"center"});return true')
 capture_screenshot(str(OUT/'before-click.png'))
 r=val('const e=document.querySelector('+json.dumps(sel)+'),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
 assert r['hit'],r
 click_at_xy(r['x'],r['y'])
 capture_screenshot(str(OUT/'after-click.png'))
def fresh(url):
 goto_url('about:blank');wait_for_load();goto_url(url);wait_for_load();cdp('Page.bringToFront')
 wait('return !!document.querySelector("dialog[open] [role=switch]")')
 wait('return document.fonts.status==="loaded"')
 time.sleep(.9)
results=json.loads((OUT/'results.json').read_text()) if os.environ.get('TOGGLE_QA_RESUME') and (OUT/'results.json').exists() else []
from urllib.parse import urlsplit
assert urlsplit(BASE).hostname in {'127.0.0.1','localhost','::1'}, 'Use a task-owned loopback origin'
cdp('Browser.grantPermissions',origin=BASE,permissions=['clipboardReadWrite','clipboardSanitizedWrite'])
cdp('Page.bringToFront')
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=False)
 for slug,label in CASES:
  if any(row.get('width')==width and row.get('slug')==slug for row in results):continue
  initial=BASE+'/neuro-atlas/field-velocity?utm_source=toggle-qa&tag=a&tag=b#'+slug
  fresh(initial)
  off=switch();assert off['on']=='false',off;assert label in off['label'],off
  source=val('return document.querySelector("dialog[open] table")?.textContent')
  click('dialog[open] [role=switch]')
  wait('return document.querySelector("dialog[open] [role=switch]")?.getAttribute("aria-checked")==="true"')
  time.sleep(.9)
  on=switch();assert on['url']!=off['url'],{'unchangedURL':on}
  assert val('return JSON.stringify(new URL(location.href).searchParams.getAll("tag"))')=='["a","b"]'
  assert val('return new URL(location.href).searchParams.get("utm_source")')=='toggle-qa'
  assert val('return document.querySelector("dialog[open] table")?.textContent')==source
  capture_screenshot(str(OUT/(slug+'-on-'+str(width)+'.png')))
  click('dialog[open] [data-copy-draft-link]')
  copied=js('return Promise.race([navigator.clipboard.readText(),new Promise(resolve=>setTimeout(()=>resolve("READ_TIMEOUT"),4000))])')
  assert copied==on['url'],{'copied':copied,'expected':on['url']}
  cdp('Page.reload');wait_for_load()
  wait('return document.querySelector("dialog[open] [role=switch]")?.getAttribute("aria-checked")==="true"')
  time.sleep(.9)
  fresh(copied);assert switch()['on']=='true'
  click('dialog[open] [role=switch]')
  wait('return document.querySelector("dialog[open] [role=switch]")?.getAttribute("aria-checked")==="false"')
  assert switch()['url']==off['url'],{'offURL':switch(),'original':off}
  # Keyboard activation, URL fidelity, and no extra native layers.
  val('document.querySelector("dialog[open] [role=switch]").focus();return true');press_key('Enter')
  wait('return document.querySelector("dialog[open] [role=switch]")?.getAttribute("aria-checked")==="true"')
  assert switch()['url']==on['url']
  press_key('Escape');wait('return document.querySelectorAll(":modal").length===0')
  closed=val('return location.href')
  js('history.back()');time.sleep(.3)
  js('history.forward()');time.sleep(.3)
  results.append({'width':width,'slug':slug,'offURL':off['url'],'onURL':on['url'],'copyExact':True,'reload':True,'freshRestoration':True,'keyboard':True,'singleEscapeCloses':True,'closedURL':closed,'sourceRowsUnchanged':True})
  (OUT/'results.json').write_text(json.dumps(results,indent=2)+'\n')
# Native in-app open -> toggle -> Back -> Forward -> Close remains a single modal journey.
cdp('Emulation.setDeviceMetricsOverride',width=1440,height=1000,deviceScaleFactor=1,mobile=False)
goto_url('about:blank');wait_for_load();goto_url(BASE+'/neuro-atlas/field-velocity?history=toggle#metrics');wait_for_load()
wait('return !!document.querySelector("[data-draft-popout-trigger=\\"metric-panel-public-data-size\\"]")')
click('[data-draft-popout-trigger="metric-panel-public-data-size"]')
wait('return !!document.querySelector("dialog[open] [role=switch]")')
click('dialog[open] [role=switch]');on=switch();assert on['on']=='true'
js('history.back()');wait('return document.querySelector("dialog[open] [role=switch]")?.getAttribute("aria-checked")==="false"')
js('history.forward()');wait('return document.querySelector("dialog[open] [role=switch]")?.getAttribute("aria-checked")==="true"')
assert switch()['url']==on['url']
click('dialog[open] .pc-modal-header > button')
wait('return document.querySelectorAll(":modal").length===0 && location.hash==="#metrics"')
results.append({'nativeOpenToggleBackForwardClose':True,'selectedURL':on['url']})
(OUT/'results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'passed':True,'cases':len(results),'results':results},indent=2))
