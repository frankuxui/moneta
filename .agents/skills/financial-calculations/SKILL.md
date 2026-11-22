---
name: financial-calculations
description: Modificar dinero, períodos, balances y recurrencias.
---

Antes de editar lee packages/shared/src/money.ts y calendar.ts. Dinero en cadenas de céntimos hacia HTTP y BigInt internamente. Conserva día ancla al pasar febrero; confirmar gasto y avanzar vencimiento en una transacción bloqueada. Prueba reintentos y concurrencia. Documentación: docs/architecture.md
