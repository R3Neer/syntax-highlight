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

Primera revisión limpia del plan actual. Se validó el orden engine/resolver → semantic ranges → consumidores → retirada taxonomía antigua → CSS, con CI existente entre cortes y sin tests nuevos antes del TM de implementación.

## Revisión 4

Resultado: SIN CAMBIOS.

Segunda revisión limpia, centrada en failure modes y límites de alcance:

- el wrapper conserva estado/capabilities del StreamParser;
- multiple styles pueden mezclar nombres declarados y públicos;
- unknown styles fallan localmente;
- CRLF/newline final se resuelven antes del mapping Markdown;
- exports antiguos pueden sobrevivir temporalmente durante una migración parcial;
- la surface negra no depende de detectar theme light/dark;
- routing rendered, scanner de bloques, Smart Editing, contrast manager y configured profiles quedan fuera del alcance;
- el routing oficial se decide únicamente en el gate fresco posterior.

No se encontró modificación necesaria.

Revisiones **3 y 4 son consecutivas sin cambios**: el plan de implementación de Fase 2 queda estabilizado según TM y se autoriza producción.