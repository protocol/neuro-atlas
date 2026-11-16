# Rasterized landmark regressions for ASCR-001: offsets, scrolling, original transform.
# Execute against the exact-head esbuild bundle of src/components/feedback/screenshot.ts.
import os,json,time,base64
from pathlib import Path
out=Path(os.environ['FEEDBACK_SCREENSHOT_QA_OUT']);out.mkdir(parents=True,exist_ok=True)
js(Path(os.environ['FEEDBACK_SCREENSHOT_CAPTURE_BUNDLE']).read_text()+';globalThis.__captureQA=CaptureQA;')
cdp('Emulation.setDeviceMetricsOverride',width=390,height=900,deviceScaleFactor=1,mobile=True)
cdp('Page.bringToFront')
results=[]
for name in ['offset-xy','scrolled-transform']:
 js("document.querySelector('[data-qa-raster-root]')?.remove()")
 js(f"""(()=>{{
 const root=document.createElement('article');root.setAttribute('data-qa-raster-root','');
 const mode={json.dumps(name)};
 Object.assign(root.style,{{position:'fixed',zIndex:'2147483000',margin:'0',padding:'0',border:'0',background:'rgb(240,240,240)',boxSizing:'border-box',transform:'none'}});
 const stage=document.createElement('div');Object.assign(stage.style,{{position:'relative',width:'1600px',height:'1800px',background:'linear-gradient(rgb(100,180,100),rgb(100,100,180))'}});
 const target=document.createElement('div');target.setAttribute('data-qa-raster-target','');Object.assign(target.style,{{position:'absolute',width:'48px',height:'48px',background:'rgb(233,37,173)',border:'0',boxShadow:'none'}});
 if(mode==='offset-xy'){{Object.assign(root.style,{{left:'-480px',top:'-300px',width:'1600px',height:'1400px',overflow:'hidden'}});Object.assign(target.style,{{left:'650px',top:'950px'}});}}
 else{{Object.assign(root.style,{{left:'30px',top:'50px',width:'330px',height:'700px',overflow:'auto',transform:'translate(7px,9px)'}});Object.assign(target.style,{{left:'550px',top:'1200px'}});}}
 stage.append(target);root.append(stage);document.body.append(root);if(mode!=='offset-xy')root.scrollTo(430,700);
 window.__raster={{root,target}};
 }})()""")
 js("""(()=>{window.__rasterResult=null;const {root,target}=__raster,frozen=__captureQA.freezeFeedbackRegion(target),highlight=frozen.highlight;
 const imagePromise=__captureQA.captureFeedbackScreenshot(target);target.style.background='rgb(20,20,20)';
 imagePromise.then(async image=>{if(image.status!=='captured'){window.__rasterResult={status:image.status,reason:image.reason};return;}
 const i=new Image();i.src='data:image/png;base64,'+image.data;await i.decode();const canvas=document.createElement('canvas');canvas.width=i.width;canvas.height=i.height;const context=canvas.getContext('2d');context.drawImage(i,0,0);
 const x=Math.floor(highlight.left+highlight.width/2),y=Math.floor(highlight.top+highlight.height/2);
 window.__rasterImage=image.data;window.__rasterResult={status:'captured',pixel:[...context.getImageData(x,y,1,1).data],x,y,width:i.width,height:i.height,rootTransform:getComputedStyle(root).transform,rootRect:JSON.stringify(root.getBoundingClientRect()),scrollLeft:root.scrollLeft,scrollTop:root.scrollTop};});})()""")
 deadline=time.monotonic()+15
 while time.monotonic()<deadline and not js('!!window.__rasterResult'):time.sleep(.05)
 result=js('window.__rasterResult');assert result,result
 data=js('window.__rasterImage');
 if data:(out/(name+'.png')).write_bytes(base64.b64decode(data))
 (out/(name+'.json')).write_text(json.dumps(result,indent=2))
 assert result.get('pixel')==[233,37,173,255],result
 results.append({'case':name,**result})
js("document.querySelector('[data-qa-raster-root]')?.remove()")
(out/'raster-results.json').write_text(json.dumps(results,indent=2));print(json.dumps({'rasterContentAlignmentPassed':len(results),'output':str(out)}))
