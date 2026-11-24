"""Run inside an owned browser-harness session against the task's local production server."""
import json
import base64
import time
from pathlib import Path
from urllib.parse import urlsplit

BASE = globals().get('QA_ORIGIN', 'http://127.0.0.1:3147').rstrip('/')
assert urlsplit(BASE).hostname in ('127.0.0.1', 'localhost'), 'Interaction fixtures stay on loopback'
PREFIX = urlsplit(BASE).path.rstrip('/')
OUT = Path(globals().get('QA_OUT', '/opt/data/tmp/neuro-landing-evidence'))
OUT.mkdir(parents=True, exist_ok=True)

def center(selector):
    return js(f"(() => {{ const r=document.querySelector({json.dumps(selector)}).getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; }})()")

def capture(name):
    capture_screenshot(path=str(OUT / name))

def home():
    goto_url(BASE)
    wait_for_load()
    assert wait_for_element('.landing-rows', visible=True)

cdp('Emulation.setDeviceMetricsOverride', width=1440, height=1000, deviceScaleFactor=1, mobile=False)
home()
capture('interaction-home.png')
click_at_xy(*center('.landing-explore'))
capture('interaction-explore.png')
assert js("location.hash") == '#explore'
assert js("document.activeElement.id") == 'explore'
press_key('Tab')
capture('interaction-keyboard.png')
assert js("document.activeElement.getAttribute('href')") == PREFIX + '/milestones'
assert js("getComputedStyle(document.activeElement).outlineStyle") != 'none'
for i, (route, title) in enumerate([('/milestones', 'Milestones'), ('/field-velocity', 'Field velocity'), ('/funding', 'BCI Funding Index')]):
    home()
    selector = f'.landing-tile[href="{PREFIX}{route}"]'
    js(f"document.querySelector({json.dumps(selector)}).scrollIntoView({{behavior:'instant',block:'center'}})")
    capture(f'interaction-tile-{i}.png')
    click_at_xy(*center(selector))
    wait_for_load()
    expected = PREFIX + route
    state = None
    for _ in range(50):
        state = js("({path:location.pathname,title:document.querySelector('h1')?.textContent})")
        if state == {'path': expected, 'title': title}:
            break
        time.sleep(.1)
    assert state == {'path': expected, 'title': title}, state
    capture(f'interaction-route-{i}.png')

home()
cdp('Page.bringToFront')
js("window.scrollTo({top:0,behavior:'instant'})")
capture('interaction-before-theme.png')
click_at_xy(*center('aside button'))
capture('landing-dark-1440.png')
assert js("document.documentElement.classList.contains('dark')")
cdp('Emulation.setEmulatedMedia', features=[{'name':'prefers-reduced-motion','value':'reduce'}])
assert js("getComputedStyle(document.querySelector('.landing-tile')).transitionDuration") == '0s'
cdp('Emulation.setEmulatedMedia', features=[])
click_at_xy(*center('aside button'))
capture('landing-light-restored.png')
assert not js("document.documentElement.classList.contains('dark')")
for width, height in [(1440, 1000), (390, 844), (320, 740)]:
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=width < 640)
    home()
    js("window.scrollTo({top:0,behavior:'instant'})")
    capture(f'landing-final-{width}.png')
    size=cdp('Page.getLayoutMetrics')['cssContentSize']
    image=cdp('Page.captureScreenshot',format='png',captureBeyondViewport=True,clip={'x':0,'y':0,'width':width,'height':size['height'],'scale':1})
    (OUT / f'landing-full-{width}.png').write_bytes(base64.b64decode(image['data']))
print(json.dumps({'interactions':'PASS','routes':3,'explore':'scroll and focus','keyboard':'visible focus','themes':'light/dark/restored','reducedMotion':'PASS'}))
