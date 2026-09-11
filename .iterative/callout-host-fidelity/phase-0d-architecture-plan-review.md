# Revisión TM · plan arquitectónico Fase 0D

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

El borrador reaccionaba únicamente a `ViewUpdate → requestAnimationFrame`. Eso podía perder mutaciones DOM de Obsidian producidas sin transacción de editor, precisamente la clase de frontera que la Fase 0D debe observar.

Cambios:

- añadir `MutationObserver` scoped exclusivamente a `view.dom`;
- batir ViewUpdates y mutaciones en un único scheduler por rAF;
- filtrar bloques por `visibleRanges`/selección y cap duro;
- explicitar que no hay polling ni observer global.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Activar diagnostics desde DevTools no genera necesariamente un `ViewUpdate`. Si el observer está desconectado mientras diagnostics está off, el plan podía quedar inerte tras `enable()` hasta otro evento accidental.

Cambios:

- el controlador temporal notifica transiciones enabled/disabled;
- cada diagnostic ViewPlugin registra listener y capture target;
- `enable()` conecta observer y agenda captura inmediatamente;
- `disable()` desconecta observer y cancela frame;
- `capture()` hace fan-out a targets vivos pero cada target conserva batching post-frame;
- el controlador no conoce `EditorView`;
- deduplicación ignora timestamp pero conserva cambios de selection/representation;
- las mutaciones `style` de otros componentes se observan deliberadamente para poder capturar el estado posterior al contrast normalizer.

## Revisión 3

Resultado: SIN CAMBIOS.

Revisión de carreras de lifecycle: enable/disable desde DevTools, mutaciones de estilo producidas por `CommonContrastManager`, múltiples triggers durante un frame y destroy con captura pendiente. El diseño de suscripción + target + observer scoped resuelve estos casos sin retroalimentación causada por el propio diagnóstico.

También se confirmó que los tokens repetidos, como `$foo`, se identificarán primariamente por posición documental; el texto se usa solo como etiqueta/verificación.

## Revisión 4

Resultado: SIN CAMBIOS.

Revisión de compatibilidad con las APIs/versiones declaradas por el repositorio y de acoplamiento al host. El plan usa capacidades ya disponibles del `EditorView` (`visibleRanges`, `domAtPos`, lifecycle de ViewPlugin), no introduce un selector nuevo de Obsidian y mantiene toda la observación dentro de `view.dom`.

No apareció una corrección arquitectónica adicional justificable antes de la captura real.

**ESTABLE según TM:** revisiones 3 y 4 consecutivas sin cambios.
