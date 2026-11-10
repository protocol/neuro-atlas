// SYNTHETIC public logging transport. Exact task-owned loopback fixtures only.
(() => {
  if (!['http://127.0.0.1:35641','http://127.0.0.1:35642'].includes(location.origin)) throw Error('Loopback UI fixture only');
  const originalFetch = window.fetch.bind(window);
  let writeCount = 0;
  window.__feedbackFixture = {calls:[], posts:[]};
  const json = (value, status=200) => Promise.resolve(new Response(JSON.stringify(value), {status, headers:{'Content-Type':'application/json'}}));
  window.fetch = (url, options={}) => {
    if (typeof url !== 'string' || !['/neuro-atlas/api/feedback/public', '/neuro-atlas/api/feedback/public/config'].includes(url)) return originalFetch(url, options);
    window.__feedbackFixture.calls.push({url, method:options.method});
    if (url.endsWith('/config')) return json({enabled:true, connected:true});
    if (options.method !== 'POST') return json({error:'unsupported'}, 405);
    window.__feedbackFixture.posts.push({url, key:options.headers['Idempotency-Key'], body:JSON.parse(options.body)});
    if (writeCount++ === 0) return Promise.reject(Error('Synthetic first-write network failure'));
    return json({saved:true}, 202);
  };
})();
