import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {restoreMerged151Copy} from './sitewide-copy-baseline.mjs';
const require=createRequire(import.meta.url);
const root=new URL('../../',import.meta.url);
function evaluate(source,path,resolve=require) {
 const compiled=ts.transpileModule(source,{fileName:path,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const compiledModule={exports:{}};
 new Function('require','module','exports',compiled)(resolve,compiledModule,compiledModule.exports);
 return compiledModule.exports;
}
const axisPath='src/lib/neuroai-energy-axis.ts';
const axisSource=readFileSync(new URL(axisPath,root),'utf8');
const historicalAxis=evaluate(restoreMerged151Copy(axisSource,axisPath),axisPath);
const rendererPath='src/components/draft-chart-plot.tsx';
const rendererSource=readFileSync(new URL(rendererPath,root),'utf8');
const rendererRequire=createRequire(new URL(rendererPath,root));
const historical=evaluate(rendererSource,rendererPath,id=>id==='@/lib/neuroai-energy-axis'?historicalAxis:rendererRequire(id));
// This dependency-only historical-copy projection cannot change any observation,
// coordinate, formatter, source, qualifier, or other renderer implementation.
assert.equal(typeof historical.DraftChartPlot,'function');
export const DraftChartPlotBeforeAxisCopy=historical.DraftChartPlot;
