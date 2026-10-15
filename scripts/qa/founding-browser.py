"""Run via browser-harness; loopback-only production-built Funding Index fixture, not hosted access."""
import hashlib
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(os.environ['ATLAS_QA_ROOT'])
BASE = os.environ.get('ATLAS_QA_URL', 'http://127.0.0.1:3498').rstrip('/')
assert urlparse(BASE).hostname in {'127.0.0.1', 'localhost'}, 'Local QA only'
OUT = ROOT / 'docs/funding-founding/qa'
OUT.mkdir(parents=True, exist_ok=True)
data = json.loads((ROOT / 'src/data/funding-index.json').read_text())
expected = {c['slug']: c['founding'] for c in data['companies']}
results = []


def click_visible(expression):
    point = js("""(() => { const el = EXPR; if (!el) throw Error('Missing click target');
      el.scrollIntoView({behavior:'instant',block:'center'});
      const r=el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
      if (!el.contains(document.elementFromPoint(x,y))) throw Error('Click target occluded');
      return {x,y}; })()""".replace('EXPR', expression))
    click_at_xy(point['x'], point['y'])


for width, height in [(1440, 1000), (390, 844), (320, 800)]:
    for theme in ['light', 'dark']:
        cdp('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=False)
        goto_url(BASE + '/funding')
        wait_for_load()
        assert wait_for_element('[data-founding-year]', visible=True)
        js(f"localStorage.setItem('theme', {json.dumps(theme)})")
        cdp('Page.reload', ignoreCache=True)
        # Read-only retry: a reload can invalidate the previous execution context.
        for attempt in range(30):
            try:
                if wait_for_element('[data-founding-year]', visible=True):
                    break
            except RuntimeError as error:
                if 'navigated or closed' not in str(error) and 'context' not in str(error):
                    raise
            time.sleep(.1)
        assert wait_for_element('[data-founding-year]', visible=True)
        # Wait for the theme provider, not just SSR HTML. No mutation is retried.
        for _ in range(40):
            if js(f"document.documentElement.classList.contains({json.dumps(theme)})"):
                break
            time.sleep(.1)
        assert js(f"document.documentElement.classList.contains({json.dumps(theme)})")
        for view in ['timeline', 'stage']:
            if view == 'stage':
                click_visible("[...document.querySelectorAll('button')].find(x=>x.textContent==='stage')")
                assert wait_for_element('[data-founding-year]', visible=True)
            js("document.querySelector('[aria-label=\"Index lens\"]').scrollIntoView({behavior:'instant',block:'start'})")
            capture_screenshot(path=str(OUT / f'{view}-{theme}-{width}.png'))
            observed = js("""(() => [...document.querySelectorAll('[data-founding-year]')].map(el=>{
              const r=el.getBoundingClientRect(), p=el.parentElement.getBoundingClientRect();
              const range=document.createRange(); range.selectNodeContents(el);
              const t=range.getBoundingClientRect();
              return {slug:el.dataset.foundingYear,text:el.textContent, width:r.width,
                textWidth:t.width, contained:t.right<=p.right+1 && t.left>=p.left-1,
                fontSize:getComputedStyle(el).fontSize};
            }))()""")
            assert len(observed) == 25
            assert len({x['slug'] for x in observed}) == 25
            for item in observed:
                assert item['text'] == 'Founding year · ' + str(expected[item['slug']]['year']), item
                assert item['contained'], item
                assert float(item['fontSize'].removesuffix('px')) >= 11, item
            bounds = js('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})')
            baseline_limit = width == 320 and view == 'stage'
            if baseline_limit:
                # Independently reproduced on untouched a7b14fd: the pre-existing
                # stage-card header min-content width exceeds the narrow viewport.
                assert bounds == {'scroll': 340, 'client': 305}, bounds
            else:
                assert bounds['scroll'] <= bounds['client'], bounds
            # Exercise the factual edge cases with actual visible row clicks.
            slug = 'gestala' if view == 'timeline' else 'neurosoft-bioelectronics'
            # Timeline rows are wide by design; click the visible company-name region.
            target = f'document.querySelector(\'[data-founding-year="{slug}"]\')'
            click_visible(target)
            assert wait_for_element('[role="dialog"]', visible=True)
            section = js("""(() => {const d=document.querySelector('[role="dialog"]');
              const s=[...d.querySelectorAll('section')].find(x=>x.querySelector('h3')?.textContent==='Founding year');
              s.scrollIntoView({behavior:'instant',block:'center'});
              const a=s.querySelector('a'),r=a.getBoundingClientRect();
              return {text:s.innerText,url:a.getAttribute('href'),target:a.target,rel:a.rel,
                linkVisible:r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth,
                scroll:d.scrollWidth,client:d.clientWidth};})()""")
            assert str(expected[slug]['year']) in section['text']
            assert expected[slug]['note'] in section['text']
            assert 'Oct 15, 2026' in section['text']
            assert section['url'] == expected[slug]['sourceUrl']
            assert section['target'] == '_blank' and 'noreferrer' in section['rel']
            assert section['linkVisible'] and section['scroll'] <= section['client'], section
            capture_screenshot(path=str(OUT / f'detail-{slug}-{theme}-{width}.png'))
            press_key('Escape')
            for _ in range(20):
                if not js("Boolean(document.querySelector('[role=\"dialog\"]'))"):
                    break
                time.sleep(.1)
            assert not js("Boolean(document.querySelector('[role=\"dialog\"]'))")
            results.append({'width':width,'theme':theme,'view':view,'companyCount':len(observed),
                            'allYearsMatch':True,'newLabelsContained':True,'pageBounds':bounds,
                            'matchesPreexisting320StageOverflow':baseline_limit,
                            'detailCompany':slug,'detailSourceMatches':True,'detailLinkVisible':True,
                            'escapeCloses':True})

receipt = {'status':'PASS','fixture':'Loopback static serving of npm run build HTML/assets; production auth unchanged; not hosted verification',
           'sourceCommit':os.environ['ATLAS_QA_SHA'],
           'fundingHtmlSha256':hashlib.sha256((ROOT/'.next/server/app/funding.html').read_bytes()).hexdigest(),
           'fundingDataSha256':hashlib.sha256((ROOT/'src/data/funding-index.json').read_bytes()).hexdigest(),
           'cases':results}
(OUT/'browser-results.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':'PASS','cases':len(results),'companiesPerView':25}))
