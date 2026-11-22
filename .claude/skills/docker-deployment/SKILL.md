---
name: docker-deployment
description: Modificar imágenes, Compose y despliegue Ubuntu LAN.
---

Nginx sirve dist y proxy /api; 5180 ligado a IP LAN, backend y BD internos. Conserva volumen postgres y health checks. Migra antes de iniciar. Nunca down -v sobre datos reales. Ver README.md para backups y firewall. Documentación: https://docs.docker.com/compose/
