import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { EXPORT_BLUE } from '../src/lib/chart-export-brand.ts';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = read('src/app/globals.css');
const block = selector => css.match(new RegExp(`${selector} \\{([^}]+)\\}`))[1];
const token = (body, name) => body.match(new RegExp(`--${name}:\\s*([^;]+);`))[1].trim();
const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb.reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
};
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
};

test('the light accent matches the official PL R&D logo and chart-export signature', () => {
  assert.equal(token(block(':root'), 'accent').toLowerCase(), EXPORT_BLUE.toLowerCase());
});

test('both themes keep readable accent text, filled controls and tinted selections', () => {
  for (const selector of [':root', '\\.dark']) {
    const body = block(selector);
    const accent = token(body, 'accent');
    for (const surface of ['surface', 'accent-soft']) assert.ok(contrast(accent, token(body, surface)) >= 4.5, `${selector} accent on ${surface}`);
    assert.ok(contrast(accent, token(body, 'accent-foreground')) >= 4.5, `${selector} text on filled accent`);
  }
});

test('runtime brand surfaces do not retain the former violet accent palette', () => {
  const oldPalette = /#(?:6d5bff|8b7dff|efedff|1d1a33|b8afff|d0caff|c7bfff|aa9fff|6e678e|4b4df2)\b|rgba?\(\s*(?:109\s*,\s*91\s*,\s*255|139\s*,\s*125\s*,\s*255)/i;
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
  for (const path of walk(new URL('../src', import.meta.url).pathname)) {
    if (/\.(?:css|tsx?|svg)$/.test(path)) assert.doesNotMatch(readFileSync(path, 'utf8'), oldPalette, path);
  }
});

test('publication primary series use PL R&D blue without erasing categorical colors', () => {
  assert.match(read('src/components/publication-charts.tsx'), /const blue = ["']#115ef7["']/i);
  assert.match(read('src/lib/publication-data.ts'), /Academic: ["']#115ef7["']/i);
  assert.match(read('src/lib/publication-data.ts'), /["']Other institutions["']: ["']#7c48d5["']/i);
  assert.match(read('src/data/metric-chart-visibility.ts'), /#9275ca/i);
});
