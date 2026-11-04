// SYNTHETIC UI transport boundary. Inject only on this task's isolated loopback fixture.
(() => {
  if (!['http://127.0.0.1:35641','http://127.0.0.1:35642'].includes(location.origin)) throw Error('Loopback UI fixture only');
  const originalFetch=window.fetch.bind(window),originalOpen=window.open.bind(window);
  const id='11111111-1111-4111-8111-111111111111';
  let popup,version=1,writeCount=0,saved=false;
  window.__feedbackFixture={calls:[],posts:[]};
  const json=(value,status=200)=>Promise.resolve(new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}}));
  const status=()=>({id,version,state:version===1?'received':'needs_human_review',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',reasonCode:version===1?'automation_disabled':'fixture_human_review'});
  window.open=(...args)=>{popup=originalOpen(...args);return popup;};
  window.fetch=(url,options={})=>{
    if (typeof url!=='string'||!url.startsWith('/neuro-atlas/api/feedback')) return originalFetch(url,options);
    window.__feedbackFixture.calls.push({url,method:options.method});
    if(url.endsWith('/config')) return json({enabled:true,connected:true});
    if(url.endsWith('/auth/start')){
      const body=JSON.parse(options.body);
      return new Promise(resolve=>setTimeout(()=>{
        window.dispatchEvent(new MessageEvent('message',{origin:location.origin,source:popup,data:{type:'atlas-feedback-oauth',code:'synthetic-code',state:body.state}}));
        // Finish settles before start resumes: the native popup never navigates to an external provider.
        setTimeout(()=>resolve(new Response(JSON.stringify({authorizeUrl:'https://github.com/login/oauth/authorize?'+new URLSearchParams({state:body.state,code_challenge:body.codeChallenge,code_challenge_method:'S256'})}),{headers:{'Content-Type':'application/json'}})),500);
      },150));
    }
    if(url.endsWith('/auth/finish'))return json({session:'SYNTHETIC_UI_SESSION_ONLY',expiresAt:new Date(Date.now()+600000).toISOString(),actor:{githubId:82394590,login:'synthetic-owner'}});
    if(options.method==='POST'){
      window.__feedbackFixture.posts.push({url,key:options.headers['Idempotency-Key'],body:JSON.parse(options.body)});
      if(writeCount++===0)return Promise.reject(Error('Synthetic first-write network failure'));
      if(url.endsWith('/followups'))version++;
      saved=true;return json({id,version,state:status().state},202);
    }
    if(url.includes('?limit='))return json({items:saved?[status()]:[]});
    return json(status());
  };
})();
