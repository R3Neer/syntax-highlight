# Revisión TM temporal · plan de implementación Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

El plan existente había quedado por detrás de la arquitectura finalmente estabilizada.

Se reconciliaron explícitamente:

- `COMMON_SEMANTIC_HIGHLIGHTER` construido con `tagHighlighter()` en lugar de highlighters host-specific;
- engine stream con estado inicial explícito;
- resolver efectivo con precedencia `parser.tokenTable > engine.tokenTags > tags públicos`;
- nombres sintéticos para no depender de aliases legacy internos de `StreamLanguage`;
- preservación del contrato público completo del `StreamParser`;
- scanner LF/CRLF/source vacío/newline final/zero-length;
- `tags.invalid -> syntax-common-invalid`;
- retirada de `cm-*`/`token *` de la taxonomía manual;
- paleta dark quoted completa, incluido `important` e `invalid`, con contraste comprobable;
- SourceView conservando la ruta nativa `commonLanguageSupport + syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER)`;
- tests nuevos reservados para después del TM de implementación.

Los pares limpios anteriores quedaron invalidados por estos cambios.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Se detectó un riesgo de ciclo de módulos si la resolución stream efectiva vivía en `common-semantic-ranges.ts` y `common-languages.ts` necesitaba importarla para construir `StreamLanguage`.

Corrección operativa:

- `common-languages.ts` queda como capa inferior y autoridad de catálogo, engines, highlighter, resolución de style words, nombres sintéticos y `effectiveStreamParser`;
- `common-semantic-ranges.ts` importa esa autoridad y ejecuta tree/stream/plain manual;
- `common-languages.ts` nunca importa `common-semantic-ranges.ts`;
- nombres sintéticos se generan de forma determinista a partir de un orden estable de claves.

También se precisó que el guard de tokens sin avance se reinicia cuando `StringStream` progresa.

No cuenta como revisión limpia.

Los pares limpios registrados en la versión anterior de este documento ya no son válidos porque precedían a las Revisiones 1–2 actuales.