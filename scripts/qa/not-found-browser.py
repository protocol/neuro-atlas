"""Native browser-harness QA; writes only to a loopback origin and evidence files."""
import json
from pathlib import Path
from urllib.parse import urlparse

QA_BASE = globals().get('QA_BASE', 'http://127.0.0.1:38194/neuro-atlas')
assert urlparse(QA_BASE).hostname in ['localhost', '127.0.0.1', '::1']
QA_OUT = Path(globals().get('QA_OUT', '/opt/data/tmp/neuro-atlas-404-evidence'))
QA_OUT.mkdir(parents=True, exist_ok=True)
missing_url = QA_BASE + '/field-velocity3'
results = []
goto_url(missing_url)
wait_for_load()
old_theme = js('return localStorage.getItem("theme")')
try:
    for theme in ['light', 'dark']:
        js('localStorage.setItem("theme", ' + json.dumps(theme) + ')')
        for width, height in [(1440, 1000), (768, 1024), (390, 844), (320, 740)]:
            cdp('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=width < 640)
            goto_url(missing_url)
            wait_for_load()
            assert wait_for_element('.atlas-not-found', visible=True)
            cdp('Input.dispatchMouseEvent', type='mouseMoved', x=5, y=5)
            capture_screenshot(path=str(QA_OUT / f'{theme}-{width}.png'))
            measured = js('''return (() => {
              const heading = document.querySelector('.atlas-not-found h1');
              const range = document.createRange(); range.selectNodeContents(heading);
              const hero = document.querySelector('.atlas-not-found-hero').getBoundingClientRect();
              return {width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
                theme:document.documentElement.classList.contains('dark')?'dark':'light',
                heading:range.getBoundingClientRect().toJSON(), hero:hero.toJSON(),
                links:[...document.querySelectorAll('.atlas-not-found a')].map(a=>({href:a.pathname,rect:a.getBoundingClientRect().toJSON()}))};
            })()''')
            assert measured['theme'] == theme, measured
            assert measured['width'] == width, measured
            assert measured['scroll'] <= measured['client'] <= width, measured
            assert measured['heading']['left'] >= measured['hero']['left'], measured
            assert measured['heading']['right'] <= measured['hero']['right'], measured
            assert len(measured['links']) == 4
            assert all(a['rect']['height'] >= 44 for a in measured['links']), measured
            assert all(a['rect']['right'] <= measured['client'] for a in measured['links']), measured
            if width < 640:
                js('document.querySelector(".atlas-not-found-directory").scrollIntoView({block:"start"})')
                capture_screenshot(path=str(QA_OUT / f'{theme}-{width}-recovery.png'))
            results.append(measured)
    # Native tab navigation stays in document order with visible focus.
    cdp('Emulation.setDeviceMetricsOverride', width=1440, height=1000, deviceScaleFactor=1, mobile=False)
    js('localStorage.setItem("theme", "light")')
    goto_url(missing_url)
    wait_for_load()
    js('document.querySelector(".atlas-not-found-home").focus()')
    for expected in ['/milestones', '/field-velocity', '/funding']:
        press_key('Tab')
        active = js('return ({path:document.activeElement.pathname,focus:document.activeElement.matches(":focus-visible"),outline:getComputedStyle(document.activeElement).outlineWidth})')
        assert active['path'].endswith(expected) and active['focus'] and active['outline'] == '3px', active
    capture_screenshot(path=str(QA_OUT / 'keyboard-focus.png'))
    # Native clicks, not programmatic routing, exercise every recovery action.
    for i, expected in enumerate(['/', '/milestones', '/field-velocity', '/funding']):
        goto_url(missing_url)
        wait_for_load()
        js('document.querySelectorAll(".atlas-not-found a")['+str(i)+'].scrollIntoView({block:"center"})')
        capture_screenshot()
        point = js('return (()=>{const r=document.querySelectorAll(".atlas-not-found a")['+str(i)+'].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()')
        click_at_xy(point['x'], point['y'])
        expected_path = urlparse(QA_BASE).path + ('' if expected == '/' else expected)
        import time
        deadline = time.monotonic() + 20
        while True:
            state = js('return ({path:location.pathname,missing:!!document.querySelector(".atlas-not-found"),heading:document.querySelector("h1")?.textContent})')
            if state['path'] == expected_path and not state['missing']:
                break
            assert time.monotonic() < deadline, {'index':i,'expected':expected_path,**state}
            time.sleep(.2)
        capture_screenshot()
    (QA_OUT / 'results.json').write_text(json.dumps({'result':'PASS','responsive':results,'native_links':4,'keyboard':'PASS'}, indent=2))
    print(json.dumps({'result':'PASS','widths':[1440,768,390,320],'themes':['light','dark'],'native_links':4,'keyboard':'PASS','evidence':str(QA_OUT)}))
finally:
    js('localStorage.' + ('removeItem("theme")' if old_theme is None else 'setItem("theme", '+json.dumps(old_theme)+')'))
    goto_url(missing_url)
    wait_for_load()
