# Revisión TM temporal · plan de implementación Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisiones 1–2

Resultado: CAMBIOS NECESARIOS.

Se estabilizaron sequencing TM, layering engine/resolver, synthetic names, scanner y separación implementación/tests.

## Revisiones 3–4

Resultado: SIN CAMBIOS / SIN CAMBIOS.

Par limpio del plan anterior, invalidado como par final por el cambio cromático de Revisión arquitectónica 6.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Se reconcilió el plan con la arquitectura reabierta/reestabilizada:

- semántica Fase 2 permanece completada;
- se reabre únicamente la paleta quoted source;
- toda variable pública `--code-*` relevante se remapea a `--syntax-common-*` heredable + literal dark-safe;
- valores/fallbacks quedaron fijados, incluido `--code-tag -> syntax-common-meta`, invalid y line numbers;
- tests nuevos permanecen bloqueados hasta estabilizar implementación.

## Revisión 6

Resultado: SIN CAMBIOS.

Primera revisión limpia del plan reconciliado.

Se revisó orden y rollback:

- solo queda completar la paleta scoped de 5.2 antes de volver al TM de implementación;
- un fallo CSS no obliga a deshacer el engine stream ya verde;
- routing rendered, scanner Markdown, contrast JS, configured languages y build boundary no participan;
- no existe una fase intermedia que requiera cobertura nueva;
- Fase 8 sigue siendo el único punto de creación de tests nuevos;
- todos los colores/fallbacks del tramo pendiente están determinados y no dejan decisiones al implementador.

No se encontró modificación necesaria. Es la primera revisión limpia vigente.
