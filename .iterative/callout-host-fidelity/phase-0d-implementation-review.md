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

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

La revisión de privacidad/sanitización detectó que el snapshot post-frame conservaba el atributo `style` y `backgroundImage` computado sin filtrar. Ambos pueden contener `url(...)`, lo que incumpliría el requisito de no exportar rutas/URLs aunque la captura funcional fuese correcta.

Corrección requerida:

- sanitizar todos los valores de atributos post-frame antes de truncarlos;
- redaccionar cualquier `url(...)` como `url(<redacted>)`;
- aplicar la misma sanitización a valores CSS computados susceptibles de contener URL, en particular `backgroundImage`;
- mantener intactos colores, display, alignment y demás propiedades necesarias para el diagnóstico.

## Revisión 4

Resultado: CAMBIOS NECESARIOS.

Tras aplicar la sanitización y obtener CI verde, la revisión de scope del snapshot detectó que `styledAncestors()` no se detenía al alcanzar `view.dom`. Marcaba ese nodo con `isViewDom`, pero continuaba ascendiendo hasta `MAX_ANCESTORS`.

Eso contradice el plan y tiene dos riesgos:

- ruido diagnóstico: se capturan contenedores del workspace que ya no forman parte del EditorView observado;
- privacidad: como cada ancestor incluye `textContent` truncado, ascender más allá de `view.dom` puede incorporar títulos de pestañas, nombres de archivo u otro texto ajeno al fenced block.

Corrección requerida:

- incluir `view.dom` como último ancestor útil y detener el recorrido inmediatamente después;
- aplicar el mismo límite tanto a líneas `.cm-line` como a `.cm-embed-block`, ya que ambos reutilizan `styledAncestors()`;
- no ampliar por esta corrección el snapshot ni tocar comportamiento funcional del plugin.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Con el ancestry ya limitado a `view.dom`, se revisó el aislamiento interno de cada view. `captureLine()` todavía ejecuta `relevantDescendants()`, `styledElementSnapshot()` y `styledAncestors()` antes de su `try` de mapping. Si cualquiera de esas lecturas falla por una reconciliación concurrente, el `.map()` de líneas lanza y el `try` exterior marca todo el view como `captureError`, perdiendo las demás líneas y embedded hosts sanos.

El fallback de embedded host tiene un problema análogo: si `captureEmbeddedHost()` lanza, el `catch` vuelve a llamar a `styledElementSnapshot(host, view.dom)`, que puede ser precisamente la operación que falló.

Corrección requerida:

- aislar cada `.cm-line` con un wrapper fail-soft y devolver `snapshotError:true` solo para esa línea;
- usar un placeholder diagnóstico explícito (`tag: "<unavailable>"`, sin clases/atributos/texto inventados, `styleError:true`) cuando el propio elemento no pueda inspeccionarse;
- usar el mismo placeholder en el fallback de embedded host y no volver a ejecutar operaciones que ya han fallado;
- preservar el resto del view y de otros views.

## Revisión 6

Resultado: CAMBIOS NECESARIOS.

Tras aislar snapshots por nodo, la revisión final de minimización de datos detectó dos excesos:

1. `styledAncestors()` reutilizaba `styledElementSnapshot()` y por tanto conservaba `textContent`. Aunque ahora el recorrido termina en `view.dom`, el texto de ese root puede incluir el inline title de la nota y otros contenidos que no son necesarios para diagnosticar ancestry, contradiciendo el requisito de no exportar nombres de archivo.
2. `sanitizeDiagnosticValue()` sustituía `url(...)` mediante una regex parcial. Una URL con paréntesis internos o una serialización CSS poco habitual podría dejar un sufijo visible. El diagnóstico no necesita preservar ninguna parte de un valor que contenga URL.

Corrección requerida:

- los snapshots de ancestors conservan tag/clases/atributos/estilos, pero fuerzan `text: ""`;
- si un valor contiene `url(`, redaccionarlo completo como `<url-redacted>` en vez de intentar reescribir solo el argumento;
- mantener el texto únicamente en la `.cm-line`, descendants relevantes y embedded host observados, donde sí sirve para identificar el contenido del probe.

## Revisión 7

Resultado: SIN CAMBIOS.

Se revisó la implementación ya corregida contra el plan estabilizado: controller nuevo por carga, registro/desregistro en el ViewPlugin existente, captura manual tras dos animation frames, fail-soft por view y por nodo, ancestry limitado al EditorView, atributos filtrados, URLs redaccionadas por valor completo, límites de tamaño, mapeo `posAtDOM`, anotación contra fences lógicos y snapshot adicional de `.cm-embed-block`.

No se encontró una corrección adicional dentro del alcance diagnóstico de Fase 0D. La implementación sigue sin tocar CSS, parser, presentation, Reading View ni normalización de contraste.

## Revisión 8

Resultado: SIN CAMBIOS.

Revisión independiente centrada en lifecycle y composición: múltiples panes registrados, destrucción de un view entre frames, reconciliación de nodos durante el snapshot, coexistencia de source/rendered, quoted embedded host y comportamiento con diagnostics desactivado. La implementación sigue siendo fail-soft, manual e inerte respecto al comportamiento funcional del plugin.

El CI del código corregido completó con éxito lint, typecheck, suite existente, build, `pack:all` y artifact. No se identificó una modificación adicional.

**ESTABLE según TM:** revisiones 7 y 8 consecutivas sin cambios.
