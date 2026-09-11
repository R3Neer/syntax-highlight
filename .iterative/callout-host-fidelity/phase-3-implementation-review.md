# Revisión TM temporal · implementación Fase 3

Estado: TEMPORAL. Eliminar tras gate satisfactorio y limpieza final.

## Revisión 1

Resultado: SIN CAMBIOS.

Primera revisión limpia del código de producción.

Se revisó el diff completo desde el plan estable:

- solo cambian `editor-block-model.ts` y `editor.ts`;
- el modelo sigue host-neutral y no importa `EditorView`;
- `EditorLineSemantic` separa extent físico de visibility probe;
- body lines usan `sourceFrom/sourceTo` como probe;
- `lineSemanticIsMaterialized` combina viewport + visibleRanges con semántica half-open/point;
- `Decoration.line` sigue colocándose en `line.from`;
- semantic marks y line-number widgets conservan `visibleRanges`;
- block-level fast path, cache y update lifecycle no cambian;
- el fallback de viewport solo mantiene compatibilidad con fixtures/headless;
- no hay cambios CSS, routing, settings, Smart Editing, parser engine o configured profiles;
- suite existente, build y `pack:all` pasan sin adaptar expectativas antiguas.

No se identificó corrección adicional.

## Revisión 2

Resultado: SIN CAMBIOS.

Segunda revisión limpia, centrada en boundaries y lifecycle:

- rangos no vacíos usan overlap half-open;
- probes puntuales preservan blank quoted source;
- un bloque rendered puede superar el fast path grueso, pero cada line semantic sigue necesitando su prueba de materialización;
- semantic parsing no aumenta: continúa limitado por `visibleRanges`;
- scroll/selection rematerializan y doc/revision invalidan cache como antes;
- top-level mantiene comportamiento y quoted solo cambia la política de line decorations.

Revisiones 1 y 2 consecutivas sin cambios: implementación Fase 3 queda ESTABLE según TM.
