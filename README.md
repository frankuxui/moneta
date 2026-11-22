# Moneta

Finanzas personales en tu red local: gastos, ingresos opcionales, suscripciones y analíticas. Datos reales en PostgreSQL; sin datos de demostración ni acceso de usuarios. EUR, interfaz española, fechas Europe/Madrid.

## Instalar tu propia app

Cada persona puede clonar el proyecto y crear una instalaci�n independiente. Solo necesita Git y Docker con Compose v2 (Docker Desktop en Windows/macOS). No se necesita Node ni PostgreSQL instalados en el ordenador.

```sh
git clone https://github.com/frankuxui/moneta.git
cd moneta
docker run --rm -v "${PWD}:/workspace" -w /workspace node:24-alpine node scripts/setup.mjs
docker compose config --quiet
docker compose up -d --build --wait
```

Abre [http://localhost:5180](http://localhost:5180). El comando de configuraci�n funciona en PowerShell, Bash y zsh; crea una contrase�a aleatoria y un nombre de proyecto propio. Si ya tienes Node 24 puedes sustituirlo por `node scripts/setup.mjs`. Si `.env` existe, se conserva sin cambios.

**[Gu�a de arranque paso por paso para personas y agentes de IA](docs/startup.md)** � **[Variables de entorno y protecci�n de datos](docs/environment.md)**

Cada instalaci�n crea su propia base en un volumen Docker. No se descarga ni publica la base del autor. El repositorio contiene �nicamente las migraciones que crean tablas y categor�as iniciales; no hay movimientos de demostraci�n. `.env`, credenciales, backups y archivos de datos est�n excluidos de Git y de las im�genes Docker.

`db`, `backend` y `frontend` deben quedar healthy; `migrate` termina con c�digo 0 despu�s de aplicar las migraciones. Solo se publica el frontend, por defecto en loopback: PostgreSQL y backend permanecen internos. Documentaci�n interactiva en [localhost:5180/api/v1/docs/](http://localhost:5180/api/v1/docs/) y salud en [localhost:5180/api/v1/health](http://localhost:5180/api/v1/health).

### Ubuntu o servidor dentro de tu red local

Sigue el mismo arranque. Si quieres acceder desde otros dispositivos de tu hogar, cambia en tu `.env` `BIND_ADDRESS` a la IP real del servidor, por ejemplo `192.168.1.10`, y vuelve a ejecutar `docker compose up -d --wait`. No cambies el nombre del proyecto ni sus credenciales. Accede entonces a [192.168.1.10:5180](http://192.168.1.10:5180). Configura el firewall descrito a continuaci�n.

### Red y seguridad

Moneta no tiene autenticación. No publiques el puerto en Internet, no configures redirección en el router ni un túnel público. Limita 5180 a la subred local; por ejemplo, en Ubuntu `sudo ufw allow from 192.168.1.0/24 to 192.168.1.10 port 5180 proto tcp`. Docker puede eludir UFW: establece también las reglas correspondientes en DOCKER-USER o en tu firewall nftables conforme a la configuración del host. Una política típica es permitir conexiones establecidas, permitir la subred local al puerto original 5180 y rechazar otros orígenes hacia ese puerto, sin cambiar las reglas de otros servicios. Verifica desde un equipo externo a la subred que no responde. Consulta la [documentación de Docker sobre filtrado](https://docs.docker.com/engine/network/packet-filtering-firewalls/).

Para otra IP o nombre local, configura `BIND_ADDRESS` y, si hace falta, `ALLOWED_ORIGINS` en tu `.env`. Si 5180 est� ocupado, cambia `FRONTEND_PORT`; los or�genes de Compose se calculan autom�ticamente cuando ALLOWED_ORIGINS est� vac�o. La API no habilita CORS y rechaza mutaciones de navegador desde orígenes ajenos. Esto no sustituye un firewall. No hay soporte para acceso público sin añadir autenticación y HTTPS.

### Actualizaciones y persistencia

```sh
docker compose up -d --build --wait
docker compose logs --tail=100 backend migrate
```

La base está en el volumen `moneta_postgres_data`. `docker compose down` conserva los registros. **No uses `down -v` sobre datos que quieras mantener.** Cambiar POSTGRES_PASSWORD después de inicializar el volumen no cambia automáticamente la contraseña de PostgreSQL: modifica el rol en la base y luego actualiza el entorno. Las migraciones se versionan en `backend/drizzle`, se generan con Drizzle Kit y se aplican antes de servir la API. Haz backup antes de actualizar; una versión antigua del backend no implica que el esquema pueda retroceder.

### Copia de seguridad y restauración (Ubuntu)

```sh
mkdir -p backups
chmod 700 backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/moneta.dump
```

Guarda la copia fuera del servidor y comprueba periódicamente su restauración en una base distinta. Para recuperar en la base de Moneta, detén escrituras con `docker compose stop frontend backend`, confirma que has elegido el backup y la base correctos, y ejecuta:

```sh
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < backups/moneta.dump
docker compose up -d --wait
```

La restauración reemplaza los datos de destino. En Windows evita redirecciones binarias en versiones antiguas de PowerShell; usa `docker cp` y ejecuta pg_dump/pg_restore sobre un archivo dentro del contenedor.

## Desarrollo

Requisitos: Node 24 LTS, pnpm 11.17.0 y Docker para PostgreSQL.

```sh
pnpm install --frozen-lockfile
node scripts/setup.mjs
# Si .env ya existe se conserva. Sigue docs/startup.md para cambiar entre Docker y desarrollo.
docker compose -f compose.yaml -f compose.dev.yaml up -d --wait db
pnpm --filter @moneta/shared build
pnpm db:migrate
pnpm dev
```

Frontend [localhost:5180](http://localhost:5180); API [localhost:3080/api/v1/health](http://localhost:3080/api/v1/health). Vite hace proxy `/api`. El servidor de desarrollo se liga a loopback, sin usar 5173. Los cambios de `shared` se compilan en modo watch. Detén los contenedores de frontend/backend antes de usar los mismos puertos en desarrollo. Las categorías iniciales son datos de configuración editables, no movimientos simulados.

## Comprobaciones

```sh
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Las pruebas de integración se omiten explícitamente si no hay TEST_DATABASE_URL; `pnpm test` por sí solo no demuestra persistencia. Para ejecutarlas contra PostgreSQL aislado:

```sh
docker compose -f compose.test.yaml up -d --wait
# Bash:
export TEST_DATABASE_URL=postgresql://moneta:test-only-local@127.0.0.1:5439/moneta_test
# PowerShell: $env:TEST_DATABASE_URL='postgresql://moneta:test-only-local@127.0.0.1:5439/moneta_test'
pnpm test
docker compose -f compose.test.yaml down
```

Los tests vacían exclusivamente una BD cuyo nombre termina en `_test`. La base de pruebas usa tmpfs y desaparece al eliminar su contenedor. La CI ejecuta estas pruebas con PostgreSQL real. Consulta [la evidencia de verificación](docs/verification.md) para las comprobaciones ejecutadas en esta entrega.

## Uso y reglas financieras

- Añade gastos e ingresos desde sus secciones. Acepta `23,65`, `23.65` y `1.250,75`. `1.250` se rechaza por ambigüedad: escribe `1250` o `1.250,00`.
- El historial permite editar, eliminar, buscar, filtrar por fecha/categoría y ordenar por fecha/importe. El total incluye todos los resultados del filtro, no solo la página visible.
- Crea suscripciones con importe por cobro y frecuencia. Las equivalencias mensual/anual son presupuestarias; semanal usa 52 cobros/año. Los redondeos se hacen al céntimo, con enteros.
- **Confirmar cobro** registra un gasto y avanza al próximo vencimiento en una única transacción. No se puede confirmar un cobro futuro o una suscripción pausada. Repetir la misma confirmación devuelve el gasto ya existente. Los cobros atrasados se confirman en orden, uno por uno.
- Cambiar el próximo cobro manualmente redefine el día ancla. La renovación automática conserva el ancla: 31 enero → fin de febrero → 31 marzo. No se usan meses de 30 días. Frecuencia personalizada queda fuera para evitar reglas ambiguas.
- Eliminar un gasto confirmado no retrocede el calendario. Para corregirlo, edítalo. Eliminar una suscripción conserva sus gastos y su identificación como recurrentes. Reasigna registros antes de eliminar categorías o proveedores usados.
- Balance = ingresos registrados − gastos registrados. Sin ingresos en el período, el balance figura como desconocido. No se infiere salario cero.
- Analíticas: semana, mes, año o rango personalizado (hasta diez años); comparación con los días inmediatamente anteriores de igual duración. Sin gasto anterior la variación no se calcula. Calendario y proyecciones usan los contratos activos actuales, no un historial reconstruido de cambios contractuales.
- Importes por registro hasta 999.999.999.999 céntimos. BD BIGINT, API cadenas, operaciones BigInt. Solo las coordenadas de gráficos se convierten a Number; las cifras y tooltips usan los importes exactos. Fechas entre 1900 y 2199, guardadas como DATE ISO.

## Organización

```text
frontend/src/       app, components/ui, features, routes, services, stores, styles
backend/src/        db, lib, modules, app.ts, server.ts
backend/drizzle/    migraciones SQL y snapshots
packages/shared/   contratos Zod, dinero y calendarios puros
.agents/skills/    skills canónicas
.claude/           adaptadores de skills y agentes para Claude Code
.codex/agents/     perfiles TOML para Codex
docs/              arquitectura, perfiles y comprobaciones
```

[Arranque para IA](docs/startup.md), [variables y datos privados](docs/environment.md), [arquitectura y contratos](docs/architecture.md), [instrucciones comunes](AGENTS.md), [compatibilidad de agentes](docs/agents.md). `pnpm agents:sync` regenera los adaptadores; no edites las copias a mano.

La primera versión cubre gastos, ingresos, suscripciones, categorías/proveedores, dashboard, analíticas y preferencias. Presupuestos, alertas automáticas y CSV se reservan para una siguiente fase. No hay conexión bancaria ni automatización de pagos.
