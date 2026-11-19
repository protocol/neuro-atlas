import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import * as Source from '../src/components/publication-source-provider.tsx';
import {PublicationCharts} from '../src/components/publication-charts.tsx';
import PageModule from '../src/app/field-velocity/page.tsx';
import LayoutModule from '../src/app/field-velocity/layout.tsx';
import {syntheticPublicationSnapshot} from './fixtures/publication-synthetic.mjs';
const Page=PageModule.default??PageModule;

test('actual route layout wraps the overview chart tree in its live publication provider',()=>{
 const Layout=LayoutModule.default??LayoutModule;
 const Marker=({children})=>children;
 const tree=Layout({children:React.createElement(Marker,null,Page())});
 const contains=(node,inside=false)=>React.isValidElement(node)&&(node.type===Marker
   ? inside
   : React.Children.toArray(node.props.children).some(child=>contains(child,inside||node.type===Source.PublicationSourceProvider)));
 assert.ok(contains(tree),'PublicationSourceProvider must wrap the actual page inside the shared route layout');
});

test('native publication marks use the provider snapshot instead of a superseded bundle',()=>{
 assert.ok(Source.PublicationSourceContext,'the shared source context is the actual UI inlet');
 // Explicitly synthetic component-boundary simulation; never written as production data.
 const bundled=syntheticPublicationSnapshot();bundled.source.testOnly=false;
 const accepted=structuredClone(bundled);const row=accepted.tables.nt_yearly.rows.find(r=>r[0]==='2025'&&r[1]==='Neurotech papers');row[2]+=10;
 const html=renderToStaticMarkup(React.createElement(Source.PublicationSourceContext.Provider,{value:accepted},React.createElement(PublicationCharts,{snapshot:bundled})));
 const doc=new JSDOM(html).window.document;
 const marker=doc.querySelector('[data-publication-card="publication-output"] circle[data-year="2025"]');
 assert.equal(Number(marker.dataset.value),row[2]);
});
