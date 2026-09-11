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

Primera revisión limpia del plan completo ya corregido.

Se contrastó específicamente con APIs oficiales:

- `StreamParser`, `StringStream`, `tokenTable` y el contrato de `token()` son públicos;
- `HighlightStyle` puede emitir clases estáticas y `Highlighter.style(tags)` es público;
- `syntaxHighlighting()` consume el mismo highlighter en EditorViews propios;
- Obsidian recomienda ViewPlugin cuando las decorations pueden limitarse al viewport;
- Obsidian documenta `--code-background`, `--code-normal` y la familia `--code-*` para styling de código;
- la propia documentación de Obsidian advierte que Editing y Reading usan librerías de highlighting distintas, lo que respalda dejar de usar dos taxonomías host-specific para nuestros ranges manuales.

Se revisó además que la surface negra no imita un selector interno: es styling propio sobre líneas marcadas por nuestra Decoration.line y solo redefine variables públicas dentro de ese scope.

No se encontró modificación necesaria. Es la primera revisión limpia del estado actual.
