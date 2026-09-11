# Revisión TM temporal · arquitectura Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

- no copiar aliases internos de `StreamLanguage`; metadata explícita style → Tag y API pública;
- conservar `SyntaxSourceView` en la ruta oficial `StreamLanguage + syntaxHighlighting()`;
- fijar LF/CRLF, blankLine, múltiples styles y guard de tokens sin avance.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

- engine y `LanguageSupport` pasan a compartir una única metadata;
- `commonLanguageSupport()` construye tree/stream support;
- quoted source integra furniture host mediante variables públicas de código scoped, sin selectores privados ni `!important`;
- surface propia mantiene fondo negro explícito y variables `--syntax-*`.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

Se fijó precedencia de tablas stream:

1. `parser.tokenTable`;
2. `engine.tokenTags` como relleno;
3. nombres/modificadores públicos de `tags`;
4. desconocidos fallan localmente.

La misma tabla efectiva alimenta `effectiveStreamParser` y extracción manual.

## Revisión 4

Resultado: SIN CAMBIOS.

Primera revisión limpia. Se contrastó el plan completo contra las APIs oficiales de StreamParser/StringStream/Highlighter, ViewPlugin y las variables CSS documentadas de código en Obsidian. No se encontró modificación necesaria.

## Revisión 5

Resultado: SIN CAMBIOS.

Segunda revisión limpia, centrada en failure modes y portabilidad:

- estado multilinea, CRLF, blank lines y token sin avance tienen contrato explícito;
- un stream parser con `tokenTable` propio conserva su autoridad;
- style desconocido falla localmente;
- no se asume soporte nativo top-level de todos los common languages;
- SourceView mantiene la ruta nativa de CodeMirror y no se reinventa parsing incremental;
- la surface negra usa únicamente decorations + variables CSS scoped y no introduce APIs desktop-only;
- themes/snippets pueden sobrescribir variables `--syntax-*` sin ramas por tema;
- la metadata de PowerShell es declarativa y el renderer sigue agnóstico.

No se encontró modificación necesaria.

Revisiones **4 y 5 son consecutivas sin cambios**: el plan arquitectónico de Fase 2 queda estabilizado según TM y se autoriza crear el plan de implementación con checkboxes.
