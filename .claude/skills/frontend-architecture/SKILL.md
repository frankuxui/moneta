---
name: frontend-architecture
description: Construir rutas, consultas y estado de cliente de Moneta.
---

Mantén llamadas HTTP en services/api.ts y claves Query estables. Invalida todas las consultas afectadas después de mutar. No almacenes respuestas en Zustand. Utiliza BrowserRouter y Routes. Documentación: https://reactrouter.com/start/declarative/installation
