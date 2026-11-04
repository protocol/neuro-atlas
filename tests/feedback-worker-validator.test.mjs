import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const hash = s => createHash('sha256').update(s).digest('hex');
const base = 'a'.repeat(40);
const css = 'src/components/landing.css';
const nav = 'src/components/site-nav.tsx';
const patch = (path, before, content) => ({baseSha:base,files:[{path,beforeSha256:hash(before),content}]});

test('deterministic validator allows bounded existing CSS values and literal labels only', async () => {
  const { validatePatch } = await import('../scripts/feedback/validator.ts');
  const before = '.card { gap: 8px; color: #ffffff; }\n';
  const after = '.card { gap: 12px; color: #111111; }\n';
  assert.equal(validatePatch(patch(css,before,after),{[css]:before},base).files[0].content,after);
  const tsx = 'const tabs = [{href: "/funding", label: "Funding"}];\nexport const Nav = () => <nav className="flex gap-2" />;\n';
  const changed = tsx.replace('"Funding"','"Funding index"').replace('gap-2','gap-4');
  assert.equal(validatePatch(patch(nav,tsx,changed),{[nav]:tsx},base).files[0].content,changed);
  for (const content of [before+'.new {gap: 3px}',before.replace('8px','url(https://evil.invalid)'),before.replace('8px','var(--secret)'),before.replace('gap','content'),before.replace('8px','1e9px'),before.replace('8px','\\31 2px'),before.replace('.card','.other'),before.replace('8px','-2px'),before.replace('8px','999px')]) {
    assert.throws(()=>validatePatch(patch(css,before,content),{[css]:before},base),/needs_human_review/);
  }
  for (const content of [tsx.replace('/funding','https://evil.invalid'),tsx.replace('"Funding"','process.env.SECRET'),tsx+'\nfetch("https://evil.invalid");',tsx.replace('gap-2','bg-[url(https://evil.invalid)]'),tsx.replace('"Funding"','"2026 funding doubles"')]) {
    assert.throws(()=>validatePatch(patch(nav,tsx,content),{[nav]:tsx},base),/needs_human_review/);
  }
  assert.throws(()=>validatePatch({...patch(css,before,after),baseSha:'b'.repeat(40)},{[css]:before},base),/needs_human_review/);
  assert.throws(()=>validatePatch(patch('src/proxy.ts',before,after),{},base),/needs_human_review/);
  assert.throws(()=>validatePatch({...patch(css,before,after),command:'npm evil'},{[css]:before},base),/needs_human_review/);
});
