# Moneta: instrucciones compartidas

Lee `docs/architecture.md` para decisiones y contratos. Monorepo pnpm con frontend React/Vite, backend Express/Drizzle/PostgreSQL y paquete puro `@moneta/shared`. No introducir Nx, Turborepo, GraphQL, autenticación ni servicios adicionales sin necesidad del producto.

## Arranque para agentes

Lee `docs/startup.md` y `docs/environment.md` antes de arrancar o desplegar. Comprueba Docker y el estado actual. Para una instalación nueva crea `.env` con `node scripts/setup.mjs` o el comando Docker de la guía; si existe, consérvalo sin mostrarlo. Ejecuta `docker compose config --quiet` y `docker compose up -d --build --wait`, verifica servicios saludables y `/api/v1/health`, e informa de la URL real. Por defecto solo localhost:5180. Cada instalación nueva tiene credenciales y COMPOSE_PROJECT_NAME propios. No regeneres secretos, no cambies la identidad de una instalación con datos y no borres volúmenes para reparar errores. Para desarrollo sigue la secuencia de shared, PostgreSQL, migraciones y pnpm dev documentada.

## Trabajo y calidad

Node 24 LTS; pnpm fijado en package.json. TypeScript strict, sin `any`, nombres descriptivos, ESM con imports `.js` en backend/shared. Validar con Zod en límites HTTP. Mantener consultas en servicios de módulos. Errores centralizados; no registrar cuerpos financieros ni secretos. Consultar documentación oficial al cambiar APIs/dependencias. Usar lockfile y migraciones generadas, nunca `push` en producción.

Comandos: `pnpm install`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check`. Integración requiere TEST_DATABASE_URL aislada; `pnpm --filter @moneta/backend test:integration`. `pnpm dev` usa 5180/3080. `pnpm db:generate`, `pnpm db:migrate`; `pnpm docker:up` para Compose. Nunca puerto 5173.

## Commit y push después de verificar

Después de cada cambio coherente, comprueba que funciona y ejecuta las verificaciones pertinentes. Cuando pasen, revisa el diff, prepara únicamente los archivos del cambio, ejecuta `pnpm publication:check`, crea un commit con un mensaje descriptivo y haz push a la rama remota correspondiente. Esta es la rutina de entrega para todos los agentes, también para cambios de documentación. No dejes cambios verificados sin commit y push salvo instrucción expresa del usuario. No publiques cambios que sepas que fallan, archivos privados ni trabajo ajeno sin revisar; no uses force push ni reescribas el historial. Si una comprobación o el push está bloqueado, conserva el trabajo e informa del motivo concreto. Comprueba el resultado de la CI cuando se ejecute y corrige los fallos relacionados antes de dar la entrega por terminada.

## Frontend

React Router exclusivamente declarativo. TanStack Query para datos remotos; invalidar después de mutaciones, no copiar a Zustand. Zustand únicamente preferencias e interacción. React Hook Form + Zod en formularios. Componentes shadcn/ui locales, Tailwind 4 con tokens semánticos. Estados de carga, error y vacío explícitos. Diálogos con título, foco y teclado; confirmaciones destructivas. Español; tema claro/oscuro; responsive. No introducir datos ficticios permanentes.

Tailwind CSS 4 es el único sistema de estilos: utilidades nativas en JSX y configuración/tokens en `frontend/src/styles/globals.css`. No añadir selectores de componentes, CSS Modules, `@apply`, librerías de estilos ni estilos inline propios. Usar `cn()` para composición condicional y nombres de clases completos detectables estáticamente. Priorizar escalas nativas; conservar tokens y breakpoints existentes para evitar rediseños. Container queries en componentes que dependan de su espacio disponible. Los colores personalizados se representan como atributos SVG, no como estilos inline. Al añadir tamaños o pesos al tema, mantener su clasificación en la única función cn existente. Ver `docs/tailwind.md`.

## Finanzas

Importes positivos en céntimos BIGINT. API serializa céntimos como cadenas. BigInt para operaciones, nunca euros flotantes. `packages/shared` es fuente única de parser/formato/calendario. Fechas DATE ISO, hoy Europe/Madrid; semana lunes. No aproximar meses con 30 días. Recurrencias conservan día ancla y limitan al fin de mes. Previsiones nunca son gastos reales. Confirmaciones transaccionales y únicas por suscripción/vencimiento. Ausencia de ingresos produce balance desconocido, no salario cero. Variación usa un período anterior de igual número de días, etiquetado explícito. Probar céntimos, límites, bisiestos, cambios de año y concurrencia.

## Seguridad y despliegue

Aplicación sin login exclusivamente LAN. Nginx sirve SPA compilada, proxy mismo origen. BD nunca publicada; backend interno. Configuración mediante entorno, sin secretos versionados. No exponer a Internet. Documentar backups y verificar migraciones. No afirmar pruebas o despliegues sin ejecutarlos. Los tests de integración solo pueden vaciar una BD con nombre terminado en `_test`.

Repositorio público: nunca añadir .env, backups, volcados ni archivos de datos. Las migraciones de backend/drizzle sí se versionan. Antes de publicar, preparar el índice y ejecutar `pnpm publication:check`; revisar el listado de archivos. No imprimir credenciales ni usar `git add -f` para saltarse las exclusiones. No ejecutar `docker compose config` sin `--quiet` en salidas compartidas.

## Skills y perfiles

Fuente canónica `.agents/skills`. Perfiles neutrales `docs/agents`; adaptadores generados por `pnpm agents:sync`, no editarlos directamente. `CLAUDE.md` referencia este archivo. Los perfiles no obligan a delegar: invocar solo si aporta una tarea delimitada útil. Ver `docs/agents.md`.
