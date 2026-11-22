# Arquitectura de Moneta

## Alcance y fases

Aplicación privada de un único hogar, sin autenticación, exclusivamente para red local. Primera entrega: fundamentos, API, interfaz, CRUD, analíticas e infraestructura. Presupuestos, alertas y exportación quedan fuera de esta entrega.

## Monorepo y dependencias

pnpm Workspaces, sin orquestador adicional. `frontend` (React, Vite), `backend` (Express 5, Drizzle, PostgreSQL) y `packages/shared` (Zod, dinero y calendarios puros). TypeScript estricto; ESM; Node 24 LTS. TanStack Query conserva datos remotos; Zustand conserva exclusivamente tema y navegación. React Router usa BrowserRouter/Routes. TanStack Table ofrece tablas; React Hook Form y Zod formularios; Recharts analíticas; date-fns calendarios; Tailwind 4 y componentes shadcn/ui locales. Floating UI se reserva para ayudas flotantes.

## Modelo y relaciones

- Categorías y plataformas: UUID, nombre único; las categorías incluyen color.
- Movimientos: tipo gasto/ingreso, nombre, concepto, importe positivo, fecha, categoría, descripción, método de pago y notas.
- Suscripciones: proveedor, categoría, nombre, concepto, importe, frecuencia, inicio, próximo cobro, día ancla, estado, URL y notas.
- Cada pago confirmado es un movimiento con suscripción y fecha de vencimiento. Restricción única `(subscription_id, occurrence_date)`. Se conserva aunque se borre la suscripción (FK SET NULL).
- Configuración: una fila, EUR, es-ES, lunes, Europe/Madrid y preferencias del dashboard.
- Las referencias usadas impiden eliminar categorías/plataformas. No se eliminan movimientos en cascada.

## Dinero y calendario

PostgreSQL BIGINT, API cadenas de céntimos, cálculos BigInt. Máximo por movimiento 999.999.999.999 céntimos. Totales sin conversión a Number; solo gráficos convierten valores acotados para visualización. El parser acepta coma o punto decimal y agrupación española inequívoca; rechaza fracciones de más de dos cifras. Equivalencias redondeadas mediante división entera al céntimo (mitad hacia arriba): semanal ×52/año, mensual ×12, trimestral ×4, semestral ×2. Son equivalencias presupuestarias, no sumas de cobros efectivos.

Fechas DATE ISO (sin hora); hoy se determina en Europe/Madrid. Rangos inclusivos; lunes inicia la semana. Recurrencias mensuales mantienen el día ancla original y limitan al último día del mes. Confirmación explícita del próximo vencimiento bajo bloqueo de fila en una transacción; guarda gasto y adelanta vencimiento atómicamente. Reintentos de la misma fecha devuelven el movimiento existente. No se genera ningún gasto automáticamente. Un movimiento confirmado se corrige editándolo; eliminarlo no rebobina el calendario.

## API `/api/v1`

CRUD `/expenses`, `/income`, `/subscriptions`, `/categories`, `/platforms`; PATCH como actualización parcial. GET de movimientos acepta `search`, `from`, `to`, `categoryId`, `sort` (date/amount), `direction`, `page`, `pageSize` (máximo 100). Devuelve `{items,total,totalCents,page,pageSize}`. `/dashboard?from&to` y `/analytics?from&to` devuelven cifras reales, comparación anterior, evolución y previsiones separadas. `/subscriptions/:id/confirm` recibe `{date}`. GET/PUT `/settings`. GET `/health`; contrato generado desde Zod en `/openapi.json`, explorador en `/docs`. Errores `{error,message,details?}`. Validación estricta, límites de cuerpo, consultas parametrizadas, same-origin y control de origen para mutaciones.

## Infraestructura

Nginx sirve SPA compilada y proxy `/api`. Puerto 5180 ligado por defecto a 127.0.0.1; BIND_ADDRESS permite elegir una IP LAN. El asistente crea credenciales y COMPOSE_PROJECT_NAME independientes por instalaci�n. Backend 3080 interno; PostgreSQL sin puerto de host, volumen persistente. Compose espera health checks y ejecuta migraciones antes del backend. Contraseña obligatoria desde `.env`. Firewall de Ubuntu debe permitir 5180 solo desde la subred local; nunca publicar en router o proxy público. Docker puede eludir UFW: usar también DOCKER-USER o reglas equivalentes.

## Agentes

AGENTS.md es la fuente común. Skills canónicas en `.agents/skills`; adaptadores Claude se generan con `pnpm agents:sync` (copias comprobables, sin enlaces simbólicos dependientes de Windows). Perfiles neutrales en `docs/agents`, adaptadores nativos en `.claude/agents` y `.codex/agents`; no ejecutan trabajos automáticamente. Ver `docs/agents.md` y fuentes oficiales.

## Validación y riesgos

Cada fase debe compilar y pasar sus comprobaciones antes de continuar. Vitest para dinero/calendario; Supertest contra PostgreSQL aislado para transacciones, filtros y duplicados; Testing Library para estados/formularios; comprobación de build y Docker. Sin autenticación: no apto para Internet. No hay conversión multidivisa. Las previsiones usan estado actual y no son una reconstrucción histórica de contratos. Copias de seguridad responsabilidad del operador; procedimiento documentado. No afirmar ejecución de contenedores si Docker no está disponible.

## Referencias consultadas

- https://orm.drizzle.team/docs/migrations
- https://orm.drizzle.team/docs/transactions
- https://tailwindcss.com/docs/installation/using-vite
- https://reactrouter.com/start/declarative/installation
- https://ui.shadcn.com/docs/installation/vite
- https://learn.chatgpt.com/docs/build-skills
- https://learn.chatgpt.com/docs/agent-configuration/subagents
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/sub-agents
