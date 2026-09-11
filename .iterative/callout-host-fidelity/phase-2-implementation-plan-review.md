# Revisión TM temporal · plan de implementación Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se reconcilió el plan con la arquitectura finalmente estabilizada: highlighter único con `tagHighlighter`, estado stream explícito, resolver/nombres sintéticos, preservación completa del parser, scanner físico completo, `invalid`, retirada `cm-*`/`token *`, paleta dark completa y SourceView nativo. Los pares limpios anteriores quedaron invalidados.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Se fijó el layering para evitar ciclo:

- `common-languages.ts` aloja catálogo, engines, highlighter, resolver stream y `effectiveStreamParser`;
- `common-semantic-ranges.ts` importa esa capa y nunca al revés;
- nombres sintéticos deterministas;
- guard no-progress se reinicia al avanzar el stream.

No cuenta como revisión limpia.

## Revisión 3

Resultado: SIN CAMBIOS.

Primera revisión limpia del plan actual, centrada en orden de migración y reversibilidad:

- engine/highlighter/resolver nacen antes que semantic ranges;
- semantic ranges se introducen antes de retirar la ruta anterior;
- Reading y Markdown source migran después de que la autoridad pura compile;
- SourceView conserva parser incremental nativo y cambia solo helper/highlighter;
- `cm-*`/`token *` se retiran solo cuando ya no tienen consumidores manuales;
- CSS dark se aplica sobre la taxonomía propia ya establecida;
- cada corte conserva CI existente antes de avanzar;
- tests nuevos siguen reservados para después del TM de implementación;
- no hay migración persistente de settings/manifest ni datos que requiera fase adicional.

No se encontró modificación necesaria. Esta es la primera revisión limpia del estado actual.