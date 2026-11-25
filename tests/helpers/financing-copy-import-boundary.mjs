import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';

// Parse syntax, not comments/string contents. This also catches re-exports,
// dynamic literal imports and CommonJS; resolve aliases before traversing.
function imports(text, file) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true,
    /\.[jt]sx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  const result = new Set();
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) result.add(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) result.add(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...result];
}

export function assertHistoricalImportBoundaries(files, historicalPaths, allowlist, nativeEntrypoints) {
  const historical = new Set(historicalPaths), graph = new Map();
  const resolve = (specifier, file) => {
    const local = specifier.startsWith('@/') ? 'src/' + specifier.slice(2)
      : specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)) : null;
    if (local === null) return null;
    return [local, ...['.mjs', '.js', '.jsx', '.ts', '.tsx', '/index.mjs', '/index.ts', '/index.tsx'].map(ext => local + ext)].find(candidate => files.has(candidate)) ?? null;
  };
  for (const [file, text] of files) {
    const deps = imports(text, file).map(specifier => resolve(specifier, file)).filter(Boolean);
    graph.set(file, [...new Set(deps)]);
    for (const dep of deps) if (historical.has(dep)) assert.ok(allowlist[file]?.includes(dep), file + ': unapproved historical import ' + dep);
  }
  // An allowlist is permission for archived entrypoints, never permission for
  // native callers to smuggle an archived reader through an intermediate file.
  for (const entry of nativeEntrypoints) {
    assert.ok(files.has(entry), 'Missing native entrypoint: ' + entry);
    const seen = new Set();
    const walk = file => {
      assert.ok(!historical.has(file), entry + ': native graph reaches historical reader ' + file);
      if (seen.has(file)) return;
      seen.add(file);
      for (const dep of graph.get(file) ?? []) walk(dep);
    };
    walk(entry);
  }
  for (const entry of historical) {
    const active = new Set(), complete = new Set();
    const walk = file => {
      assert.ok(!active.has(file), 'Historical compatibility import cycle: ' + file);
      if (complete.has(file)) return;
      active.add(file);
      for (const dep of graph.get(file) ?? []) walk(dep);
      active.delete(file); complete.add(file);
    };
    walk(entry);
  }
}
