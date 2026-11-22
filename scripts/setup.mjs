import { randomBytes } from 'node:crypto';
import { writeFile, stat, chown } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Create credentials once. Never read, replace, or print an existing .env. */
export async function createLocalEnv(directory) {
  const password = randomBytes(24).toString('hex');
  const projectName = `moneta-${randomBytes(4).toString('hex')}`;
  const path = resolve(directory, '.env');
  const content = [
    '# Private local configuration. Do not commit or share this file.',
    `COMPOSE_PROJECT_NAME=${projectName}`,
    'POSTGRES_DB=moneta',
    'POSTGRES_USER=moneta',
    `POSTGRES_PASSWORD=${password}`,
    `DATABASE_URL=postgresql://moneta:${password}@127.0.0.1:5432/moneta`,
    'BIND_ADDRESS=127.0.0.1',
    'FRONTEND_PORT=5180',
    'PORT=3080',
    'ALLOWED_ORIGINS=',
    '',
  ].join('\n');
  try {
    await writeFile(path, content, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code === 'EEXIST') return { created: false };
    throw error;
  }
  // A Docker-only setup may run as root. Give the mounted folder's owner its file.
  if (process.platform !== 'win32' && process.getuid?.() === 0) {
    const owner = await stat(directory);
    await chown(path, owner.uid, owner.gid);
  }
  return { created: true, projectName };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const result = await createLocalEnv(root);
    console.log(
      result.created
        ? 'Configuración privada creada. Cada instalación tiene su propia contraseña y volumen. Abre http://localhost:5180 después de iniciar Docker Compose.'
        : '.env ya existe: se conserva sin cambios. No se han regenerado credenciales ni cambiado los volúmenes.',
    );
  } catch {
    console.error(
      'No se pudo crear .env. Comprueba los permisos de la carpeta. No se ha mostrado ninguna credencial.',
    );
    process.exitCode = 1;
  }
}
