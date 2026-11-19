import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function run(source, basePath = "/neuro-atlas", extraEnv = {}) {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", source], {
    cwd: new URL("..", import.meta.url), encoding: "utf8", timeout: 30_000,
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath, ATLAS_SITE_URL: "https://www.plneuro.xyz", ATLAS_INDEXABLE: "true", ...extraEnv },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error));
}

test("Neuro Atlas home advertises the supplied launch graphic as a large social card", () => {
  run(`
    import assert from 'node:assert/strict';
    import { atlasMetadata } from './src/lib/atlas-metadata.ts';
    const metadata = atlasMetadata('/', 'Neuro Atlas');
    const image = 'https://www.plneuro.xyz/neuro-atlas/social/neuro-atlas-launch.png';
    assert.equal(metadata.twitter?.card, 'summary_large_image');
    assert.equal(metadata.openGraph?.images?.[0]?.url, image);
    assert.equal(metadata.twitter?.images?.[0]?.url, image);
    assert.equal(metadata.openGraph.images[0].width, 2400);
    assert.equal(metadata.openGraph.images[0].height, 1350);
    assert.equal(metadata.openGraph.images[0].type, 'image/png');
    assert.equal(metadata.openGraph.images[0].alt, 'Neuro Atlas — Neurotechnology, mapped. PL Neuro. plneuro.xyz/neuro-atlas');
    assert.equal(metadata.twitter.images[0].alt, metadata.openGraph.images[0].alt);
  `);
});

for (const basePath of ["", "/neuro-atlas"]) {
  test(`every page keeps its own copy/canonical and uses the launch card (${basePath || "root"})`, () => {
    run(`
      import assert from 'node:assert/strict';
      for (const route of ['/', '/milestones', '/funding', '/field-velocity', '/methodology']) {
        const imported = await import('./src/app' + (route === '/' ? '' : route) + '/page.tsx');
        const metadata = imported.metadata ?? imported.default?.metadata;
        const expectedImage = 'https://www.plneuro.xyz' + process.env.NEXT_PUBLIC_BASE_PATH + '/social/neuro-atlas-launch.png';
        assert.equal(metadata.twitter.card, 'summary_large_image', route);
        assert.equal(metadata.openGraph.images[0].url, expectedImage, route);
        assert.equal(metadata.twitter.images[0].url, expectedImage, route);
        assert.equal(metadata.twitter.title, metadata.title, route);
        assert.equal(metadata.twitter.description, metadata.description, route);
        assert.equal(metadata.openGraph.title, metadata.title, route);
        assert.equal(metadata.openGraph.description, metadata.description, route);
        assert.equal(metadata.alternates.canonical, 'https://www.plneuro.xyz' + process.env.NEXT_PUBLIC_BASE_PATH + route, route);
        assert.deepEqual(metadata.robots, {index: true, follow: true}, route);
      }
    `, basePath, { ATLAS_SITE_URL: 'https://www.plneuro.xyz/' });
  });
}

test("preview indexing and unconfigured standalone metadata remain unchanged", () => {
  run(`
    import assert from 'node:assert/strict';
    import { atlasMetadata } from './src/lib/atlas-metadata.ts';
    const metadata = atlasMetadata('/funding', 'Funding', 'Page-specific description');
    assert.deepEqual(metadata.robots, {index: false, follow: false});
    assert.equal(metadata.twitter.card, 'summary_large_image');
    assert.equal(metadata.twitter.description, 'Page-specific description');
  `, '/neuro-atlas', { ATLAS_INDEXABLE: 'false' });
  run(`
    import assert from 'node:assert/strict';
    import { atlasMetadata } from './src/lib/atlas-metadata.ts';
    assert.deepEqual(atlasMetadata('/', 'Neuro Atlas', 'Standalone'), {title: 'Neuro Atlas', description: 'Standalone'});
  `, '', { ATLAS_SITE_URL: '', ATLAS_INDEXABLE: '' });
});

test("the social asset is the original 2400 × 1350 PNG, not a placeholder", async () => {
  const { readFile } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const bytes = await readFile(new URL('../public/social/neuro-atlas-launch.png', import.meta.url));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  assert.equal(bytes.readUInt32BE(16), 2400);
  assert.equal(bytes.readUInt32BE(20), 1350);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '628f0ecd450acd8deb7600d710709c6d1b3dfe06d289362383352b93b08fac84');
});
