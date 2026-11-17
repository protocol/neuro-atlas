import test from 'node:test';
import assert from 'node:assert/strict';
import {HISTORICAL_RECORDING,HISTORICAL_RECORDING_FIT} from '../src/data/historical-recording.ts';
test('selected recording CSV exports historical rows and fit diagnostics rather than the former recent default',async()=>{
 const mod=await import('../src/lib/recording-source-export.ts').catch(()=>({}));
 assert.equal(typeof mod.recordingViewCsv,'function');
 const csv=mod.recordingViewCsv(HISTORICAL_RECORDING,HISTORICAL_RECORDING_FIT);
 const lines=csv.trim().split('\r\n');assert.equal(lines.length,95);
 assert.match(lines[0],/plot_decimal_year.*reported_value.*fit_n.*fit_r_squared_log10/);
 assert.match(lines[1],/1957-07-01.*1957.541666/);
 assert.match(csv,/Maccione/);assert.match(csv,/approximate/);
 assert.doesNotMatch(csv,/Trautmann|Manley|human-channels/);
});
