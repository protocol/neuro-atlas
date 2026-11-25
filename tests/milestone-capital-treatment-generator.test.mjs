import test from 'node:test';
import assert from 'node:assert/strict';
import { generatorFixture, milestoneFixture } from './helpers/capital-treatment-generator.mjs';

const treatments = ['overlap-unresolved', 'superseded', 'scope-unresolved'];

test('the canonical milestone generator preserves explicit exclusions and omits empty treatment fields', t => {
  const run = generatorFixture(t);
  const inputs = [
    ...treatments.map(capital_treatment => milestoneFixture({ capital_treatment })),
    milestoneFixture({ capital_treatment: '' }),
    milestoneFixture({ capital_treatment: undefined }),
  ];
  const { status, stderr, milestones } = run(inputs);
  assert.equal(status, 0, stderr);
  assert.deepEqual(milestones.slice(0, 3).map(row => row.capitalTreatment), treatments);
  milestones.forEach((row, index) => {
    assert.equal(row.amountUsdM, 20);
    assert.equal(row.activity, inputs[index].activity);
    assert.equal(row.note, inputs[index].note);
    assert.equal(row.sourceUrl, inputs[index].source_url);
  });
  for (const row of milestones.slice(3)) assert.equal(Object.hasOwn(row, 'capitalTreatment'), false);
});


test('milestone generation rejects unknown treatments even for below-threshold and unconverted disclosures', t => {
  const run = generatorFixture(t);
  for (const amount_usd_m of ['20', '1', '']) {
    for (const capital_treatment of ['unknown', ' ', 'null', 'false', '42']) {
      const result = run([milestoneFixture({ amount_usd_m, capital_treatment })]);
      assert.notEqual(result.status, 0, `Must reject ${JSON.stringify(capital_treatment)} at amount ${JSON.stringify(amount_usd_m)}`);
      assert.match(result.stderr, /Invalid capital treatment/);
    }
  }
});


test('every milestone hold requires a source explanation even without a converted USD amount', t => {
  const run = generatorFixture(t);
  for (const capital_treatment of treatments) {
    for (const amount_usd_m of ['20', '1', '']) {
      for (const note of ['', '   ']) {
        const result = run([milestoneFixture({ capital_treatment, amount_usd_m, note })]);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Invalid capital treatment/);
      }
    }
  }
});

test('malformed milestone capital never serializes to a plausible null amount', t => {
  const run = generatorFixture(t);
  for (const amount_usd_m of ['unknown', 'Infinity', '-1']) {
    const result = run([milestoneFixture({ amount_usd_m })]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid capital amount/);
  }
  const result = run([milestoneFixture({ amount_usd_m: '' })]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.milestones[0].amountUsdM, null);
  assert.equal(result.milestones[0].capitalTreatment, 'superseded');
});


test('the Funding CSV boundary rejects whitespace-padded treatments before threshold screening', t => {
  const run = generatorFixture(t);
  for (const capital_treatment of [' ', ' superseded', 'superseded ']) {
    for (const amount_usd_m of ['20', '1', '']) {
      const round = {
        company_slug: 'paradromics', announced_on: '2026-01-10', date_precision: 'day', stage: 'Fixture',
        amount_usd_m, investors: '', capital_treatment, note: 'Source-backed hold.', source_url: 'https://source.example/fixture',
      };
      const result = run([], [round]);
      assert.notEqual(result.status, 0, `Must reject ${JSON.stringify(capital_treatment)} at amount ${JSON.stringify(amount_usd_m)}`);
      assert.match(result.stderr, /Invalid capital treatment/);
    }
  }
});
