import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkPublication } from './check-publication.mjs';

async function repository(run) {
  const directory = await mkdtemp(join(tmpdir(), 'moneta-publication-'));
  const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
  try {
    git('init', '-q');
    await run(directory, git);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
test('publication permits templates and schema migrations', () =>
  repository(async (directory, git) => {
    await mkdir(join(directory, 'backend', 'drizzle'), { recursive: true });
    await writeFile(
      join(directory, '.env.example'),
      'POSTGRES_PASSWORD=replace-with-your-own-password\n',
    );
    await writeFile(
      join(directory, 'backend', 'drizzle', '0000_schema.sql'),
      'CREATE TABLE categories (id uuid);\n',
    );
    git('add', '.');
    assert.deepEqual((await checkPublication(directory)).errors, []);
  }));
test('publication blocks accidentally staged database and env files', () =>
  repository(async (directory, git) => {
    await writeFile(join(directory, '.env'), 'POSTGRES_PASSWORD=dummy-private-credential\n');
    await writeFile(join(directory, 'backup.sql'), 'INSERT INTO private_data VALUES (1);\n');
    git('add', '.');
    assert.equal((await checkPublication(directory)).errors.length, 2);
  }));
test('publication finds local credentials copied into source without printing them', () =>
  repository(async (directory, git) => {
    const secret = 'dummy-local-secret-should-not-be-published';
    await writeFile(join(directory, '.env'), `POSTGRES_PASSWORD=${secret}\n`);
    await writeFile(join(directory, 'source.js'), `export const password = '${secret}';\n`);
    git('add', 'source.js');
    const result = await checkPublication(directory);
    assert.equal(result.errors.length, 1);
    assert.ok(!JSON.stringify(result).includes(secret));
  }));
