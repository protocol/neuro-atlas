# Native interaction follow-up, executed with browser-harness stdin.
import json,time,os
from pathlib import Path
BASE=os.environ.get('ATLAS_MOTION_URL','http://127.0.0.1:3493/neuro-atlas/field-velocity')
OUT=Path(os.environ.get('ATLAS_MOTION_OUT','.qa/extrapolation-motion'))
OUT.mkdir(parents=True,exist_ok=True)
def v(s):return js('(() => '+s+')()')
def wait(s):
 for _ in range(80):
  if v(s):return
  time.sleep(.04)
 raise AssertionError(s)
def click(selector):
 js('(() => {const e=document.querySelector('+json.dumps(selector)+');e.scrollIntoView({block:"center",behavior:"instant"});})()')
 r=v('document.querySelector('+json.dumps(selector)+').getBoundingClientRect().toJSON()')
 click_at_xy(r['x']+r['width']/2,r['y']+r['height']/2)
def select(selector,value):js('(() => {const e=document.querySelector('+json.dumps(selector)+');e.value='+json.dumps(value)+';e.dispatchEvent(new Event("change",{bubbles:true}));})()')
cdp('Page.bringToFront')
report=[]
for width in [1440,390,320]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=False)
 for ident in ['simultaneously-recorded-neurons','neural-recording-hours','tissue-mapped']:
  goto_url(BASE+'#'+ident);wait_for_load();wait('document.querySelector("dialog[open]")!==null')
  before=v('document.querySelector("dialog svg").outerHTML')
  if ident=='tissue-mapped':
   assert v('document.querySelector("dialog [role=switch]")') is None
   report.append({'chart':ident,'width':width,'no_extrapolation':True});continue
  click('dialog [role=switch]');time.sleep(1.1)
  for mode,expected in ([('recent','2085'),('literature','2115')] if ident=='simultaneously-recorded-neurons' else [('plateau','not reached if plateau continues')]):
   select('[data-scenario-select]',mode);time.sleep(1.1)
   assert expected in v('document.querySelector("[data-extrapolation-summary]").textContent')
   assert v('document.documentElement.scrollWidth')<=width
  select('[data-scenario-select]','historical');time.sleep(1.1)
  if ident=='neural-recording-hours':
   positions=v('Object.fromEntries([...document.querySelectorAll("dialog [data-curve-point]")].map(e=>[e.dataset.curvePoint,[e.getAttribute("cx"),e.getAttribute("cy")]]))')
   for track in ['ajile12-intracranial','poyo-primate-training','japaneeg-scalp-eeg']:
    select('dialog select:not([data-scenario-select])',track);time.sleep(.2)
    assert v('document.querySelector("dialog [data-extrapolation-line]")') is None
    actual=v('Object.fromEntries([...document.querySelectorAll("dialog [data-curve-point]")].map(e=>[e.dataset.curvePoint,[e.getAttribute("cx"),e.getAttribute("cy")]]))')
    assert all(positions[k]==p for k,p in actual.items())
   select('dialog select:not([data-scenario-select])','');time.sleep(.2)
  js('(() => document.querySelector("dialog [data-curve-point]").focus())()')
  assert v('document.querySelector("dialog [data-curve-point]").getAttribute("aria-describedby")')
  assert 'Hover or tab' not in v('document.querySelector(".pc-point-readout").textContent')
  # Removing focus is necessary for exact snapshot (active radius/accessibility attribute).
  js('(() => document.activeElement.blur())()')
  click('dialog [role=switch]');time.sleep(1.1)
  assert v('document.querySelector("dialog svg").outerHTML')==before
  # Closing while RAF is active must leave no overlay/dialog and focus restores.
  click('dialog [role=switch]');press_key('Escape');time.sleep(1)
  assert v('document.querySelector("dialog[open]")') is None
  assert v('document.activeElement.closest("dialog")') is None
  report.append({'width':width,'chart':ident,'scenarios':True,'track_axes_fixed':True,'keyboard_readout':True,'exact_off_restored':True,'close_during_motion':True})
(OUT/'interactions.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
