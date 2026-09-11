# Reconciliación temporal de planes · Fase 0D

Estado: TEMPORAL. Eliminar al terminar implementación + tests del ciclo.

## Fuente de verdad efectiva

Para Fase 0D, el plan efectivo pasa a ser:

- `phase-0d-analysis.md` para el análisis focalizado;
- `phase-0d-plan.md` para arquitectura + plan de instrumentación;
- `phase-0d-plan-review.md` para su TM.

`phase-0d-plan.md` quedó ESTABLE según TM con revisiones 2 y 3 consecutivas sin cambios antes de la implementación manual post-frame.

## Plan alternativo supersedido

Los documentos:

- `phase-0d-architecture-plan.md`;
- `phase-0d-architecture-plan-review.md`;
- `phase-0d-implementation-plan.md`;
- `phase-0d-implementation-plan-review.md`;

recogen una alternativa posterior más compleja basada en `MutationObserver`, lifecycle global, batching y deduplicación. Esa alternativa fue útil para detectar riesgos conceptuales (ranges reemplazados, `clear()` vs dedup, rango físico completo), pero deja de gobernar la implementación de Fase 0D.

Motivo: durante la implementación apareció una solución diagnóstica más simple y suficiente para el objetivo de esta fase: registro de `EditorView` vivos + captura manual explícita + espera de dos `requestAnimationFrame` + snapshot del DOM final. Al ser una herramienta temporal y manual, esta solución elimina por construcción los problemas de observer, deduplicación y protocolo `clear()` que el diseño alternativo intentaba resolver.

## Por qué no se considera un salto de plan

La arquitectura manual no apareció sin revisión: existe en `phase-0d-plan.md`, fue revisada iterativamente y alcanzó dos revisiones consecutivas sin cambios antes de sus commits de implementación. Por tanto no se adopta una implementación huérfana de plan; se elige entre dos planes temporales el que ya estaba estabilizado y que coincide con el código real.

## Requisitos del plan alternativo que siguen siendo útiles

Aunque quede supersedido, se conservan como criterios de revisión de la implementación manual:

- no inferir fidelidad de Obsidian desde un `EditorView` aislado;
- capturar rangos reemplazados mediante hosts embedded además de `.cm-line`;
- no abortar otras vistas si una falla;
- atributos allowlisted y sin rutas/URLs;
- errores locales fail-soft;
- no tocar CSS/parser/presentation/contraste durante 0D;
- registrar suficiente información para discriminar materialización, ancestry y contraste.

No se exige implementar observer, dedup, `capture()` genérico, `visibleRanges` o `domAtPos()` si la captura manual actual obtiene la misma evidencia de forma más directa mediante `.cm-line` + `posAtDOM` y `.cm-embed-block`.

## Consecuencia

La siguiente fase no modifica más planes de 0D salvo que la revisión de implementación demuestre una carencia que impida la captura real. Se continúa revisando la implementación existente contra `phase-0d-plan.md` y los criterios útiles anteriores.

## Revisión de reconciliación 1

Resultado: SIN CAMBIOS.

Se contrastaron ambos planes con el objetivo único de 0D. La captura manual doble-rAF cubre el gate real sin lifecycle diagnóstico persistente y reduce superficie temporal. No se encontró un requisito imprescindible del diseño observer que la solución manual necesite para obtener la evidencia prevista.
