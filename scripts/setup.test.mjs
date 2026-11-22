import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, stat, mkdir, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createLocalEnv } from './setup.mjs';

test('new installations have distinct private credentials and volume namespaces', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moneta-setup-'));
  try {
    for (const folder of ['first', 'second']) await mkdir(join(directory, folder));
    const first = await createLocalEnv(join(directory, 'first'));
    const second = await createLocalEnv(join(directory, 'second'));
    assert.equal(first.created, true);
    assert.notEqual(first.projectName, second.projectName);
    const content = await readFile(join(directory, 'first', '.env'), 'utf8');
    const password = content.match(/^POSTGRES_PASSWORD=([a-f0-9]{48})$/m)?.[1];
    assert.ok(password);
    assert.ok(
      content.includes(`DATABASE_URL=postgresql://moneta:${password}@127.0.0.1:5432/moneta`),
    );
    assert.ok(content.includes('BIND_ADDRESS=127.0.0.1'));
    assert.ok(!JSON.stringify(first).includes(password));
    if (process.platform !== 'win32')
      assert.equal((await stat(join(directory, 'first', '.env'))).mode & 0o777, 0o600);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('setup preserves an existing installation byte for byte', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moneta-existing-'));
  try {
    const existing =
      'POSTGRES_PASSWORD=existing-private-value\nCOMPOSE_PROJECT_NAME=existing-volume\n';
    await writeFile(join(directory, '.env'), existing);
    assert.deepEqual(await createLocalEnv(directory), { created: false });
    assert.equal(await readFile(join(directory, '.env'), 'utf8'), existing);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('CLI output does not contain generated credentials', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moneta-cli-'));
  try {
    await mkdir(join(directory, 'scripts'));
    await copyFile(
      new URL('./setup.mjs', import.meta.url),
      join(directory, 'scripts', 'setup.mjs'),
    );
    const output = execFileSync(process.execPath, [join(directory, 'scripts', 'setup.mjs')], {
      encoding: 'utf8',
    });
    const secret = (await readFile(join(directory, '.env'), 'utf8')).match(
      /^POSTGRES_PASSWORD=(.+)$/m,
    )?.[1];
    assert.ok(secret);
    assert.ok(!output.includes(secret));
    assert.ok(!output.includes('DATABASE_URL='));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
