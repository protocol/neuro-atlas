import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

// Separate processes mirror Next's build-time environment (no module-cache leakage).
function run(source, basePath = "", extraEnv = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", source], {
    cwd: new URL("..", import.meta.url), encoding: "utf8",
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath, ATLAS_SITE_URL: "", ATLAS_INDEXABLE: "", ...extraEnv },
  });
}
function passes(source, basePath = "", extraEnv = {}) {
  const result = run(`import assert from 'node:assert/strict';\n${source}`, basePath, extraEnv);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

for (const prefix of ["", "/neuro-atlas"]) {
  test(`Next config keeps framework links and redirects app-relative (${prefix || "root"})`, () => {
    passes(`
      const imported = (await import('./next.config.ts')).default;
      const config = imported.default ?? imported;
      assert.equal(config.basePath, ${JSON.stringify(prefix)});
      assert.equal(config.assetPrefix, undefined);
      assert.deepEqual(await config.redirects(), [
        { source: '/regulatory-landscape', destination: '/milestones', permanent: false }
      ]);
    `, prefix);
  });
}

for (const prefix of ["", "/neuro-atlas"]) {
  test(`rendered logos and navigation stay inside Atlas, external links stay outside (${prefix || "root"})`, () => {
    passes(`
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { JSDOM } from 'jsdom';
      import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';
      import { SideNav, MobileBar } from './src/components/site-nav.tsx';
      import { FirmLogo } from './src/components/firm-logo.tsx';
      import { SiteFooter } from './src/components/site-footer.tsx';
      import HomeImport from './src/app/page.tsx';
      import MethodologyImport from './src/app/methodology/page.tsx';
      globalThis.React = React;
      const Home = HomeImport.default ?? HomeImport;
      const prefix = process.env.NEXT_PUBLIC_BASE_PATH;
      const render = element => new JSDOM(renderToStaticMarkup(element)).window.document;
      const logo = render(React.createElement(FirmLogo, { src: '/logos/neuralink.png', name: 'Neuralink' }));
      assert.equal(logo.querySelector('img').getAttribute('src'), prefix + '/logos/neuralink.png');
      for (const pathname of ['/funding', prefix + '/funding/']) {
        const nav = render(React.createElement(PathnameContext.Provider, {value: pathname}, React.createElement(React.Fragment, null, React.createElement(SideNav), React.createElement(MobileBar))));
        assert.deepEqual([...nav.querySelectorAll('a')].filter(a => a.textContent.trim() === 'by PL R&D').map(a => a.getAttribute('href')), ['https://www.plrd.org/', 'https://www.plrd.org/']);
        assert.equal(nav.querySelector('a a'), null, 'Return link must not be nested in the Atlas home link');
        assert.deepEqual([...nav.querySelectorAll('[aria-current="page"]')].map(a => a.getAttribute('href')), [prefix + '/funding', prefix + '/funding']);
        assert.deepEqual([...nav.querySelectorAll('img')].map(i => i.getAttribute('src')), [prefix + '/powered-plneuro.svg', prefix + '/powered-neurotechfutures.png']);
        for (const a of nav.querySelectorAll('a[href^="/"]')) assert.ok(!a.getAttribute('href').includes('/neuro-atlas/neuro-atlas'));
      }
      const home = render(React.createElement(Home));
      assert.deepEqual([...home.querySelectorAll('.landing-tile')].map(a => a.getAttribute('href')), [prefix + '/milestones', 'https://www.neurofounders.co/resources/start-up-map', prefix + '/funding', prefix + '/field-velocity']);
      assert.ok(home.querySelector('a[href="#explore"]'));
      const methodology = render(React.createElement(MethodologyImport.default ?? MethodologyImport));
      const fundingSource = [...methodology.querySelectorAll('a')].find(a => a.textContent.trim() === 'BCI Funding Index ↗');
      assert.equal(fundingSource.getAttribute('href'), prefix + '/funding');
      const footer = render(React.createElement(SiteFooter));
      assert.ok(footer.querySelector('a[href="https://www.plrd.org/"]'));
    `, prefix, { __NEXT_ROUTER_BASEPATH: prefix });
  });
}

for (const prefix of ["", "/neuro-atlas"]) {
  test(`per-route canonical and social URLs require explicit site configuration (${prefix || "root"})`, () => {
    passes(`
      const routes = ['/', '/milestones', '/funding', '/field-velocity', '/methodology'];
      for (const route of routes) {
        const imported = await import('./src/app' + (route === '/' ? '' : route) + '/page.tsx');
        const metadata = imported.metadata ?? imported.default?.metadata;
        assert.ok(metadata?.alternates?.canonical, 'Missing canonical for ' + route);
        const expected = 'https://www.plrd.org' + process.env.NEXT_PUBLIC_BASE_PATH + route;
        assert.equal(metadata.alternates.canonical, expected);
        assert.equal(metadata.openGraph.url, expected);
        assert.equal(metadata.openGraph.title, metadata.title);
        assert.deepEqual(metadata.robots, { index: false, follow: false });
      }
    `, prefix, { ATLAS_SITE_URL: "https://www.plrd.org" });
  });
}

test("shared metadata describes neurotechnology broadly and qualifies BCI funding", () => {
  passes(`
    import { atlasMetadata } from './src/lib/atlas-metadata.ts';
    assert.equal(atlasMetadata('/', 'Neuro Atlas').description, 'An interactive atlas of neurotechnology — milestones, BCI funding, and field velocity.');
  `);
});

test("canonical configuration rejects malformed or non-origin URLs and invalid launch flags", () => {
  for (const ATLAS_SITE_URL of ["https:/www.plrd.org", "https:////www.plrd.org", " https://www.plrd.org", "http://www.plrd.org", "https://www.plrd.org/neuro-atlas", "https://www.plrd.org?preview=1", "https://www.plrd.org#", "https://user:pass@www.plrd.org", "https://www.plrd.org/../", "https://www.plrd.org\\\\oops"]) {
    const result = run(`await import('./next.config.ts')`, "/neuro-atlas", { ATLAS_SITE_URL });
    assert.notEqual(result.status, 0, ATLAS_SITE_URL);
    assert.match(result.stderr, /ATLAS_SITE_URL/);
  }
  for (const ATLAS_INDEXABLE of ["true", "yes", "1", "TRUE"]) {
    const result = run(`await import('./next.config.ts')`, "", { ATLAS_INDEXABLE });
    assert.notEqual(result.status, 0, ATLAS_INDEXABLE);
    assert.match(result.stderr, /ATLAS_INDEXABLE/);
  }
});

for (const prefix of ["", "/neuro-atlas"]) {
  test(`sitemap is empty until explicit indexability; launch includes only canonical content routes (${prefix || "root"})`, () => {
    const source = `
      import fs from 'node:fs';
      assert.ok(fs.existsSync('./src/app/sitemap.ts'), 'Atlas sitemap is missing');
      const imported = (await import('./src/app/sitemap.ts')).default;
      const sitemap = imported.default ?? imported;
      const rows = sitemap();
      const { atlasMetadata } = await import('./src/lib/atlas-metadata.ts');
      const metadata = atlasMetadata('/funding', 'Funding');
      if (process.env.ATLAS_INDEXABLE === 'true') {
        assert.deepEqual(rows.map(row => row.url), ['/', '/milestones', '/funding', '/field-velocity', '/methodology'].map(route => 'https://www.plrd.org' + process.env.NEXT_PUBLIC_BASE_PATH + route));
        assert.deepEqual(metadata.robots, { index: true, follow: true });
      } else {
        assert.deepEqual(rows, []);
        if (!process.env.ATLAS_SITE_URL) {
          assert.equal(metadata.alternates, undefined);
          assert.equal(metadata.openGraph, undefined);
          assert.equal(metadata.robots, undefined);
        } else assert.deepEqual(metadata.robots, { index: false, follow: false });
      }
    `;
    passes(source, prefix);
    passes(source, prefix, { ATLAS_SITE_URL: 'https://www.plrd.org' });
    passes(source, prefix, { ATLAS_SITE_URL: 'https://www.plrd.org/', ATLAS_INDEXABLE: 'true' });
  });
}

test("raw URL helper preserves query/hash, existing prefixes and external/blob downloads", () => {
  passes(`
    import { atlasPath, atlasPathname } from './src/lib/atlas-path.ts';
    for (const url of ['https://www.plrd.org/', '//cdn.example/logo.png', 'mailto:a@example.org', 'blob:https://example.org/a', 'data:image/png;base64,a', '#explore', '?view=table']) assert.equal(atlasPath(url), url);
    for (const url of ['/neuro-atlas', '/neuro-atlas/', '/neuro-atlas?view=table', '/neuro-atlas#explore', '/neuro-atlas/logos/a.png']) assert.equal(atlasPath(url), url);
    assert.equal(atlasPath('/field-velocity?view=table#tissue-mapped'), '/neuro-atlas/field-velocity?view=table#tissue-mapped');
    assert.equal(atlasPath('/neuro-atlas-other/a'), '/neuro-atlas/neuro-atlas-other/a');
    assert.equal(atlasPathname('/neuro-atlas-other/funding'), '/neuro-atlas-other/funding');
    assert.equal(atlasPathname('/neuro-atlas'), '/');
  `, '/neuro-atlas');
});

test("invalid base paths fail closed rather than being silently repaired", () => {
  for (const value of ["/", "neuro-atlas", "/neuro-atlas/", "//neuro-atlas", "/a//b", "/a/../b", "/a?b", "/a#b", "/a%2fb", "/a\\b", " /neuro-atlas"]) {
    const result = run(`await import('./next.config.ts')`, value);
    assert.notEqual(result.status, 0, value);
    assert.match(result.stderr, /NEXT_PUBLIC_BASE_PATH/, value);
  }
});
