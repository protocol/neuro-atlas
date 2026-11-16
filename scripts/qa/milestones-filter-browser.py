# Run through browser-harness in a task-owned window on the actual local Next route.
# QA_ORIGIN must already be authenticated with a synthetic loopback-only fixture.
import os, json, time
from pathlib import Path
from urllib.parse import urlparse

origin = os.environ.get('QA_ORIGIN', 'http://127.0.0.1:36419')
assert urlparse(origin).hostname in ('127.0.0.1', 'localhost'), 'loopback QA only'
out = Path(os.environ.get('QA_OUT', '/opt/data/tmp/neuro-plr119'))
out.mkdir(parents=True, exist_ok=True)
results = []

def evaluate(expression):
    return js('return (()=>{' + expression + '})()')

def click(expression):
    cdp('Page.bringToFront')
    evaluate('const e=' + expression + ";e.scrollIntoView({block:'center',behavior:'instant'});")
    capture_screenshot(path=str(out / 'interaction-preclick.png'))
    point = evaluate('const e=' + expression + ';const r=e.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,hit:e.contains(document.elementFromPoint(x,y))};')
    assert point['hit'], point
    click_at_xy(point['x'], point['y'])

def trigger(name):
    return '[...document.querySelectorAll("button[aria-expanded]")].find(e=>e.textContent.startsWith(' + json.dumps(name) + '))'

def markers():
    return evaluate('return [...document.querySelectorAll(".milestone-year-scroll a[aria-label]")].map(e=>e.getAttribute("aria-label"));')

for width in [1440, 390, 320]:
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=1000, deviceScaleFactor=1, mobile=False)
    cdp('Emulation.setEmulatedMedia', features=[{'name':'prefers-reduced-motion','value':'no-preference'}])
    goto_url(origin + '/milestones'); wait_for_load()
    assert wait_for_element('.milestone-filter-chevron', visible=True)
    time.sleep(.3)
    original = markers()
    for name in ['Capital','Clinical','Commercial']:
        expr = trigger(name)
        # Center AND lower-half targets must belong to the button, not year-strip padding.
        click(expr)
        state = evaluate('const b=' + expr + ';const p=document.getElementById(b.getAttribute("aria-controls"));const r=p.getBoundingClientRect();return {open:b.getAttribute("aria-expanded"),display:getComputedStyle(p).display,left:r.left,right:r.right,width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,animation:getComputedStyle(p).animationName,duration:getComputedStyle(p).animationDuration,arrow:getComputedStyle(b.querySelector(".milestone-filter-chevron")).transitionDuration};')
        assert state['open'] == 'true' and state['display'] != 'none', state
        assert state['left'] >= 0 and state['right'] <= state['client'] + 1, state
        assert state['width'] == width and state['scroll'] <= width, state
        assert state['animation'] == 'milestone-filter-reveal' and state['duration'] == '0.12s' and state['arrow'] == '0.12s', state
        assert markers() == original
        time.sleep(.16)  # Captioned captures show the settled disclosure, not an arbitrary transition frame.
        settled = evaluate('const b=' + expr + ';return getComputedStyle(b.querySelector(".milestone-filter-chevron")).transform;')
        assert settled == 'matrix(0, 1, -1, 0, 0, 0)', settled
        capture_screenshot(path=str(out / ('roundtrip-' + name.lower() + '-' + str(width) + '.png')))
        # Keep original repeated-category-click clear/all behavior.
        click(expr)
        assert len(markers()) < len(original)
        panel = 'document.getElementById((' + expr + ').getAttribute("aria-controls"))'
        option = panel + '.querySelector("button[aria-pressed]")'
        click(option)
        assert evaluate('return (' + option + ').getAttribute("aria-pressed");') == 'true'
        selected = markers()
        collapse = panel + '.querySelector("button[title=Collapse]")'
        click(collapse)
        assert evaluate('return (' + expr + ').getAttribute("aria-expanded");') == 'false'
        click(expr)
        assert markers() == selected
        click(expr)
        assert markers() == original
        # Keyboard close and reopen retain the same selection and focusable disclosure.
        evaluate('(' + collapse + ').focus();')
        cdp('Page.bringToFront'); press_key('Enter')
        evaluate('(' + expr + ').focus();')
        cdp('Page.bringToFront'); press_key('Enter')
        assert evaluate('return (' + expr + ').getAttribute("aria-expanded");') == 'true'
        assert markers() == original
        click(collapse)
        results.append({'width':width,'category':name,'state':state,'filterRoundtrip':True,'centerClicks':True,'keyboard':True})
    bci = '[...document.querySelectorAll("button")].find(e=>e.textContent.startsWith("BCI only"))'
    all_neuro = '[...document.querySelectorAll("button")].find(e=>e.textContent.startsWith("All neurotech"))'
    click(bci); assert len(markers()) < len(original)
    click(all_neuro); assert markers() == original
    cdp('Emulation.setEmulatedMedia', features=[{'name':'prefers-reduced-motion','value':'reduce'}])
    click(trigger('Capital'))
    reduced = evaluate('const b=' + trigger('Capital') + ';return {arrow:getComputedStyle(b.querySelector(".milestone-filter-chevron")).transitionDuration,menu:getComputedStyle(document.getElementById(b.getAttribute("aria-controls"))).animationName};')
    assert reduced == {'arrow':'0s','menu':'none'}, reduced
    results.append({'width':width,'scopeRoundtrip':True,'reducedMotion':reduced})
    click('document.getElementById((' + trigger('Capital') + ').getAttribute("aria-controls")).querySelector("button[title=Collapse]")')
cdp('Emulation.setEmulatedMedia', features=[])
(out / 'native-interactions.json').write_text(json.dumps({'results':results,'scope':'actual local Next route; native mouse/keyboard, desktop emulation at requested widths, not physical-touch or hosted authentication'}, indent=2))
print(json.dumps({'passed':True,'cases':len(results),'results':results},indent=2))
