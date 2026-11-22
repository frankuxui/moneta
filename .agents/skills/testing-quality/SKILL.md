---
name: testing-quality
description: Verificar cambios de lógica financiera, API y formularios.
---

Ejecuta primero pruebas relevantes y luego typecheck/build/lint. Usa TEST_DATABASE_URL con nombre *_test; no tocar datos reales. Tests de integración deben probar rollback, FK y duplicados. No presentar comprobaciones omitidas como superadas. Documentación: https://vitest.dev/guide/
