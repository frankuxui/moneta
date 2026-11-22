# Variables de entorno y separación de datos

`scripts/setup.mjs` genera la configuración de una instalación nueva. `.env` es privado, está excluido de Git y del contexto Docker; nunca lo subas, pegues en un chat ni adjuntes a una incidencia. El archivo no se copia dentro de las imágenes. Compose inyecta únicamente las variables necesarias en cada servicio en tiempo de ejecución.

## Variables

| Variable               | Uso                                                | Valor inicial y precauciones                                                                                                                                                                                            |
| ---------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `COMPOSE_PROJECT_NAME` | Identifica contenedores, red y volumen             | Generado como `moneta-<identificador>`. Conservar para mantener el mismo volumen. Si una instalación antigua no lo tiene, el fallback `moneta` conserva su identidad anterior.                                          |
| `POSTGRES_DB`          | Nombre de la base                                  | `moneta`. No contiene datos ni una dirección externa. Cambiarlo en un volumen inicializado no crea/migra otra base automáticamente.                                                                                     |
| `POSTGRES_USER`        | Rol de PostgreSQL                                  | `moneta`. No equivale a un usuario de la app. No cambiarlo arbitrariamente con datos existentes.                                                                                                                        |
| `POSTGRES_PASSWORD`    | Credencial privada                                 | 48 caracteres hexadecimales aleatorios. Nunca hay una contraseña de producción compartida en GitHub.                                                                                                                    |
| `DATABASE_URL`         | Backend/migraciones ejecutados con Node en el host | URL local con la misma contraseña y puerto 5432. Compose no usa este valor: construye la URL interna hacia `db` con las variables POSTGRES.                                                                             |
| `BIND_ADDRESS`         | Interfaz de red donde se publica el frontend       | `127.0.0.1`. Para una LAN, la IP real del servidor. No es la IP de PostgreSQL.                                                                                                                                          |
| `FRONTEND_PORT`        | Puerto del frontend Docker                         | `5180`. Cambiar para evitar conflictos; nunca se utiliza 5173. No cambia el puerto fijo de Vite en desarrollo.                                                                                                          |
| `PORT`                 | Backend ejecutado con Node en desarrollo           | `3080`. Dentro de Compose se mantiene 3080 y no se publica. Vite espera ese puerto.                                                                                                                                     |
| `ALLOWED_ORIGINS`      | Orígenes de navegador autorizados a mutar datos    | Vacío: Compose calcula los orígenes de la IP/puerto configurados y localhost. Si lo defines, usa orígenes completos separados por comas sin espacios. En desarrollo el fallback admite localhost:5180 y 127.0.0.1:5180. |
| `TEST_DATABASE_URL`    | Tests de integración destructivos                  | Solo base desechable cuyo nombre termina en `_test`. Nunca la base personal. No es necesaria para usar la app.                                                                                                          |

Los entornos de shell pueden tener prioridad sobre `.env` en Compose. Evita exportar variables de otra instalación, especialmente `COMPOSE_PROJECT_NAME`, POSTGRES_* o ALLOWED_ORIGINS. Usa `docker compose config --quiet` para validar sin mostrar valores.

## Instalaciones nuevas e independientes

Clonar el código no clona ningún volumen Docker. Cada equipo crea su propia base; en el mismo equipo, el asistente genera un nombre de proyecto diferente para cada carpeta. Dos apps simultáneas necesitan puertos frontend distintos. No copies el `.env` de la primera a la segunda, porque podrían compartir la misma identidad Compose y sus datos.

El repositorio contiene migraciones SQL para crear tablas y categorías iniciales. No contiene volcados, tablas con movimientos del autor, volúmenes PostgreSQL ni backups. `backend/drizzle` debe publicarse: esas migraciones permiten que una base vacía se convierta en una instalación utilizable.

## Instalaciones existentes

El asistente **no modifica** `.env` existente. No cambies `COMPOSE_PROJECT_NAME` para poner un nombre más bonito: Compose buscaría otro volumen y parecería que faltan tus datos. No cambies POSTGRES_DB o POSTGRES_USER como solución a un fallo de arranque.

La contraseña se aplica al inicializar una base vacía. Modificar solo POSTGRES_PASSWORD no cambia el rol de un volumen existente. Una rotación requiere backup, detener escrituras, cambiar la contraseña del rol dentro de PostgreSQL y actualizar POSTGRES_PASSWORD y DATABASE_URL de esa misma instalación antes de reiniciar servicios. No se incluye una rotación automática porque no debe alterar bases existentes sin un procedimiento de mantenimiento.

Si escribes manualmente `.env`, usa la plantilla `.env.example`, sustituye los marcadores y genera tu propia contraseña. Recomendamos hexadecimal: evita problemas de interpolación de Compose y de caracteres reservados en URLs. Otras contraseñas requieren codificación URL correcta en DATABASE_URL y en la conexión interna; la ruta automática genera valores compatibles.

## Antes de publicar cambios

```sh
git add .
pnpm publication:check
git diff --cached --stat
git status --short
```

La comprobación inspecciona el **índice Git**: rechaza configuraciones privadas, volcados y archivos de datos; permite `.env.example` y las migraciones del esquema. Si existe `.env` local, busca sus credenciales exactas en el contenido preparado, sin mostrarlas. Comprueba también algunos formatos de tokens y claves privadas. Es una protección adicional, no un detector universal de secretos.

Si falla, retira los archivos privados del índice conservándolos en disco (`git rm --cached -- <archivo>`) y corrige el código antes de crear el commit. No uses `git add -f` para publicar datos excluidos. En un commit inicial sin HEAD, `git rm --cached` funciona para retirar un archivo ya añadido; no lo confundas con `git rm`, que puede borrar el archivo de trabajo.

Si una credencial llegase a publicarse, retirarla del último commit no basta: revócala/rota y sigue el procedimiento de [GitHub para datos sensibles](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository). Nunca imprimas la contraseña en el informe de publicación.

Referencias: [variables Compose](https://docs.docker.com/compose/how-tos/environment-variables/envvars/) y [aislamiento por nombre de proyecto](https://docs.docker.com/compose/how-tos/project-name/).
