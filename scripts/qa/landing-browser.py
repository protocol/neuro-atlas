"""Run with the owned browser-harness session; local-only production QA fixture."""
import json
from pathlib import Path

BASE = 'http://127.0.0.1:3147'
OUT = Path('/opt/data/tmp/neuro-landing-evidence')
OUT.mkdir(exist_ok=True)
results = []
for width, height in [(320, 740), (390, 844), (768, 1024), (1024, 900), (1440, 1000)]:
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=False)
    goto_url(BASE)
    wait_for_load()
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
    if width >= 1280:
        assert all(abs(tile['top'] - tiles[0]['top']) < 1 for tile in tiles)
    elif width >= 640:
        assert abs(tiles[0]['top'] - tiles[1]['top']) < 1
        assert tiles[2]['top'] > tiles[0]['bottom']
        assert tiles[2]['width'] > tiles[0]['width'] * 1.9
    else:
        assert all(abs(tile['x'] - tiles[0]['x']) < 1 for tile in tiles)
    results.append(measured)
Path('/opt/data/tmp/neuro-landing-responsive.json').write_text(json.dumps(results, indent=2))
print(json.dumps({'responsive':'PASS','widths':[r['width'] for r in results]}))
