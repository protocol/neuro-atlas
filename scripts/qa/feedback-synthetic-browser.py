# Real component/client with SYNTHETIC network/popup/identity. No provider or external write.
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
  goto_url('about:blank');wait_for_load();goto_url(base+'#'+chart);wait_for_load();cdp('Page.bringToFront')
  wait('!!document.querySelector("dialog[open] svg")')
  shortcut();wait('!!document.querySelector("[data-feedback-selection]:popover-open")')
  # This actual chart Close button MUST NOT close the underlying chart when picked.
  js("(()=>{const b=document.querySelector('dialog[open]:not([data-atlas-feedback]) button');window.__pickEvents=[];for(const type of ['pointerdown','pointerup','mousedown','mouseup','click'])b.addEventListener(type,()=>window.__pickEvents.push(type))})()")
  pick('dialog[open]:not([data-atlas-feedback]) button',f'button-{width}')
  assert js('document.querySelectorAll("dialog:modal").length')==2
  assert js('window.__pickEvents')==[]
  fill('Feedback','PRIVATE_NATIVE_FIXTURE')
  bytext('Sign in with GitHub');wait('document.querySelector("[data-feedback-submit]")?.disabled===false')
  metrics=geometry(width)
  # Native Shift+Enter inserts a newline; IME coverage is in the component regression.
  click('[aria-label="Feedback"]')
  cdp('Input.dispatchKeyEvent',type='keyDown',key='Enter',code='Enter',text='\r',unmodifiedText='\r',modifiers=8,windowsVirtualKeyCode=13)
  cdp('Input.dispatchKeyEvent',type='keyUp',key='Enter',code='Enter',modifiers=8,windowsVirtualKeyCode=13)
  assert js('window.__feedbackFixture.posts.length')==0
  assert '\n' in js('document.querySelector("[aria-label=Feedback]").value'), 'Shift+Enter must insert a native newline'
  fill('Feedback','PRIVATE_NATIVE_FIXTURE');press_key('Enter')
  wait('document.querySelector("[role=alert]")?.textContent.includes("draft is still here")')
  assert js('document.querySelector("[aria-label=Feedback]").value')=='PRIVATE_NATIVE_FIXTURE'
  capture_screenshot(path=str(out/f'synthetic-retry-{width}.png'))
  click('[data-feedback-submit]');wait('!!document.querySelector("[data-feedback-toast]:popover-open")')
  assert js('document.querySelectorAll("dialog:modal").length')==1
  assert js('document.querySelector("[data-feedback-toast]").parentElement.matches("dialog:modal")')
  toast=js("(()=>{const r=document.querySelector('[data-feedback-toast]').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}})()")
  assert toast['left']>=0 and toast['right']<=width and toast['height']<80 and toast['width']<240,toast
  posts=js('window.__feedbackFixture.posts')
  assert len(posts)==2 and posts[0]['key']==posts[1]['key'] and posts[0]['body']==posts[1]['body']
  body=posts[1]['body']
  assert body['feedback']=='PRIVATE_NATIVE_FIXTURE' and body['context']['element']['tagName']=='button'
  assert body['context']['chartId']==chart
  assert 'publicTask' not in body and 'label' not in body['context']['element']
  assert body['processingConsent']=={'approved':True,'policyVersion':'atlas-feedback-simple-v1'}
  capture_screenshot(path=str(out/f'synthetic-saved-{width}.png'))
  shortcut();wait('!!document.querySelector("[data-feedback-composer]")');bytext('History')
  wait('document.querySelector("[data-feedback-composer]").textContent.includes("Received · awaiting processing")')
  assert js('document.querySelectorAll("[data-feedback-composer] a").length')==0
  for cancellation in ['Back','Escape']:
   bytext('Follow up');wait('!!document.querySelector("[data-feedback-selection]:popover-open")')
   if cancellation=='Back':bytext('Back')
   else:press_key('Escape')
   wait('!!document.querySelector("[data-feedback-composer]")')
   assert js('document.querySelector("[data-feedback-composer]").textContent.includes("Feedback history")')
   assert not js('!!document.querySelector("[aria-label=Feedback]")'), 'cancellation must not silently choose General page'
   assert js('window.__feedbackFixture.posts.length')==2
  bytext('Follow up');wait('!!document.querySelector("[data-feedback-selection]:popover-open")')
  pick('dialog[open]:not([data-atlas-feedback]) button',f'followup-target-{width}')
  fill('Feedback','Private follow-up fixture');click('[data-feedback-submit]')
  wait('!!document.querySelector("[data-feedback-toast]:popover-open")')
  follow=js('window.__feedbackFixture.posts.at(-1)')
  assert follow['body']['expectedVersion']==1 and follow['url'].endswith('/11111111-1111-4111-8111-111111111111/followups')
  assert follow['body']['context']['element']==body['context']['element']
  shortcut();wait('!!document.querySelector("[data-feedback-composer]")');bytext('History')
  wait('document.querySelector("[data-feedback-composer]").textContent.includes("Version 2")')
  for _ in range(14):
   press_key('Tab');assert js('document.querySelector("[data-feedback-composer]").contains(document.activeElement)')
  capture_screenshot(path=str(out/f'synthetic-history-{width}.png'))
  press_key('Escape');wait('!document.querySelector("[data-feedback-composer]")')
  press_key('Escape');wait('document.querySelectorAll("dialog:modal").length===0')
  results.append({'width':width,'syntheticIdentity':True,'realRenderedClient':True,'nativeCloseButtonNotActivated':True,'failedRetrySameKeyBodyAndElement':True,'onePrivateField':True,'topLayerSavedToastOverNativeChart':True,'receivedNotStarted':True,'noFakePrOrPreview':True,'followupSameIdVersion2':True,'cancelledHistoryTargetReturnsToHistory':True,'nativeFocusTrap':True,'geometry':metrics,'toast':toast})
finally:
 cdp('Page.removeScriptToEvaluateOnNewDocument',identifier=registration)
(out/'synthetic-ui-results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'allPassed':True,'cases':len(results),'kind':'native actual component/client; SYNTHETIC transport/identity, no external OAuth/provider or writes'}))
