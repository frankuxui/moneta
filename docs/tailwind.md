# Estilos del frontend: Tailwind CSS 4

## Auditoría y decisiones

El frontend ya integraba `@tailwindcss/vite`, pero el archivo global contenía aproximadamente 1.800 líneas con selectores de layout, páginas, formularios, tablas y overrides de shadcn. La refactorización traslada esos estilos a utilidades en JSX. Se conserva un único CSS de entrada, `frontend/src/styles/globals.css`, dedicado a `@import`, la variante de modo oscuro y tokens `@theme`/`:root`/`.dark`. No hay `@apply`, estilos de componente, CSS Modules ni declaraciones `style` propias en TSX.

Las escalas dinámicas de spacing de Tailwind 4 conservan las medidas originales sin valores arbitrarios: por ejemplo, `w-60.5` mantiene el sidebar de 242 px con el spacing base de 4 px. Los tamaños tipográficos compactos que no tienen equivalente nativo se definen una vez como tokens con nombre (caption, body, page, amount). Se conservan colores claros/oscuros, sombras y familias tipográficas.

## Componentes y responsive

- `PageHeader` reúne la cabecera repetida por las rutas. Las utilidades se mantienen en el componente que controla la apariencia.
- Los componentes locales de shadcn siguen usando Radix y CVA; Card contiene ahora sus estilos, en lugar de depender de overrides globales.
- Los formularios usan `@container/form` y `@3xs/form:grid-cols-2`: dos columnas cuando caben, una en contenedores muy estrechos. Las filas de suscripciones usan su propio contenedor y variantes `@md`, `@lg` y `@4xl` según el espacio disponible.
- Los breakpoints definidos en el tema conservan las transiciones anteriores: móvil hasta 760 px, tablet hasta 980 px, escritorio compacto hasta 1200 px y ancho desde 1600 px. JS y CSS coinciden en el límite del menú móvil. Se utilizan `md:`, `lg:`, `xl:` y `2xl:` para el layout general.
- Menú, calendario y conexión usan `cn()` y clases literales para estados; nunca se construyen utilidades concatenando fragmentos. Los identificadores usados por el control de foco son atributos `data-*`, independientes de los estilos.
- Los colores de categorías se representan con SVG y `fill` basado en datos, conservando cualquier color elegido por el usuario sin un atributo `style`.
- Hint usa el tooltip Radix de la base shadcn, con foco, hover, Escape y detección de colisiones. La aplicación no escribe coordenadas inline. Radix y Recharts gestionan internamente sus coordenadas y geometría, como parte de su funcionamiento.

## Composición de clases

Las tarjetas de resumen de suscripciones definen el tamaño del importe en su contenedor inmediato (36 px en móvil y 48 px en escritorio), sin reglas amplias sobre todos los `span`. Así `Money` hereda la tipografía del importe y no la de una etiqueta. El listado comparte un contenedor de consultas y una rejilla de doce columnas: identidad, importe, renovación y acciones se alinean en escritorio y se apilan en pantallas estrechas. Los datos y cálculos financieros permanecen en los contratos y servicios existentes.

Existe una sola función `cn()` en `frontend/src/lib/utils.ts`, basada en clsx y tailwind-merge. La configuración del merger incluye los tamaños y pesos personalizados de `@theme`, para que `text-caption` no se confunda con un color y `font-book` no elimine `font-heading`. Al incorporar un token nuevo de estos grupos, mantener la clasificación correspondiente.

ESLint rechaza atributos JSX `style`, composición manual de `className` con interpolaciones/condicionales y nuevas importaciones de CSS Modules o librerías de estilos.

## Excepciones a valores nativos

Los valores arbitrarios restantes se limitan a geometrías sin una utilidad nativa equivalente:

- Plantillas grid con columnas/filas de distintos tamaños (`1fr 1.45fr`, `auto 1fr`, etc.), necesarias para conservar las proporciones existentes y la composición de shadcn.
- Límite de altura del formulario de `90dvh` y margen inicial de carga de `15vh`.
- Referencias a variables de medidas calculadas por Radix, mediante la sintaxis nativa de custom properties de Tailwind 4.

Las variantes de selectores (`[&>…]`, `data-*`, `group-*`) expresan relaciones del DOM; no son valores de spacing arbitrarios. El patrón repetido del estado vacío del gráfico está definido como un token de background-image, sin un selector CSS de componente. El gutter de scroll utiliza la utilidad nativa `scrollbar-gutter-stable`.

## Verificación ejecutada

Se auditaron los 29 archivos TSX (incluido el test de formularios). El CSS de entrada pasó de 1.812 a 125 líneas, exclusivamente configuración y tokens. Tailwind y su plugin Vite están fijados por el lockfile en 4.3.5.

Se compararon 34 capturas antes/después sobre las siete rutas, con respuestas interceptadas de prueba y sin escribir movimientos en la base personal. Se comprobaron anchos de 375, 820, 1024, 1440 y 1600 px, modo claro/oscuro, ancho del contenido y tamaños de los títulos. No apareció desbordamiento horizontal del documento; las tablas mantienen su propio scroll. Las capturas se guardaron en `.local/`, fuera de Git.

En navegador se verificaron foco y cierre con Escape del menú móvil y de diálogos, validación de céntimos, confirmación/cancelación de borrado, filtros desplegables, selección de frecuencia y tooltip por teclado, sin excepciones JavaScript en ese recorrido. `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check` y las 48 pruebas existentes finalizaron correctamente, incluidas las 12 pruebas de PostgreSQL real sobre la base desechable de tests.

## Documentación oficial consultada

- [Integración con Vite](https://tailwindcss.com/docs/installation/using-vite)
- [Variables de tema](https://tailwindcss.com/docs/theme)
- [Responsive y container queries](https://tailwindcss.com/docs/responsive-design)
- [Estados, grupos y data attributes](https://tailwindcss.com/docs/hover-focus-and-other-states)
- [Modo oscuro](https://tailwindcss.com/docs/dark-mode)
- [Scrollbar gutter](https://tailwindcss.com/docs/scrollbar-gutter)
- [Card de shadcn](https://ui.shadcn.com/docs/components/radix/card), [Dialog](https://ui.shadcn.com/docs/components/radix/dialog) y [Tooltip](https://ui.shadcn.com/docs/components/radix/tooltip)
