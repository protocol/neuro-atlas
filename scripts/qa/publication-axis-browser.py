"""Run through the authorized headed browser-harness on an owned loopback QA tab."""
import base64, json, os, time
from pathlib import Path

BASE=os.environ['AXIS_QA_BASE'].rstrip('/')
OUT=Path(os.environ['AXIS_QA_OUT']); OUT.mkdir(parents=True,exist_ok=True)
REV=os.environ['AXIS_QA_REV']
assert BASE.startswith('http://127.0.0.1:')

def wait_js(expression, timeout=20):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        result=js(expression)
        if result: return result
        time.sleep(.15)
    raise AssertionError('Bounded native condition failed: '+expression[:160])

def rect(selector):
    return js('return (()=>{const e=document.querySelector('+json.dumps(selector)+'); if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()')

results=[]
for width in [1440,390,320]:
    cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=False)
    goto_url('about:blank');wait_for_load()
    goto_url(BASE+'/neuro-atlas/field-velocity#publication-output');wait_for_load()
    wait_for_element('dialog[open] [data-annual-axis="science"]',visible=True)
    wait_js('return !!document.querySelector("dialog[open] circle[data-science-year=\\"2010\\"]")')
    cdp('Page.bringToFront')
    state=js('''return (()=>{
      const d=document.querySelector('dialog[open]'),s=d.querySelector('.publication-full-plot svg');
      const a=s.querySelector('circle[data-year="2022"]'),b=s.querySelector('circle[data-science-year="2022"]');
      const box=s.getBoundingClientRect(),texts=[...s.querySelectorAll('text')].map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,size:parseFloat(getComputedStyle(e).fontSize)*Math.abs(e.getScreenCTM().d)};});
      return {width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,actuals:s.querySelectorAll('circle[data-year]').length,science:s.querySelectorAll('circle[data-science-year]').length,anchorDelta:Math.abs(+a.getAttribute('cy')- +b.getAttribute('cy')),anchorXDelta:Math.abs(+a.getAttribute('cx')- +b.getAttribute('cx')),inspector:d.querySelector('[data-publication-inspector]').textContent,tooltip:!!s.querySelector('[role=tooltip]'),texts,svg:{left:box.left,right:box.right},labels:[...s.querySelectorAll('[data-annual-axis]')].map(e=>({text:e.textContent,color:getComputedStyle(e).fill}))};
    })()''')
    assert state['width']==width and state['scroll']<=state['client']+1, state
    assert state['actuals']==16 and state['science']==16 and state['anchorDelta']<1e-8 and state['anchorXDelta']<1e-8,state
    assert state['inspector']=='' and not state['tooltip'],state
    assert min(t['size'] for t in state['texts'])>=10.9,state['texts']
    assert all(t['left']>=state['svg']['left']-1 and t['right']<=state['svg']['right']+1 for t in state['texts']),state['texts']
    capture_screenshot(str(OUT/f'annual-dual-axis-{width}.png'))
    # Actual keyboard focus/activation drives the shared-year inspection.
    js('document.querySelector(\'dialog[open] circle[data-year="2022"]\').focus(); return true')
    press_key('Enter')
    wait_js('return !!document.querySelector(\'dialog[open] [data-annual-tooltip="2022"]\')')
    tooltip=js('return document.querySelector(\'dialog[open] [data-annual-tooltip="2022"]\').textContent')
    assert '100' in tooltip and '9,726' in tooltip,tooltip
    guide=js('return !!document.querySelector("dialog[open] [data-annual-year-guide]")')
    assert guide
    capture_screenshot(str(OUT/f'annual-shared-tooltip-{width}.png'))
    # The real PNG handler runs; intercept only its final download click on loopback.
    if width==1440:
        js('''window.__axisPng=null;const original=URL.createObjectURL.bind(URL);URL.createObjectURL=(blob)=>{if(blob.type==='image/png')window.__axisPng=blob;return original(blob)};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download&&this.download.endsWith('.png'))return;return click.call(this)};return true''')
        buttons=js('return [...document.querySelectorAll("dialog[open] button")].map(e=>({text:e.textContent,aria:e.getAttribute("aria-label")}))')
        selector='dialog[open] button[aria-label="Download chart as PNG"]'
        target=rect(selector)
        if not target:
            target=js('''return (()=>{const e=[...document.querySelectorAll('dialog[open] button')].find(e=>e.textContent.includes('Download PNG'));if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()''')
        assert target,buttons
        click_at_xy(target['x']+target['w']/2,target['y']+target['h']/2)
        wait_js('return !!window.__axisPng',30)
        payload=js('''return (async()=>{const a=new Uint8Array(await window.__axisPng.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s)})()''')
        (OUT/'annual-dual-axis-export.png').write_bytes(base64.b64decode(payload))
    # Escape closes; native preview click reopens; Escape restores that trigger.
    press_key('Escape');wait_js('return !document.querySelector("dialog[open]")')
    js('''const e=document.querySelector('[data-publication-card="publication-output"]'); e.scrollIntoView({block:'center'});return true''')
    wait_js('return !!document.querySelector(\'[data-publication-card="publication-output"] .publication-preview svg\')')
    preview=js('''return (()=>{const s=document.querySelector('[data-publication-card="publication-output"] .publication-preview svg'),r=s.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},texts:[...s.querySelectorAll('text')].map(e=>{const b=e.getBoundingClientRect();return {text:e.textContent,left:b.left,right:b.right,top:b.top,bottom:b.bottom,size:parseFloat(getComputedStyle(e).fontSize)*Math.abs(e.getScreenCTM().d)};})};})()''')
    assert min(t['size'] for t in preview['texts'])>=10.9,preview
    assert all(t['left']>=preview['rect']['x']-1 and t['right']<=preview['rect']['x']+preview['rect']['w']+1 for t in preview['texts']),preview
    axes=preview['texts'][:2]
    assert axes[0]['right']<=axes[1]['left']+1 or axes[0]['bottom']<=axes[1]['top']+1 or axes[1]['bottom']<=axes[0]['top']+1,preview
    for i,a in enumerate(preview['texts']):
        for b in preview['texts'][i+1:]:
            overlap_x=min(a['right'],b['right'])-max(a['left'],b['left'])
            overlap_y=min(a['bottom'],b['bottom'])-max(a['top'],b['top'])
            assert overlap_x<.5 or overlap_y<.5,{'overlappingText':[a,b],'width':width}
    key=js('return document.querySelector(\'[data-publication-card="publication-output"] [data-annual-preview-key]\').textContent')
    assert all(label in key for label in ['Neurotech','All research','Four-domain range']),key
    capture_screenshot(str(OUT/f'annual-preview-{width}.png'))
    r=preview['rect']; click_at_xy(r['x']+r['w']/2,r['y']+r['h']/2)
    wait_js('return !!document.querySelector("dialog[open] [data-annual-axis]")')
    press_key('Escape');wait_js('return !document.querySelector("dialog[open]")')
    focus=js('return document.activeElement?.className')
    assert 'publication-preview-trigger' in focus,focus
    results.append({'width':width,'modal':state,'preview':preview,'tooltip':tooltip,'guide':guide,'returnFocus':focus})
    goto_url('about:blank');wait_for_load()
(OUT/'native-results.json').write_text(json.dumps({'revision':REV,'results':results},indent=2)+'\n')
print(json.dumps({'revision':REV,'widths':[x['width'] for x in results],'screenshots':len(list(OUT.glob('*.png'))),'nativeChecks':'passed'}))
