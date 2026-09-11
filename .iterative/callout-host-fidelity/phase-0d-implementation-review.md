# Revisión TM temporal · implementación Fase 0D

Estado: TEMPORAL. Eliminar al terminar implementación + tests del ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

La implementación respeta el alcance del plan: controller versionado por carga, registro en el ViewPlugin existente, dos animation frames, snapshots filtrados y ausencia de cambios funcionales en CSS/parser/presentation/contraste.

Se detectó un fallo de aislamiento de lifecycle: `captureLivePreviewView()` construye su snapshot base leyendo `view.state.selection`, `view.viewport`, `view.hasFocus` y `view.dom` antes del `try` que protege el resto del recorrido. Si una vista queda destruida o inconsistente entre el segundo frame y esa lectura, la excepción escaparía al `.map()` de `captureLivePreview()` y abortaría las capturas de otros panes.

Corrección requerida:

- hacer que el snapshot de un view completo sea fail-soft desde la primera lectura;
- permitir un registro mínimo `{timestamp, viewId, captureError:true}` cuando ni siquiera pueda leerse el estado básico, sin inventar selection/viewport/document length;
- mantener las capturas sanas de los demás views en el mismo `captureLivePreview()`.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

La corrección de aislamiento se aplicó, pero el CI detectó un error TypeScript en `captureEmbeddedHost()`: una expresión que combinaba `host.matches(...)` y `host.querySelector(...)` acababa estrechando el tipo a `never` en una de las ramas.

La lógica no necesita esa complejidad: el root ya es un `.cm-embed-block`. Se simplifican los flags para consultar clases propias con `classList.contains()` y presencia de `pre`, `code`, `.cm-line` y `.cm-inline-code` mediante `querySelector()` de descendientes. Esto evita depender de narrowing incidental sin cambiar el significado del snapshot.
