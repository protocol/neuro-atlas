# Real mounted UI with explicitly SYNTHETIC network/popup/identity boundaries.
from pathlib import Path
import os
root=Path(os.environ['FEEDBACK_QA_ROOT'])
exec((root/'scripts/qa/feedback-browser.py').read_text().split('results=[]')[0])
script=(root/'scripts/qa/feedback-synthetic-transport.js').read_text()
registration=cdp('Page.addScriptToEvaluateOnNewDocument',source=script)['identifier']
results=[]
try:
 for width in [1440,390,320]:
  cdp('Emulation.setDeviceMetricsOverride',width=width,height=600 if width==320 else 1000,deviceScaleFactor=1,mobile=width<500)
  goto_url('about:blank');wait_for_load();goto_url(base+'#metrics');wait_for_load();cdp('Page.bringToFront')
  wait('!!document.querySelector(".atlas-feedback-launch")')
  click('.atlas-feedback-launch');wait('!!document.querySelector("[data-feedback-composer]")')
  wait('document.querySelector("[data-feedback-composer]").innerText.includes("Sign in with GitHub")')
  fill('Private comment','PRIVATE_NATIVE_FIXTURE')
  bytext('Sign in with GitHub')
  wait('document.querySelector("[data-feedback-composer]").innerText.includes("Signed in as synthetic-owner")')
  bytext('Review public task');wait("!!document.querySelector('[aria-label=\"Public title\"]')")
  fill('Public title','Improve chart spacing');fill('Public summary','Use clearer chart spacing.');fill('Acceptance criteria','Keep labels readable at 320px')
  assert js('document.querySelector("[data-feedback-consent]").checked')==False
  click('[data-feedback-consent]');click('[data-feedback-submit]')
  wait('document.querySelector("[role=alert]")?.innerText.includes("draft is still here")')
  assert js("document.querySelector('[aria-label=\"Public title\"]').value")=='Improve chart spacing'
  capture_screenshot(path=str(out/f'synthetic-retry-{width}.png'))
  click('[data-feedback-submit]');wait('document.querySelector("[data-feedback-composer]").innerText.includes("Received · awaiting processing")')
  posts=js('window.__feedbackFixture.posts')
  assert len(posts)==2 and posts[0]['key']==posts[1]['key']
  assert posts[1]['body']['privateComment']=='PRIVATE_NATIVE_FIXTURE'
  assert 'PRIVATE_NATIVE_FIXTURE' not in json.dumps(posts[1]['body']['publicTask'])
  assert js('document.querySelectorAll("[data-feedback-composer] a").length')==0
  capture_screenshot(path=str(out/f'synthetic-received-{width}.png'))
  bytext('Follow up');wait('document.querySelector("[data-feedback-composer]").innerText.includes("follow-up builds on the existing draft PR")')
  fill('Private comment','Private follow-up fixture')
  bytext('Review public task');fill('Public title','Refine spacing');fill('Public summary','Keep the earlier spacing change and align the legend.');fill('Acceptance criteria','No clipping')
  assert js('document.querySelector("[data-feedback-consent]").checked')==False
  click('[data-feedback-consent]');fill('Public title','Refine the chart spacing')
  assert js('document.querySelector("[data-feedback-consent]").checked')==False
  click('[data-feedback-consent]');capture_screenshot(path=str(out/f'synthetic-followup-{width}.png'))
  if width==320:
   js("document.querySelector('[data-atlas-feedback]').scrollTop=document.querySelector('[data-atlas-feedback]').scrollHeight")
   capture_screenshot(path=str(out/'synthetic-followup-320-bottom.png'))
   js("(()=>{const s=[...document.querySelectorAll('[data-atlas-feedback] summary')].find(e=>e.textContent==='My recent feedback');s.scrollIntoView({block:'center'});s.focus()})()")
   press_key('Tab')
   close_rect=js("(()=>{const r=document.querySelector('[data-feedback-close]').getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight,focused:document.activeElement.hasAttribute('data-feedback-close')}})()")
   assert close_rect['focused'] and close_rect['top']>=0 and close_rect['bottom']<=close_rect['height'],close_rect
  click('[data-feedback-submit]');wait('document.querySelector("[data-feedback-composer]").innerText.includes("Version 2")')
  assert js('window.__feedbackFixture.posts.at(-1).body.expectedVersion')==1
  for _ in range(12):
   press_key('Tab')
   assert js('document.querySelector("[data-atlas-feedback]").contains(document.activeElement)')
  press_key('Escape');wait('document.querySelectorAll("dialog:modal").length===0')
  results.append({'width':width,'syntheticIdentity':True,'realRenderedClient':True,'failedRetrySameKey':True,'privatePublicSeparate':True,'receivedNotStarted':True,'noFakePrOrPreviewLink':True,'followupSameIdVersion2':True,'consentInvalidatedOnEdit':True,'nativeFocusTrap':True})
finally:
 cdp('Page.removeScriptToEvaluateOnNewDocument',identifier=registration)
(out/'synthetic-ui-results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'allPassed':True,'cases':len(results),'kind':'native actual app; SYNTHETIC transport/identity, no provider/network OAuth or external write'}))
