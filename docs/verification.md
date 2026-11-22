# Verificación de la entrega

Ejecutada el 22 de noviembre de 2026 en Windows con Node 24.18.0, pnpm 11.17.0, Docker Desktop (motor Linux) y Edge headless mediante Playwright CLI. Las imágenes usan Node 24 Alpine, Nginx 1.28 Alpine y PostgreSQL 17 Alpine.

## Comprobaciones automatizadas

- `pnpm build`: paquetes shared, backend y frontend compilados; frontend de producción generado por Vite.
- `pnpm typecheck`: TypeScript estricto en los tres paquetes.
- `pnpm lint`: ESLint sin errores.
- `pnpm format:check`: formato Prettier comprobado.
- `pnpm test` con TEST_DATABASE_URL aislada: 27 pruebas shared, 12 de API/PostgreSQL y 3 de formularios, 42 en total.
- Las pruebas de PostgreSQL aplican migraciones reales y vacían únicamente `moneta_test` sobre el contenedor efímero de `compose.test.yaml`.
- Las nueve skills pasaron `quick_validate.py` del skill-creator. Perfiles TOML y frontmatter de skills/adaptadores comprobados; el generador se ejecutó satisfactoriamente.

Casos relevantes: parser coma/punto, fracciones inválidas, importes grandes, sumas exactas, equivalencias, semanas entre meses, cambio de año, febrero bisiesto, anclas 29/30/31, renovaciones trimestrales/semestrales/anuales, confirmación simultánea sin duplicados, conservación de campos en PATCH, balance sin ingresos, separación previsión/gasto y eliminación conservando movimientos.

## Docker e integración

`docker compose build` construyó las imágenes multistage. `docker compose up -d --wait` aplicó migraciones y arrancó los servicios; db, backend y frontend con health checks correctos. Se verificó que el único puerto publicado en el stack principal era `127.0.0.1:5180`; PostgreSQL y backend permanecían internos.

Se reiniciaron base y backend tras crear movimientos mediante navegador. Los importes y preferencias persistieron. Se probó de nuevo el acceso a través de Nginx tras cambiar la dirección interna del backend: el resolver Docker del proxy recuperó el servicio.

## Recorrido de navegador

Sobre el frontend compilado servido por Nginx, con API y PostgreSQL reales:

1. Crear gasto de 23,65 €, categoría Alimentación; editar a 24,65 € y añadir concepto.
2. Buscar el movimiento y comprobar el importe devuelto por la API.
3. Crear ingreso de 100,00 €.
4. Crear suscripción mensual de 9,99 €, confirmar el cobro una vez y comprobar gasto total 34,64 € y balance 65,36 €.
5. Pausar/reactivar y editar la suscripción. Crear y editar proveedor, crear categoría, guardar preferencias.
6. Consultar analíticas, activar modo oscuro y recargar para comprobar persistencia del tema.
7. Navegar en viewport 375 × 812: sin desbordamiento horizontal del documento, tabla con scroll propio, menú móvil y formulario con cierre mediante Escape.
8. Interceptar temporalmente una consulta para devolver 503; mostrar error, retirar la interceptación y recuperar mediante «Volver a intentar». Los errores de red de esa prueba fueron intencionados; no se detectaron excepciones JavaScript en el recorrido normal.
9. Eliminar mediante las confirmaciones de UI todos los registros con prefijo `[verificacion]`. La base principal quedó sin movimientos ni suscripciones y con las diez categorías iniciales. No se mantienen fixtures ni datos de demostración en el producto.

Las capturas de trabajo se guardaron en `.local/`, excluido del repositorio.

## Límites de lo verificado

No se ha desplegado en el servidor Ubuntu 192.168.1.10, ni se ha modificado su firewall, ni se ha ejecutado la CI en GitHub. El stack se ejecutó localmente en contenedores Linux. Las instrucciones de backup/restauración están documentadas; todavía no se ha ensayado una restauración de datos del usuario. No se ha realizado una auditoría WCAG formal ni una prueba de carga. Los adaptadores de agentes se validaron como archivos; no se ejecutaron sesiones independientes de Codex CLI y Claude Code para verificar su descubrimiento nativo.
