---
name: tailwindcss-v4
description: Modificar tokens, estilos y temas Tailwind 4.
---

Define tokens semánticos en @theme y variables :root/.dark. Mantén globals.css limitado a configuración y tokens: no selectores de componentes ni @apply. Usa utilidades nativas, escalas de spacing y variantes responsive/estado; container queries cuando el componente dependa de su espacio disponible. Compón clases condicionales con la única función cn de lib/utils, manteniendo clases completas detectables. No utilices estilos inline propios; los colores de datos se pasan como atributos SVG. Conserva el diseño y los breakpoints existentes. Consulta docs/tailwind.md desde la raíz para las excepciones geométricas documentadas. Integra mediante @tailwindcss/vite; no añadas configuración de Tailwind 3. Documentación: https://tailwindcss.com/docs/theme y https://tailwindcss.com/docs/responsive-design
