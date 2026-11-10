# Real public component/client with SYNTHETIC network only. No visitor identity/provider or external write.
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
  wait('document.querySelector("[data-feedback-submit]")?.disabled===false')
  assert not js('/sign in|history|account|draft PR/i.test(document.querySelector("[data-feedback-composer]").textContent)')
  assert js('document.querySelector("[data-feedback-composer]").textContent.includes("workspace/team members")')
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
  assert 'processingConsent' not in body and sorted(body.keys())==['context','feedback']
  capture_screenshot(path=str(out/f'synthetic-saved-{width}.png'))
  assert js('document.querySelector("[data-feedback-toast]").textContent')=='Logged in Linear'
  for cancellation in ['Back','Escape']:
   shortcut();wait('!!document.querySelector("[data-feedback-selection]:popover-open")')
   if cancellation=='Back':bytext('Back')
   else:press_key('Escape')
   wait('!!document.querySelector("[data-feedback-composer]")')
   assert js('document.querySelector("[aria-label=Feedback]").value')==''
   assert not js('!!document.querySelector("[data-feedback-outline]")'), 'saved note never becomes the next note target'
   assert js('document.querySelector("[data-feedback-submit]").disabled')
   assert js('window.__feedbackFixture.posts.length')==2
   press_key('Escape');wait('!document.querySelector("[data-feedback-composer]")')
  shortcut();wait('!!document.querySelector("[data-feedback-selection]:popover-open")')
  pick('dialog[open]:not([data-atlas-feedback]) button',f'new-note-target-{width}')
  fill('Feedback','A separate visitor note');click('[data-feedback-submit]')
  wait('!!document.querySelector("[data-feedback-toast]:popover-open")')
  next_note=js('window.__feedbackFixture.posts.at(-1)')
  assert next_note['url'].endswith('/api/feedback/public') and next_note['key']!=posts[0]['key']
  assert next_note['body']['context']['element']==body['context']['element']
  shortcut();wait('!!document.querySelector("[data-feedback-selection]:popover-open")');bytext('General page')
  wait('!!document.querySelector("[data-feedback-composer]")')
  fill('Feedback','Focus trap fixture')
  for _ in range(14):
   press_key('Tab');assert js('document.querySelector("[data-feedback-composer]").contains(document.activeElement)')
  assert not js('/sign in|history|account|draft PR/i.test(document.querySelector("[data-feedback-composer]").textContent)')
  assert js('window.__feedbackFixture.calls.every(call=>["/neuro-atlas/api/feedback/public","/neuro-atlas/api/feedback/public/config"].includes(call.url))')
  capture_screenshot(path=str(out/f'synthetic-public-composer-{width}.png'))
  press_key('Escape');wait('!document.querySelector("[data-feedback-composer]")')
  press_key('Escape');wait('document.querySelectorAll("dialog:modal").length===0')
  results.append({'width':width,'syntheticTransport':True,'noVisitorIdentity':True,'realRenderedClient':True,'nativeCloseButtonNotActivated':True,'failedRetrySameKeyBodyAndElement':True,'oneFeedbackField':True,'topLayerSavedToastOverNativeChart':True,'loggingOnlyNoPrPromise':True,'newNoteNewKey':True,'cancelledSelectionNoOldPin':True,'nativeFocusTrap':True,'geometry':metrics,'toast':toast})
finally:
 cdp('Page.removeScriptToEvaluateOnNewDocument',identifier=registration)
(out/'synthetic-ui-results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'allPassed':True,'cases':len(results),'kind':'native actual public component/client; SYNTHETIC transport, no visitor identity or external provider/writes'}))
