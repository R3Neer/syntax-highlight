# Revisión TM temporal · implementación Fase 1

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Cambios: surface source más robusta (`background-color`, fallback base `--text-normal`) y contraste restringido a DOM propio.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Cambio: declarar como peers npm los runtime imports CodeMirror/Lezer que el artifact deja externos; externals preventivos como `electron`/built-ins no se convierten en peers fantasma.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

Cambio: rendered Markdown pasa a elegir `markdownEditor` o `markdownReading` según `MarkdownView.getMode()` mediante APIs públicas, en vez de usar siempre `markdownReading`.

## Revisión 4

Resultado: CAMBIOS NECESARIOS.

Cambios:

- resolver primero el `MarkdownView` propietario por `containerEl.contains(element)` y usar `context.sourcePath` solo como fallback inequívoco, para cubrir transclusiones;
- sincronizar Fases 0–7 del plan de implementación con el progreso real.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Cambio: cerrar trazabilidad del ledger y del plan con una matriz explícita de tests futura para settings/mode, incluyendo transclusión, owner por containment y fallback conservador.

## Revisión 6

Resultado: SIN CAMBIOS.

Primera revisión limpia del estado anterior.

## Revisión 7

Resultado: SIN CAMBIOS.

Segunda revisión limpia del estado anterior. Revisiones 6 y 7 estabilizaron inicialmente implementación.

## Revisión 8

Resultado: CAMBIOS NECESARIOS.

Los tests nuevos revelaron que la política mode/settings estaba enterrada dentro de `main.ts` y solo podía probarse intentando cargar el runtime `obsidian` en Vitest.

Corrección:

- nuevo `markdown-render-mode.ts` con `MarkdownRenderViewState` y `markdownHighlightEnabledForContext()`;
- función pura recibe solo `mode`, `sourcePath`, `ownsElement` y settings;
- `main.ts` conserva la traducción desde `MarkdownView` real mediante API pública;
- semántica sin cambios: ownership primero, `sourcePath` único como fallback, ausencia/ambigüedad -> `markdownReading`.

Este cambio reabrió TM de implementación.

## Revisión 9

Resultado: SIN CAMBIOS.

Primera revisión limpia después de la extracción host-neutral de la política rendered-mode.

Se revisó específicamente la nueva frontera `markdown-render-mode.ts` / `main.ts`:

- la función pura no conoce Obsidian, DOM, `MarkdownView` ni selectores;
- `main.ts` sigue siendo la única frontera host y usa exclusivamente API pública: `getMode()`, `file?.path` y `containerEl.contains()`;
- no cambia la semántica estabilizada en revisiones anteriores;
- no introduce estado, caché, observers ni lifecycle nuevos;
- owner por containment conserva prioridad para transclusiones;
- único `sourcePath` sigue siendo fallback secundario;
- ausencia/ambigüedad conserva `markdownReading` como decisión conservadora;
- no cambia ninguna ruta de rendering, solo separa adapter host de política testeable.

No se encontró modificación necesaria. Esta es la primera revisión limpia del nuevo estado de implementación.
