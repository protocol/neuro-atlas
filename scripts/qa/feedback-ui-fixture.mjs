// Disposable native-component fixture. No real identity, database, OAuth or external writes.
// node scripts/qa/feedback-ui-fixture.mjs (127.0.0.1:35642 only; Ctrl+C to stop).
import http from 'node:http';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
const result = await build({
  stdin: { contents: `
import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Feedback} from './src/components/feedback/feedback';
import {FeedbackTrigger} from './src/components/feedback/feedback-trigger';
import {ChartModal} from './src/components/chart-modal';
function Fixture(){
 const [hash,setHash]=useState(location.hash), origin=useRef(null);
 useEffect(()=>{const changed=()=>setHash(location.hash);addEventListener('hashchange',changed);addEventListener('atlas-performance-location',changed);return()=>{removeEventListener('hashchange',changed);removeEventListener('atlas-performance-location',changed)}},[]);
 const probe=event=>{window.__nativeEvents.push(event.type)};
 const chart=<><h2 className="fixture-chart-title">Synthetic chart heading</h2><button className="fixture-action" onPointerDown={probe} onPointerUp={probe} onClick={probe}><span><svg width="20" height="20" aria-hidden="true"><path d="M2 2h16v16H2z" fill="currentColor"/></svg>Copy chart</span></button><label>Range <input type="range" onPointerDown={probe} onInput={probe}/></label><label>Checkbox <input type="checkbox" onChange={probe}/></label><svg className="fixture-chart" width="400" height="180" viewBox="0 0 400 180"><g><path d="M20 150L120 90L220 110L360 25" stroke="#587def" strokeWidth="12" fill="none"/></g></svg></>;
 return <><main><div style={{display:"flex",gap:12}}><a href="https://github.com/protocol/neuro-atlas/pulls">Contribute via PR</a><FeedbackTrigger/></div><p>Native component QA · synthetic page content</p><h1 className="fixture-heading">A useful heading to select</h1><button ref={origin} onClick={()=>location.hash='tissue-mapped'}>Open chart</button><article data-performance-card="tissue-mapped">{hash==='#tissue-mapped'?<ChartModal id="tissue-mapped" title="Fixture chart" returnFocus={origin}>{chart}</ChartModal>:chart}</article></main><Feedback/></>;
}
window.__nativeEvents=[];createRoot(document.getElementById('root')).render(<Fixture/>);
`, resolveDir: process.cwd(), sourcefile: 'feedback-native-fixture.tsx', loader: 'tsx' },
  bundle: true, write: false, format: 'iife', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_BASE_PATH': '"/neuro-atlas"' },
});
const css = await readFile('src/components/feedback/feedback.css', 'utf8');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlas native component fixture</title><style>
:root{--surface:#fff;--foreground:#202228;--border:#d4d7de;--muted:#626975}*{box-sizing:border-box}body{margin:0;font-family:system-ui;background:#f5f6fa;color:#202228}main{max-width:900px;margin:100px auto;padding:20px}h1{font-size:32px}article{margin-top:40px;padding:24px;border:1px solid #ddd;background:#fff}.fixture-action{padding:8px}.fixture-action span{display:flex;align-items:center;gap:8px}.fixture-chart{max-width:100%;display:block;margin-top:30px}label{display:block;padding:12px}.pc-modal{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;background:#0005;padding:40px 12px;border:0}.pc-modal-panel{width:min(900px,100%);margin:auto;padding:24px;background:white;border-radius:12px}.pc-modal-header{display:flex;justify-content:space-between;gap:12px}.pc-modal::backdrop{background:transparent}
${css}</style><body><div id="root"></div><script src="/fixture.js"></script></body></html>`;
const server = http.createServer((req,res) => {
  if (req.headers.host !== '127.0.0.1:35642') {res.writeHead(403).end();return;}
  res.setHeader('Cache-Control','no-store');
  if (req.url === '/fixture.js') {res.setHeader('Content-Type','text/javascript');res.end(result.outputFiles[0].text);return;}
  if (req.url?.endsWith('/api/feedback/public/config')) {res.setHeader('Content-Type','application/json');res.end(JSON.stringify({enabled:false,connected:false}));return;}
  res.setHeader('Content-Type','text/html');res.end(html);
});
server.listen(35642,'127.0.0.1',()=>console.log('Native component fixture ready: http://127.0.0.1:35642/neuro-atlas/field-velocity'));
