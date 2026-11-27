# Ahorros e inversión

Moneta incluye dos historiales independientes: **Ahorros** (`/savings`) e **Inversión** (`/investments`). Permiten contabilizar dinero que ya has apartado o recuperado, con fecha, concepto, cuenta o plataforma e importe exacto en céntimos.

## Aportaciones mensuales

1. Entra en Ahorros desde el menú.
2. Pulsa **Registrar movimiento** y selecciona **Aportación**.
3. Indica el concepto, la cuenta o monedero, el importe y la fecha real. Puedes añadir notas.
4. Guarda. El saldo acumulado y las aportaciones del mes se actualizan.
5. Repite cuando hagas otra aportación. Usa **Mes del historial** para revisar un mes concreto.

Si ya tenías ahorros, registra el saldo inicial como una primera aportación identificada como tal. No existen transferencias bancarias ni aportaciones automáticas: registrar el movimiento solo lo contabiliza en Moneta. No se admiten fechas futuras.

## Inversión por plataforma

En Inversión, sigue el mismo proceso e indica **Plataforma o servicio**. El resumen muestra el capital neto aportado a cada destino y el total. Los destinos son nombres libres con sugerencias de los ya usados; no es necesario crear antes un proveedor en Configuración. Se agrupan sin distinguir mayúsculas y minúsculas y eliminando espacios de los extremos. Usa el mismo nombre para seguir agrupando una cuenta.

El capital neto es **aportaciones menos retiradas**. No es una valoración de mercado, ni calcula beneficios, pérdidas, dividendos, comisiones o rentabilidad. No hay conexión a plataformas financieras ni se ejecutan inversiones o pagos. Esta entrega registra capital aportado; las retiradas se limitan al saldo contabilizado de cada destino.

## Retiradas y correcciones

- Para recuperar dinero contabilizado, registra una **Retirada** en el mismo destino.
- Puedes editar el concepto, destino, tipo, importe, fecha y notas desde el historial.
- La eliminación requiere confirmación y recalcula los saldos.
- Se rechaza cualquier creación, edición o eliminación que deje el saldo acumulado de algún destino negativo. La comprobación se hace sobre el saldo final de todos los registros, no sobre una reconstrucción diaria de saldos históricos.
- No hay traslado automático entre ahorros e inversión: si mueves dinero de uno a otro, registra la retirada y la aportación correspondientes en cada apartado.

Estos movimientos **no son gastos ni ingresos** y no modifican el balance, las analíticas de consumo ni los vencimientos de suscripciones. No son una cuenta corriente ni una conciliación bancaria. Evita duplicar estas asignaciones como gastos si solo estás moviendo dinero propio.

## Resúmenes y búsquedas

Las tarjetas muestran el saldo total y las aportaciones y retiradas del mes actual según Europe/Madrid. Los saldos por destino incluyen todo el historial y no cambian al filtrar. El selector mensual filtra únicamente el historial; el neto filtrado refleja aportaciones menos retiradas de todos sus resultados.

El historial tiene búsqueda global y un buscador por cada columna de datos: concepto, cuenta/plataforma, tipo, fecha, importe y notas. Se combinan mediante AND, sin distinguir acentos o mayúsculas; admiten fechas e importes legibles. Los inputs se conservan aunque no haya resultados. El servidor filtra y calcula el total antes de paginar (20 filas por defecto, máximo 100).

## API y persistencia

Ambos recursos tienen el mismo contrato bajo `/api/v1/savings` y `/api/v1/investments`:

| Método y ruta | Comportamiento                                                                        |
| ------------- | ------------------------------------------------------------------------------------- |
| GET /         | Historial paginado; devuelve items, total, totalCents firmado, page y pageSize.       |
| POST /        | Crea un movimiento.                                                                   |
| GET /:id      | Consulta un movimiento del apartado.                                                  |
| PATCH /:id    | Actualización parcial sin restablecer los campos omitidos.                            |
| DELETE /:id   | Elimina con recálculo de saldos; devuelve 204.                                        |
| GET /summary  | Saldo total, aportaciones y retiradas totales y del mes actual, y saldos por destino. |

Cuerpo de creación: `name`, `destination`, `direction` (deposit/withdrawal), `amountCents` (cadena positiva de céntimos), `date` (ISO) y `notes` opcional. El máximo por registro es 999.999.999.999 céntimos.

Queries: `search`, `nameSearch`, `destinationSearch`, `directionSearch`, `dateSearch`, `amountSearch`, `notesSearch`, `from`, `to`, `page` y `pageSize`. Orden fijo por fecha descendente, creación descendente y UUID para desempatar. Errores: 422 de validación, 404 si no existe en ese apartado y 409 si la operación dejaría un saldo negativo.

La tabla `wealth_entries` distingue savings/investments, con importes BIGINT positivos y dirección separada. La migración generada `0002_useful_randall_flagg.sql` añade la tabla y sus restricciones sin modificar los datos existentes. Se aplica mediante el servicio migrate de Compose. No añade cuentas ni movimientos de demostración.

Las mutaciones usan una transacción y un bloqueo asesor PostgreSQL por apartado: las retiradas concurrentes se serializan y se revierten si producirían un saldo negativo. Los cálculos compartidos usan BigInt y la API serializa cadenas. OpenAPI incluye ambos recursos y sus resúmenes.
