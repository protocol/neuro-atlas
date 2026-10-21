"""Run via owned browser-harness; QA_URL/QA_OUT must identify a loopback build."""
import json
import time
from pathlib import Path
from urllib.parse import urlparse

assert urlparse(QA_URL).hostname in ('localhost', '127.0.0.1')
assert js('location.origin') == f'{urlparse(QA_URL).scheme}://{urlparse(QA_URL).netloc}'
out = Path(QA_OUT)
out.mkdir(parents=True, exist_ok=True)
anchors = ['metric-implanted-bci-humans', 'metric-recording-hours',
           'metric-panel-neuroai-imagenet', 'metric-paired-structure-function',
           'metric-panel-flyvis-contrast']
results = []


def wait_for(expression, label):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if js(expression):
            return
        time.sleep(.05)
    raise AssertionError(label)


def point(selector):
    js(f"document.querySelector({json.dumps(selector)}).scrollIntoView({{block:'center',behavior:'instant'}})")
    capture_screenshot(path=str(out / 'current-viewport.png'))
    result = js(f"""(() => {{const el=document.querySelector({json.dumps(selector)}),r=el.getBoundingClientRect();
      const x=r.x+r.width/2,y=r.y+r.height/2;
      return {{x,y,hit:el.contains(document.elementFromPoint(x,y))}};}})()""")
    assert result['hit'], selector
    return result


def go_history(delta):
    history = cdp('Page.getNavigationHistory')
    entry = history['entries'][history['currentIndex'] + delta]
    assert entry['url'].startswith(QA_URL.split('?')[0])
    cdp('Page.navigateToHistoryEntry', entryId=entry['id'])


def multi_entry_history():
    goto_url(QA_URL + '#expectations')
    wait_for_load()
    wait_for("location.hash === '#expectations' && !document.querySelector('[data-related-measurement]').closest('[hidden]')", 'multi-entry start')
    a, b = anchors[:2]
    for anchor in [a, b]:
        selector = f'[data-related-measurement="{anchor}"]'
        p = point(selector)
        click_at_xy(p['x'], p['y'])
        wait_for(f"location.hash === '#{anchor}'", 'multi-entry target')
        if anchor == a:
            p = point('button[aria-current="true"] + button')
            click_at_xy(p['x'], p['y'])
            wait_for("location.hash === '#expectations'", 'retain A in history')
    for delta, anchor, kind in [(-1,b,'link'),(-1,a,'heading'),(-1,a,'link'),(1,a,'heading'),(1,b,'link'),(1,b,'heading')]:
        go_history(delta)
        wanted_hash = '#expectations' if kind == 'link' else '#' + anchor
        selector = f'[data-related-measurement="{anchor}"]'
        focus = f"document.querySelector({json.dumps(selector)})" if kind == 'link' else f"document.getElementById('{anchor}').closest('article').querySelector('h4')"
        wait_for(f"location.hash === '{wanted_hash}' && document.activeElement === {focus}", f'multi-entry focus {delta} {anchor} {kind}')


for width in [1440, 390, 320]:
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=1100,
        deviceScaleFactor=1, mobile=width < 500)
    goto_url(QA_URL + '#expectations')
    wait_for_load()
    wait_for('document.querySelectorAll("[data-related-measurement]").length === 5 && !document.querySelector("[data-related-measurement]").closest("[hidden]")', 'Expectations ready')
    assert js('document.querySelectorAll("[data-inflection]").length') == 4
    bounds = js('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
    assert bounds['client'] == bounds['scroll'], bounds
    for index, anchor in enumerate(anchors):
        selector = f'[data-related-measurement="{anchor}"]'
        p = point(selector)
        if index % 2:
            js(f'document.querySelector({json.dumps(selector)}).focus()')
            press_key('Enter')
            activation = 'native Enter'
        else:
            click_at_xy(p['x'], p['y'])
            activation = 'native pointer'
        wait_for(f"location.hash === '#{anchor}' && !document.getElementById('{anchor}').closest('[hidden]') && document.activeElement === document.getElementById('{anchor}').closest('article').querySelector('h4')", 'visible target and heading focus: ' + anchor)
        wait_for(f"document.getElementById('{anchor}').getBoundingClientRect().top >= -1 && document.getElementById('{anchor}').getBoundingClientRect().top < innerHeight", 'navigation scroll settled: ' + anchor)
        target = js(f"""(() => {{const el=document.getElementById('{anchor}'),card=el.closest('article'),r=el.getBoundingClientRect();return {{hash:location.hash,path:location.pathname,query:location.search,top:r.top,heading:card.querySelector('h4').textContent,observations:card.querySelectorAll('[data-source-observation]').length}};}})()""")
        assert target['query'] == '?review=1', target
        assert target['path'] == urlparse(QA_URL).path, target
        assert -1 <= target['top'] < 1100, target
        assert target['observations'] > 0, target
        capture_screenshot(path=str(out / f'target-{width}-{anchor}.png'))
        go_history(-1)
        wait_for(f"location.hash === '#expectations' && document.activeElement === document.querySelector({json.dumps(selector)})", 'Back restores exact link')
        go_history(1)
        wait_for(f"location.hash === '#{anchor}' && document.activeElement === document.getElementById('{anchor}').closest('article').querySelector('h4')", 'Forward restores exact heading')
        go_history(-1)
        wait_for(f"location.hash === '#expectations' && document.activeElement === document.querySelector({json.dumps(selector)})", 'second Back')
        results.append({'width': width, 'activation': activation, 'target': target, 'back_forward_focus': True})
    # Actual disclosure remains separate from internal measurements.
    selector = '[data-related-forecasts] summary'
    p = point(selector)
    click_at_xy(p['x'], p['y'])
    wait_for("document.querySelector('[data-related-forecasts]').open", 'forecast disclosure')
    assert js("document.querySelector('[data-related-forecasts] a').target") == '_blank'
    capture_screenshot(path=str(out / f'forecasts-{width}.png'))
    p = point(selector)
    click_at_xy(p['x'], p['y'])
    wait_for("!document.querySelector('[data-related-forecasts]').open", 'forecast collapse')
    multi_entry_history()
    results.append({'multi_entry_history': True, 'width': width})

# Fresh direct links retain existing Metrics reveal behavior.
for anchor in anchors:
    goto_url(QA_URL + '#' + anchor)
    wait_for_load()
    wait_for(f"document.getElementById('{anchor}') && !document.getElementById('{anchor}').closest('[hidden]')", 'fresh direct link: ' + anchor)
    results.append({'fresh': anchor, 'visible': True})

# A filtered catalog must not make a later related destination disappear.
goto_url(QA_URL + '#performance_curves')
wait_for_load()
assert wait_for_element('#metrics-search', visible=True)
fill_input('#metrics-search', 'no-matching-data-for-related-test')
assert js("document.querySelector('#metrics-search').value") == 'no-matching-data-for-related-test'
p = point('button[aria-current="true"] + button')
click_at_xy(p['x'], p['y'])
wait_for("location.hash === '#expectations'", 'Expectations tab')
p = point('[data-related-measurement="metric-implanted-bci-humans"]')
click_at_xy(p['x'], p['y'])
wait_for("location.hash === '#metric-implanted-bci-humans' && !document.getElementById('metric-implanted-bci-humans').closest('[hidden]')", 'filtered link reveal')
assert js("document.querySelector('#metrics-search').value") == ''
results.append({'stale_search_cleared': True})
(out / 'results.json').write_text(json.dumps(results, indent=2))
print(json.dumps({'cases': len(results), 'passed': len(results), 'output': str(out)}))
