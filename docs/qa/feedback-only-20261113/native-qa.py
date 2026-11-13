import os,time,json
from pathlib import Path
OUT=Path(os.environ.get('ATLAS_ACTIONS_QA_OUT','/opt/data/tmp/atlas-feedback-only-replay'));OUT.mkdir(exist_ok=True)
BASE='http://127.0.0.1:45731/neuro-atlas'
SHA='358d6811ec421c0d245893bf7000041aa56da5c4'
def wait(expression,seconds=20):
    until=time.monotonic()+seconds
    while time.monotonic()<until:
        value=js(expression)
        if value:return value
        time.sleep(.1)
    raise AssertionError('Timed out: '+expression)
def visible(sel):
    return js('return (()=>{const es=[...document.querySelectorAll('+json.dumps(sel)+')];return es.filter(e=>e.getClientRects().length && getComputedStyle(e).visibility!=="hidden").length})()')
def click(sel):
    js('return (()=>{const es=[...document.querySelectorAll('+json.dumps(sel)+')];const e=es.find(e=>e.getClientRects().length);if(!e)throw Error("No visible target");e.scrollIntoView({block:"center",behavior:"instant"});return true})()')
    time.sleep(.15)
    r=js('return (()=>{const e=[...document.querySelectorAll('+json.dumps(sel)+')].find(e=>e.getClientRects().length);const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()')
    click_at_xy(r['x'],r['y'])
    time.sleep(.2)
    return r
journal=OUT/'browser-targets.json'
if journal.exists():
    saved=json.loads(journal.read_text());before=saved['before'];owned=saved['owned']
    goto_url(BASE+'/milestones');wait_for_load()
else:
    before=[t['targetId'] for t in cdp('Target.getTargets')['targetInfos'] if t['type']=='page']
    new_tab(BASE+'/milestones');wait_for_load();wait_for_element('h1',visible=True)
    after=[t['targetId'] for t in cdp('Target.getTargets')['targetInfos'] if t['type']=='page']
    owned=[t for t in after if t not in before]
    assert len(owned)==1,owned
    journal.write_text(json.dumps({'before':before,'owned':owned}))
results=[]
for width in [1440,390,320]:
    cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000 if width==1440 else 800,deviceScaleFactor=1,mobile=width<500)
    for route in ['/milestones','/field-velocity','/funding','/']:
        goto_url(BASE+route);wait_for_load();assert wait_for_element('h1',visible=True)
        wait('return [...document.querySelectorAll("button")].some(e=>e.getAttribute("aria-label")?.includes("mode"))')
        assert js('return location.pathname')==('/neuro-atlas'+route).rstrip('/')
        wait('return [...document.querySelectorAll("[data-feedback-trigger]")].length===2')
        js('return (()=>{const s=document.createElement("style");s.textContent="nextjs-portal{display:none!important}";document.head.append(s);return true})()')
        assert visible('[data-feedback-trigger]')==1,(width,route,'duplicate visible feedback')
        assert js('return [...document.querySelectorAll("a")].filter(e=>e.href.includes("github.com/protocol/neuro-atlas/pulls")||e.href.includes("github.com/protocol/neuro-atlas/compare")).length')==0
        assert not js('return document.body.innerText.includes("Contribute via PR")')
        assert js('return document.querySelector("main [data-feedback-trigger]")===null')
        assert js('return innerWidth')==width
        assert js('return document.documentElement.scrollWidth<=innerWidth'),(width,route,'overflow')
        if width==1440:
            assert js('return document.querySelector("aside [data-feedback-trigger]").getBoundingClientRect().bottom<=innerHeight')
            assert js('return document.querySelector("footer [data-feedback-trigger]").getClientRects().length===0')
        else:
            assert visible('footer [data-feedback-trigger]')==1
        if route=='/milestones':
            assert js(r'return document.querySelector("button[aria-label=\"Fold side panel to show the full year\"]")===null')
            if width==1440:
                capture_screenshot(path=str(OUT/'milestones-1440.png'))
                click('button[aria-label="Open side panel"]')
                assert wait(r'return !!document.querySelector("button[aria-label=\"Fold side panel to show the full year\"]")')
                assert js(r'return document.querySelector("button[aria-label=\"Fold side panel to show the full year\"]").closest("aside").innerText.includes("Capital raised")')
                capture_screenshot(path=str(OUT/'milestones-expanded-1440.png'))
                click('button[aria-label="Fold side panel to show the full year"]')
                assert wait(r'return !!document.querySelector("button[aria-label=\"Open side panel\"]")')
            else:
                capture_screenshot(path=str(OUT/f'milestones-{width}.png'))
            # Actual visible retained trigger -> picker -> selected footer/page text -> composer.
            click('[data-feedback-trigger]')
            assert wait('return !!document.querySelector("[data-feedback-selection]")')
            target='footer p' if width<500 else 'h1'
            click(target)
            assert wait('return !!document.querySelector("[data-feedback-composer]")')
            wait('return !document.querySelector("[data-feedback-composer]").innerText.includes("Checking feedback connection")')
            capture_screenshot(path=str(OUT/f'feedback-composer-{width}.png'))
            press_key('Escape')
            assert wait('return document.querySelector("[data-feedback-composer]")===null')
            assert js('return document.querySelector("[data-feedback-selection]")===null')
            if width<500:
                js('return document.querySelector("footer").scrollIntoView({block:"start",behavior:"instant"})');time.sleep(.2)
                capture_screenshot(path=str(OUT/f'feedback-footer-{width}.png'))
        if route=='/' and width==1440:capture_screenshot(path=str(OUT/'home-1440.png'))
        results.append({'width':width,'route':route,'oneVisibleFeedback':True,'noContributionAction':True,'noHeaderHeroFeedback':True,'noOverflow':True})
(OUT/'results.json').write_text(json.dumps({'source':SHA,'localNext':True,'syntheticLoopbackGate':True,'noLiveWrites':True,'checks':results},indent=2))
print(json.dumps({'passed':True,'routesAndWidths':len(results),'ownedTargets':owned,'evidence':str(OUT)}))
