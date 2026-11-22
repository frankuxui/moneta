# Arrancar Moneta paso por paso

Esta guía sirve para una persona o para un agente de IA con acceso al terminal. Ejecuta los comandos desde la raíz del proyecto. Cada instalación tiene su propio `.env`, contraseña y volumen de PostgreSQL; GitHub contiene únicamente código, contratos y migraciones del esquema.

## 1. Elegir cómo ejecutarla

- **Usar tu propia app:** Docker. No necesitas instalar Node, pnpm ni PostgreSQL en tu ordenador.
- **Desarrollar el código:** Node 24 LTS, pnpm 11.17.0 y PostgreSQL en Docker. Sigue la sección de desarrollo de esta guía.

Windows y macOS: instala Git y Docker Desktop y arranca Docker Desktop. En Windows utiliza contenedores Linux. Ubuntu/Linux: instala Git, Docker Engine y el plugin Docker Compose v2 conforme a la [guía oficial](https://docs.docker.com/engine/install/). No se necesita ninguna cuenta bancaria, API key ni servicio de base de datos externo.

## 2. Descargar el proyecto

En PowerShell, Terminal de macOS o Bash:

```sh
git clone https://github.com/frankuxui/moneta.git
cd moneta
docker version
docker compose version
```

`docker version` debe mostrar cliente y servidor. Si solo aparece el cliente o un error de conexión, arranca Docker antes de continuar. No hace falta crear la base de datos manualmente.

## 3. Crear la configuración privada una sola vez

Con Docker, sin instalar Node en el ordenador, este comando funciona en PowerShell, Bash y zsh desde la carpeta `moneta`:

```sh
docker run --rm -v "${PWD}:/workspace" -w /workspace node:24-alpine node scripts/setup.mjs
```

Si ya tienes Node 24, puedes usar en su lugar:

```sh
node scripts/setup.mjs
```

El asistente crea `.env` con una contraseña aleatoria y un `COMPOSE_PROJECT_NAME` exclusivo. No muestra las credenciales en el terminal. Si `.env` ya existe, lo conserva byte por byte: **no lo borres ni regeneres para intentar solucionar un fallo de conexión**. No copies el `.env` de otra persona ni una configuración de otra instalación que ya tenga datos.

El nombre de proyecto identifica los contenedores y el volumen `<COMPOSE_PROJECT_NAME>_postgres_data`. Mantén ese nombre estable para volver a conectar con tus datos. Si dos copias se ejecutan en el mismo ordenador, deben tener nombres de proyecto diferentes y puertos de frontend diferentes.

`.env.example` es una plantilla pública con marcadores; no contiene una contraseña utilizable. El asistente es la vía recomendada. La tabla de [variables de entorno](environment.md) explica la configuración manual y las instalaciones existentes.

## 4. Arrancar la app y crear su base de datos

```sh
docker compose config --quiet
docker compose up -d --build --wait
docker compose ps -a
```

La primera compilación descarga las imágenes y dependencias; puede tardar varios minutos. `config --quiet` valida sin imprimir secretos. Evita compartir la salida de `docker compose config` sin `--quiet`, `docker inspect` o `docker compose exec … env`, porque pueden mostrar contraseñas.

El arranque ejecuta, en este orden:

1. PostgreSQL crea una base vacía en el volumen privado de esta instalación.
2. `migrate` aplica las migraciones Drizzle y las diez categorías iniciales. No importa datos del autor ni movimientos ficticios.
3. Arranca el backend y comprueba su conexión con PostgreSQL.
4. Nginx sirve el frontend compilado y redirige `/api` al backend.

Resultado esperado: `db`, `backend` y `frontend` en estado **healthy**; `migrate` en **Exited (0)**. No arranques manualmente servicios individuales para saltarte las migraciones.

## 5. Abrir y comprobar

Abre [http://localhost:5180](http://localhost:5180). El resumen debe estar vacío, con las categorías disponibles y sin gastos, ingresos ni suscripciones. Registra tus datos desde la interfaz.

- Salud de la API: [http://localhost:5180/api/v1/health](http://localhost:5180/api/v1/health), respuesta `{"status":"ok"}`.
- Documentación: [http://localhost:5180/api/v1/docs/](http://localhost:5180/api/v1/docs/).
- Contrato: [http://localhost:5180/api/v1/openapi.json](http://localhost:5180/api/v1/openapi.json).

La app no tiene login; por defecto solo acepta conexiones al frontend desde tu propio ordenador. PostgreSQL y backend no tienen puertos publicados. Para compartir la app dentro de tu hogar, utiliza la configuración LAN del README; nunca la expongas directamente a Internet.

## 6. Detener y volver a iniciar

```sh
docker compose stop
docker compose up -d --wait
```

También puedes usar `docker compose down`: elimina contenedores y red, pero mantiene el volumen. **No utilices `docker compose down -v`, `docker volume prune` ni elimines el volumen si contiene datos que quieras conservar.** No son pasos de instalación ni de reparación.

Para actualizar: haz primero un backup según el README, luego `git pull --ff-only` y `docker compose up -d --build --wait`. Conserva tu `.env`, nombre de proyecto y volumen. Una migración no debe sustituirse por borrar la base.

## Desarrollo con Node

1. Instala Node **24 LTS** y pnpm **11.17.0** (`npm install -g pnpm@11.17.0`).
2. Clona el proyecto, ejecuta `node scripts/setup.mjs` y conserva `.env` en la raíz.
3. Si estás ejecutando la app Docker de esta misma instalación, detén frontend y backend para liberar sus puertos: `docker compose stop frontend backend`.
4. Instala dependencias y arranca solo PostgreSQL con un puerto accesible exclusivamente por loopback:

   ```sh
   pnpm install --frozen-lockfile
   docker compose -f compose.yaml -f compose.dev.yaml up -d --wait db
   pnpm --filter @moneta/shared build
   pnpm db:migrate
   pnpm dev
   ```

5. Mantén `pnpm dev` abierto. Frontend en 5180 y backend en 3080. El frontend hace proxy a `/api`; no necesitas configurar una URL remota en Vite. Ctrl+C detiene los procesos de desarrollo.

`DATABASE_URL` del `.env` se usa en desarrollo; Compose construye su propia URL interna hacia el servicio `db`. No pongas `db` como host de la URL que utiliza Node fuera de Docker. Si otro PostgreSQL ocupa 5432, cambia el mapeo del override de desarrollo y el puerto de `DATABASE_URL` de forma consistente. No cambies los puertos de los otros proyectos.

## Guion para que una IA arranque el proyecto

Pega esta instrucción al asistente que tenga acceso a tu copia:

> Lee AGENTS.md, docs/startup.md y docs/environment.md. Inspecciona el estado actual y comprueba Docker. Si ya existe .env, no muestres sus valores ni lo sobrescribas; conserva la identidad Compose y el volumen. Si falta, ejecuta scripts/setup.mjs con Node 24 o con el comando Docker documentado. Arranca la app con docker compose up -d --build --wait. Verifica los health checks, /api/v1/health y la interfaz. No expongas la base de datos, no generes fixtures permanentes, no uses down -v ni cambies credenciales para reparar una instalación existente. Informa de la URL y de las comprobaciones realmente ejecutadas. No solicites que te envíe contraseñas al chat.

## Resolver problemas sin perder datos

| Problema                                   | Acción                                                                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker no responde                         | Arranca Docker Desktop o el servicio del motor; vuelve a comprobar `docker version`.                                                                                               |
| 5180 está ocupado                          | Edita solo `FRONTEND_PORT` en tu `.env`, por ejemplo 5181. Recrea con `docker compose up -d --wait`; abre ese puerto. Si fijaste ALLOWED_ORIGINS manualmente, actualízalo también. |
| `migrate` falla                            | Revisa `docker compose logs --tail=100 migrate`. No inicies backend saltándote ese servicio ni borres el volumen.                                                                  |
| Error de contraseña con datos existentes   | Recupera la configuración original de esta instalación. Cambiar `.env` no cambia la contraseña del rol PostgreSQL de un volumen ya inicializado. Sigue la guía de variables.       |
| La app parece recién instalada             | Comprueba el nombre de proyecto y volumen. No registres datos ni elimines volúmenes hasta localizar los anteriores.                                                                |
| 502 durante reinicio                       | Espera a que backend esté healthy y vuelve a intentar; Nginx actualiza la resolución interna.                                                                                      |
| No se guardan cambios desde otro nombre/IP | Revisa ALLOWED_ORIGINS y el puerto local. Añade únicamente el origen de confianza; no uses `*`.                                                                                    |

Los logs pueden contener información operativa. Revisa y oculta cualquier dato privado antes de compartirlos. No envíes `.env`, backups ni volcados de PostgreSQL a una incidencia pública.
