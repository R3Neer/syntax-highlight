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

Primera revisión limpia del estado anterior. Se comprobó runtime/bundle, contrato npm, ownership DOM, ruta oficial de LP rendered, contraste, selectores privados, viewport/caché, lifecycle y ledger.

## Revisión 7

Resultado: SIN CAMBIOS.

Segunda revisión limpia del estado anterior. Revisiones 6 y 7 estabilizaron la implementación y autorizaron inicialmente el paso a Fase 9.

## Revisión 8

Resultado: CAMBIOS NECESARIOS.

La primera ejecución de los tests nuevos reveló que la política mode/settings estaba enterrada dentro de `main.ts` y solo podía probarse intentando cargar el módulo runtime `obsidian` en Vitest. Esa prueba no representa un host real y además el paquete `obsidian` del entorno de tests actúa como contrato de tipos, no como implementación JS ejecutable.

### Corrección de producción

Se extrajo una frontera pura y host-neutral:

- nuevo `markdown-render-mode.ts` define `MarkdownRenderViewState` y `markdownHighlightEnabledForContext()`;
- la función pura recibe únicamente `mode`, `sourcePath`, `ownsElement` y los dos settings;
- `main.ts` sigue siendo el único adapter Obsidian: convierte `MarkdownView` reales mediante APIs públicas (`getMode()`, `file?.path`, `containerEl.contains(element)`) y delega la decisión;
- se conserva exactamente la semántica estabilizada: owner por containment primero, único `sourcePath` como fallback y ausencia/ambigüedad -> `markdownReading`;
- no se añade ninguna dependencia de DOM privado ni una nueva ruta de rendering.

### Motivo arquitectónico

La extracción mejora la separación adapter host / política pura y permite probar la decisión sin inventar una implementación de `MarkdownView` ni cargar internals de Obsidian. El cambio fue provocado por la fase de tests y, por ello, **reabre el TM de implementación**. Las antiguas revisiones 6–7 dejan de ser el par limpio final; hacen falta dos nuevas revisiones consecutivas sin cambios sobre este estado.

No se reanuda la expansión de tests hasta estabilizar de nuevo implementación.
