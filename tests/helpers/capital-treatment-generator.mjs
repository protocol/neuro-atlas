import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const columns = ['company', 'activity', 'stage', 'amount_usd_m', 'date', 'date_precision', 'date_basis', 'note', 'source_url', 'scope', 'capital_treatment'];
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
export const milestoneFixture = (edit = {}) => ({
  company: 'Fixture Neuro', activity: '$20m preliminary', stage: 'capital', amount_usd_m: '20',
  date: '2026-02-10', date_precision: 'day', date_basis: 'announcement', scope: 'bci',
  note: 'Source says this preliminary disclosure was replaced by the final financing.',
  source_url: 'https://source.example/financing', capital_treatment: 'superseded', ...edit,
});

/** Run the actual generator against isolated canonical fixture inputs. */
export function generatorFixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'capital-treatment-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const put = (relative, content) => {
    const target = path.join(directory, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  for (const relative of ['scripts/generate-derived.mjs', 'scripts/lib', 'src/lib/funding-capital.mjs', 'data/funding-index']) {
    const target = path.join(directory, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(root, relative), target, { recursive: true });
  }
  put('data/logos/manifest.csv', 'slug,file,status\n');
  put('data/glossary/acronyms.csv', 'acronym,expansion,definition\n');
  put('data/market-memo-q1-2026/capital_by_year.csv', 'year,new_capital_usd_m,period_note\n2026,0,Fixture\n');
  for (const file of ['instruments.json', 'neurotech_records.json', 'neurotech_inflection_points.json', 'neurotech_market_signals.json']) put(`data/field-velocity/${file}`, '[]');
  return (rows, fundingRows) => {
    if (fundingRows) {
      const headers = Object.keys(fundingRows[0]);
      put('data/funding-index/rounds.csv', [headers.join(','), ...fundingRows.map(row => headers.map(key => csvCell(row[key])).join(',')), ''].join('\n'));
      put('data/funding-index/investor-evidence.json', '[]');
    }
    put('data/market-memo-q1-2026/milestones.csv', [columns.join(','), ...rows.map(row => columns.map(key => csvCell(row[key])).join(',')), ''].join('\n'));
    const result = spawnSync(process.execPath, ['scripts/generate-derived.mjs'], { cwd: directory, encoding: 'utf8' });
    return { ...result, milestones: result.status === 0 ? JSON.parse(readFileSync(path.join(directory, 'src/data/milestones.json'), 'utf8')) : null };
  };
}
