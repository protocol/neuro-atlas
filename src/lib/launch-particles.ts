// Canvas typography adapted from the owner's SAB intro: a real dot-field morph,
// with dynamic countdown targets, keyboard/tap controls, and a static fallback.
export const launchParticleScript = String.raw`
(()=>{
  const root=document.querySelector('main'),stage=document.querySelector('[data-title-stage]'),canvas=stage.querySelector('canvas'),button=stage.querySelector('button'),fallback=stage.querySelector('h1');
  const launch=Number(root.dataset.launchAt),serverNow=Number(root.dataset.serverNow),started=performance.now();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),hover=matchMedia('(hover: hover)');
  const context=canvas.getContext('2d'),sampler=document.createElement('canvas'),ink=sampler.getContext('2d',{willReadFrequently:true});
  let width=0,height=0,particles=[],expanded=false,frame=0,last=0,lastText='',opening=false,settledFrames=0;
  const pointer={x:-9999,y:-9999};
  const noise=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n)};
  function values(){const s=Math.max(0,Math.ceil((launch-serverNow-(performance.now()-started))/1000));return [Math.floor(s/86400),Math.floor(s/3600)%24,Math.floor(s/60)%60,s%60]}
  const countdownText=()=>values().map((v,i)=>String(v).padStart(2,'0')+['d','h','m','s'][i]).join(' ');
  function targets(text){
    if(!ink)return [];
    sampler.width=Math.ceil(width);sampler.height=Math.ceil(height);
    let size=Math.min(height*.64,width*(expanded?.105:.16));
    const family='"Helvetica Neue", Arial, sans-serif';
    ink.font='600 '+size+'px '+family;
    const measured=ink.measureText(text).width;
    if(measured>width*.91)size*=width*.91/measured;
    ink.font='600 '+size+'px '+family;ink.textAlign='center';ink.textBaseline='middle';ink.fillStyle='#fff';ink.fillText(text,width/2,height/2+size*.03);
    const pixels=ink.getImageData(0,0,sampler.width,sampler.height).data;
    const gap=width<600?2.65:3.5,points=[];
    for(let y=1;y<height;y+=gap)for(let x=1;x<width;x+=gap)if(pixels[(Math.floor(y)*sampler.width+Math.floor(x))*4+3]>128)points.push({x,y});
    return points;
  }
  function draw(){
    context.clearRect(0,0,width,height);
    particles.forEach((p,i)=>{context.fillStyle=i%23===0?'#9ab9f2':'#eef0f4';context.globalAlpha=.76;context.fillRect(p.x-.8,p.y-.8,1.6,1.6)});
    context.globalAlpha=1;
  }
  function animate(time){
    frame=0;if(document.hidden||reduced.matches||!context)return;
    const dt=last?Math.min(2.5,(time-last)/16.667):1;last=time;let error=0;
    for(const p of particles){
      p.vx+=(p.tx-p.x)*.032*dt;p.vy+=(p.ty-p.y)*.032*dt;
      const dx=p.x-pointer.x,dy=p.y-pointer.y,d=Math.hypot(dx,dy);
      if(d>0&&d<44){p.vx+=dx/d*(1-d/44)*.7*dt;p.vy+=dy/d*(1-d/44)*.7*dt}
      p.vx*=Math.pow(.76,dt);p.vy*=Math.pow(.76,dt);p.x+=p.vx*dt;p.y+=p.vy*dt;
      p.x=Math.max(1,Math.min(width-1,p.x));p.y=Math.max(1,Math.min(height-1,p.y));error+=Math.abs(p.tx-p.x)+Math.abs(p.ty-p.y);
    }
    draw();settledFrames=error/Math.max(1,particles.length)<.06?settledFrames+1:0;
    if(settledFrames<3)frame=requestAnimationFrame(animate);
  }
  function wake(){settledFrames=0;if(!frame&&!reduced.matches&&!document.hidden){last=0;frame=requestAnimationFrame(animate)}}
  function retarget(instant=false,burst=false){
    const text=expanded?countdownText():'Neuro Atlas';
    stage.dataset.phase=expanded?'countdown':'atlas';button.setAttribute('aria-pressed',String(expanded));
    fallback.textContent=expanded?text:'Neuro Atlas';
    if(!context||!ink||reduced.matches){stage.dataset.ready='false';lastText=text;return}
    const points=targets(text);if(!points.length){stage.dataset.ready='false';return}
    const count=Math.min(3000,Math.max(points.length,width<600?1100:2100));
    while(particles.length<count)particles.push({x:width/2,y:height/2,tx:width/2,ty:height/2,vx:0,vy:0});particles.length=count;
    // Deterministic permutation spreads long and short wordforms evenly.
    const shuffled=points.map((p,i)=>({p,key:noise(i+37)})).sort((a,b)=>a.key-b.key);
    particles.forEach((p,i)=>{const q=shuffled[i%shuffled.length].p;p.tx=q.x;p.ty=q.y;if(instant){p.x=q.x;p.y=q.y;p.vx=p.vy=0}else if(burst){p.vx+=(noise(i+3)-.5)*11;p.vy+=(noise(i+9)-.5)*11}});
    stage.dataset.ready='true';lastText=text;if(instant)draw();else wake();
  }
  function resize(){if(!context)return;const r=stage.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0);retarget(true)}
  function setExpanded(next){if(expanded===next)return;expanded=next;pointer.x=pointer.y=-9999;retarget(false,true)}
  stage.addEventListener('pointerenter',e=>{if(hover.matches&&e.pointerType!=='touch')setExpanded(true)});
  stage.addEventListener('pointerleave',e=>{if(hover.matches&&e.pointerType!=='touch')setExpanded(false)});
  stage.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||reduced.matches)return;const r=stage.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;wake()});
  button.addEventListener('click',e=>{if(!hover.matches||e.detail===0)setExpanded(!expanded)});
  button.addEventListener('keydown',e=>{if(e.key==='Escape')setExpanded(false)});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else{tick();retarget(true)}});
  reduced.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;retarget(true)});
  new ResizeObserver(resize).observe(stage);
  function tick(){const v=values();document.querySelectorAll('[data-countdown]').forEach((node,i)=>node.textContent=String(v[i]).padStart(2,'0'));if(expanded&&countdownText()!==lastText)retarget(true);if(v.every(n=>n===0)&&!opening){opening=true;location.reload()}}
  resize();tick();setInterval(tick,1000);
  const form=document.getElementById('login');
  const target=form.elements.namedItem('returnTo');if(location.hash&&!target.value.includes('#'))target.value+=location.hash;
  form.addEventListener('submit',()=>{const submit=form.querySelector('[type=submit]');submit.disabled=true;submit.textContent='Opening…'});
})();`;
