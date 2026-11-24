"""Run with the owned browser-harness session; local-only production QA fixture."""
import json
from pathlib import Path

BASE = globals().get('QA_ORIGIN', 'http://127.0.0.1:3147').rstrip('/')
OUT = Path(globals().get('QA_OUT', '/opt/data/tmp/neuro-landing-evidence'))
OUT.mkdir(parents=True, exist_ok=True)
results = []
for width, height in [(320, 740), (390, 844), (768, 1024), (1024, 900), (1440, 1000)]:
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=False)
    goto_url(BASE)
    wait_for_load()
    assert wait_for_element('.landing-rows', visible=True), 'Landing rows did not render'
    capture_screenshot(path=str(OUT / f'landing-{width}.png'))
    measured = js("""(() => {
      const h=document.querySelector('h1'); const range=document.createRange(); range.selectNodeContents(h);
      return {width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
        heading:h.getBoundingClientRect().toJSON(),glyphs:range.getBoundingClientRect().toJSON(),line:parseFloat(getComputedStyle(h).lineHeight),
        tiles:[...document.querySelectorAll('.landing-tile')].map(x=>x.getBoundingClientRect().toJSON())};
    })()""")
    assert measured['width'] == width, measured
    assert measured['scroll'] <= width, measured
    assert measured['glyphs']['right'] <= measured['heading']['right'] + 1, f'Headline clipped at {width}: {measured}'
    if width >= 1024:
        assert measured['heading']['height'] <= measured['line'] + 1, measured
    tiles = measured['tiles']
    assert len(tiles) == 3
    assert all(abs(tile['x'] - tiles[0]['x']) < 1 for tile in tiles), measured
    assert all(abs(tile['width'] - tiles[0]['width']) < 1 for tile in tiles), measured
    assert all(tiles[i]['top'] >= tiles[i-1]['bottom'] + 12 for i in range(1, 3)), measured
    for tile in tiles:
        assert tile['x'] >= 0 and tile['right'] <= measured['client'] + 1, measured
    results.append(measured)
(OUT / 'responsive.json').write_text(json.dumps(results, indent=2))
print(json.dumps({'responsive':'PASS','widths':[r['width'] for r in results]}))
