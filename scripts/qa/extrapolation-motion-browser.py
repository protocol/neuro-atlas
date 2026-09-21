# Execute with owned browser-harness stdin, loopback only.
import json, os, time, hashlib
from pathlib import Path
BASE=os.environ.get('ATLAS_MOTION_URL','http://127.0.0.1:3493/neuro-atlas/field-velocity')
OUT=Path(os.environ.get('ATLAS_MOTION_OUT','.qa/extrapolation-motion'))
PHASE=os.environ.get('ATLAS_MOTION_PHASE','baseline')
OUT.mkdir(parents=True,exist_ok=True)
assert BASE.startswith('http://127.0.0.1:')
def val(s): return js('(() => '+s+')()')
def wait_for(s):
    for _ in range(70):
        if val(s): return
        time.sleep(.05)
    raise AssertionError(s)
def snap(name): capture_screenshot(path=str(OUT/(PHASE+'-'+name+'.png')))
def signature(): return val('''{const s=document.querySelector('dialog .pc-chart-scroll svg');return {svg:s.outerHTML,source:document.querySelector('dialog table').outerHTML,previews:[...document.querySelectorAll('.pc-preview')].map(e=>e.outerHTML)}}''')
def start_samples(reverse_ms=None):
    js('''(() => {window.__motion=[];window.__motionDone=false;const b=document.querySelector('dialog [role=switch]');b.addEventListener('click',()=>{let t0=performance.now();function frame(t){const svg=document.querySelector('dialog .pc-chart-scroll svg');if(!svg)return;const p=[...svg.querySelectorAll('[data-curve-point]')].at(-1);const rect=svg.getBoundingClientRect();window.__motion.push({t:t-t0,x:+p.getAttribute('cx'),y:+p.getAttribute('cy'),height:svg.viewBox.baseVal.height,top:rect.top,width:rect.width,renderHeight:rect.height,points:svg.querySelectorAll('[data-curve-point]').length,lines:svg.querySelectorAll('[data-target-line]').length,grid:[...svg.querySelectorAll('line[stroke-dasharray="3 5"]')].map(e=>+e.getAttribute('y1')),state:b.getAttribute('aria-checked')});if(t-t0<1500)requestAnimationFrame(frame);else window.__motionDone=true;}window.__motionDone=false;requestAnimationFrame(frame);'''+('setTimeout(()=>b.click(),'+str(reverse_ms)+');' if reverse_ms else '')+'''},{once:true});})()''')
def click_toggle():
    capture_screenshot(path=str(OUT/'before-toggle.png'))
    r=val('document.querySelector("dialog [role=switch]").getBoundingClientRect().toJSON()')
    assert r['y']>=0 and r['bottom']<=1000,r
    click_at_xy(r['x']+r['width']/2,r['y']+r['height']/2)
def sample_toggle(reverse_ms=None):
    start_samples(reverse_ms);click_toggle();wait_for('window.__motionDone');return val('window.__motion')
def unique(rows,key):return len(set(round(r[key],3) for r in rows))
report=[]
cdp('Page.bringToFront')
cdp('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'no-preference'}])
for width in [1440,390,320]:
    cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=False)
    for ident in ['simultaneously-recorded-neurons','neural-recording-hours']:
        goto_url(BASE+'#'+ident);wait_for_load();cdp('Page.reload',ignoreCache=True);wait_for_load()
        wait_for('document.querySelector("dialog[open] [role=switch]")!==null')
        cdp('Page.bringToFront')
        off=signature();off_top=val('document.querySelector("dialog .pc-chart-scroll svg").getBoundingClientRect().top');snap('off-'+ident+'-'+str(width))
        on=sample_toggle();snap('on-'+ident+'-'+str(width))
        assert val('document.querySelector("dialog [role=switch]").getAttribute("aria-checked")')=='true'
        assert val('document.documentElement.scrollWidth')<=width
        assert val('innerWidth')==width
        assert val('document.querySelector("dialog").scrollWidth<=document.querySelector("dialog").clientWidth')
        assert signature()['source']==off['source']
        assert signature()['previews']==off['previews']
        backward=sample_toggle();snap('off-restored-'+ident+'-'+str(width))
        assert signature()==off,(width,ident,'exact restoration')
        rec={'width':width,'chart':ident,'forward':on,'reverse':backward,'off_hash':hashlib.sha256(off['svg'].encode()).hexdigest()}
        if PHASE!='baseline':
            assert unique(on,'x')>6 and unique(on,'y')>6,(width,ident,'no actual point interpolation')
            assert unique(on,'height')>6 and unique(on,'renderHeight')>6,(width,ident,'no actual height interpolation')
            assert unique(backward,'x')>6 and unique(backward,'y')>6,(width,ident,'no reverse interpolation')
            assert max(abs(r['top']-off_top) for r in on)<2,(width,ident,'chart top jumps',off_top,on[0]['top'])
            baseline=json.loads((OUT/'baseline.json').read_text())
            prior=next(r for r in baseline if r['width']==width and r['chart']==ident)
            assert rec['off_hash']==prior['off_hash']
            for key in ['x','y','height','width','renderHeight','points']:
                assert abs(on[-1][key]-prior['forward'][-1][key])<.02,(width,ident,'changed settled on geometry',key)
            rapid=sample_toggle(250)
            assert signature()==off,(width,ident,'rapid reversal does not restore')
            assert unique(rapid,'x')>6
            rec['rapid']=rapid
            # Keyboard input and reduced motion: terminal geometry by first paint.
            cdp('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'reduce'}])
            val('document.querySelector("dialog [role=switch]").focus()')
            start_samples();press_key('Enter');wait_for('window.__motionDone')
            reduced=val('window.__motion')
            # Reduced motion may commit on the next paint, but never traverses intermediate geometry.
            assert all(r['height'] in [300,380] for r in reduced)
            assert all(r['height']==380 for r in reduced if r['t']>=50)
            assert val('document.querySelector("dialog [role=switch]").getAttribute("aria-checked")')=='true'
            press_key('Enter');time.sleep(.15)
            assert signature()==off
            rec['reduced']=reduced[:2]
            cdp('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'no-preference'}])
        report.append(rec)
        (OUT/(PHASE+'.json')).write_text(json.dumps(report,indent=2))
print(json.dumps({'phase':PHASE,'cases':len(report),'motions':[{'width':r['width'],'chart':r['chart'],'forwardPositions':unique(r['forward'],'x'),'reversePositions':unique(r['reverse'],'x')}for r in report]}))
