import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { validateTrendsBundle } from '../src/lib/field-velocity/google-trends-feed';

const { values } = parseArgs({ options: { source: { type: 'string', default: 'docs/google-trends/bundled-20261106/source' }, out: { type: 'string', default: 'public/data/google-trends/bundled-20261106' }, check: { type: 'boolean', default: false } } });
const sources = Object.fromEntries(['neurotech', 'neuralink'].map(id => [id, {
  raw: readFileSync(`${values.source}/${id}.raw.json`, 'utf8'),
  request: readFileSync(`${values.source}/${id}.request.json`, 'utf8'),
}]));
const { snapshot, files } = validateTrendsBundle({ version: 1, sources });
const data = snapshot.groups;
const outputs = new Map(Object.entries(files));
if (values.check) {
  for (const [name, content] of outputs) if (readFileSync(`${values.out}/${name}`, 'utf8') !== content) throw new Error(`Stale Google Trends output: ${name}`);
} else {
  mkdirSync(values.out!, { recursive: true });
  for (const [name, content] of outputs) {
    const path = `${values.out}/${name}`;
    writeFileSync(path + '.tmp', content); renameSync(path + '.tmp', path);
  }
}
console.log(`${values.check ? 'Verified' : 'Generated'} Google Trends: ${snapshot.start}–${snapshot.end}; ${data.map(g => `${g.id}: ${g.rows.filter(r => !r.partial).length} complete / ${g.rows.filter(r => r.partial).length} partial weeks`).join('; ')}`);
