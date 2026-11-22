import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Inspect index contents, not ignored working files. Never include secret values in errors. */
export async function checkPublication(directory) {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: directory, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  if (!files.length)
    throw new Error('El índice está vacío. Añade primero los archivos públicos con git add.');
  const secrets = [];
  try {
    const env = await readFile(resolve(directory, '.env'), 'utf8');
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(
        /^\s*(?:export\s+)?([A-Z_]*(?:PASSWORD|SECRET|TOKEN|DATABASE_URL)[A-Z_]*)\s*=\s*(.*?)\s*$/,
      );
      const value = match?.[2]?.replace(/^(['"])(.*)\1$/, '$2');
      if (value && value.length >= 12) secrets.push(value);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const errors = [];
  for (const path of files) {
    const normalized = path.toLowerCase();
    const migration = /^backend\/drizzle\/[^/]+\.sql$/.test(normalized);
    const privatePath =
      path !== '.env.example' &&
      (/(^|\/)(\.env($|\.)|\.envrc$|secrets\/|backups\/|pgdata\/|postgres_data\/|postgres-data\/|node_modules\/|dist\/|\.local\/|\.playwright-cli\/)/.test(
        normalized,
      ) ||
        (/\.(env|dump|backup|db|sqlite3?|pem|key|p12|pfx|csv|xlsx|sql(?:\.(gz|zip))?)$/.test(
          normalized,
        ) &&
          !migration));
    if (privatePath) {
      errors.push(`Archivo privado o generado en el índice: ${path}`);
      continue;
    }
    const text = execFileSync('git', ['show', `:${path}`], {
      cwd: directory,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    if (secrets.some((secret) => text.includes(secret)))
      errors.push(`Credencial local encontrada en: ${path}`);
    if (
      /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-proj-[A-Za-z0-9_-]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(
        text,
      )
    ) {
      errors.push(`Posible token o clave privada en: ${path}`);
    }
  }
  return { count: files.length, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await checkPublication(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
    if (result.errors.length) {
      for (const error of result.errors) console.error(error);
      process.exitCode = 1;
    } else
      console.log(
        `${result.count} archivos del índice revisados: no se detectaron archivos privados ni las credenciales del .env local.`,
      );
  } catch {
    console.error(
      'No se pudo revisar el índice Git. Comprueba que el repositorio existe y tiene archivos preparados.',
    );
    process.exitCode = 1;
  }
}
