import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('migration installs durable private schema and disables unbudgeted automation', async () => {
  const sql = await readFile(new URL('../db/feedback/001-feedback.sql', import.meta.url), 'utf8');
  const pg = new PGlite();
  try {
    await pg.exec(sql);
    const { rows } = await pg.query('SELECT * FROM atlas_feedback.control');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].enabled, false);
    assert.equal(rows[0].max_job_usd, null);
    const tables = await pg.query("SELECT tablename FROM pg_tables WHERE schemaname='atlas_feedback'");
    for (const name of ['auth_transactions','sessions','feedback','idempotency','jobs','events','control','publications','rate_limits']) assert(tables.rows.some(r => r.tablename === name));
    await assert.rejects(pg.query('UPDATE atlas_feedback.control SET max_job_usd=0'));
    await assert.rejects(pg.query('UPDATE atlas_feedback.control SET max_day_usd=\'NaN\''));
  } finally { await pg.close(); }
});
