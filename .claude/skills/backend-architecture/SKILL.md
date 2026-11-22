---
name: backend-architecture
description: Ampliar módulos REST y manejo de errores Express.
---

Valida cuerpos y queries estrictamente. No interpolar SQL del cliente. Devuelve 404 para recursos inexistentes, 409 para conflictos y 422 para validación. Resuelve toda la transacción en servicio, no en frontend. Actualiza OpenAPI y Supertest. Documentación: https://expressjs.com/en/guide/error-handling.html
