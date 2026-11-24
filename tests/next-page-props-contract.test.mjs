import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

for (const route of ['funding', 'milestones']) test(`${route}: Next page's first argument satisfies generated required PageProps`, () => {
  const path = new URL(`../src/app/${route}/page.tsx`, import.meta.url);
  const source = ts.createSourceFile(path.pathname, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword));
  assert.ok(page);
  assert.equal(page.parameters[0].initializer, undefined, 'defaulting the entire props argument makes FirstArg include undefined under Next16');
  assert.equal(page.parameters[0].questionToken, undefined);
  const search = page.parameters[0].type.members.find(member => member.name.getText(source) === 'searchParams');
  assert.ok(search.questionToken, 'searchParams itself remains optional');
});
