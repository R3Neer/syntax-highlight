# Revisión TM temporal · arquitectura Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Cambios principales:

- no copiar aliases internos de `StreamLanguage`; usar metadata explícita style → Tag y API pública;
- conservar `SyntaxSourceView` en la ruta oficial `StreamLanguage + syntaxHighlighting()` en vez de inventar un parser incremental manual;
- fijar offsets LF/CRLF, blankLine, múltiples styles y guard de tokens sin avance.

No cuenta como revisión limpia.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Cambios principales:

- el engine de `CommonLanguage` pasa a ser también la fuente de verdad para construir `LanguageSupport`; ya no puede existir un `support()` paralelo que diverja;
- `commonLanguageSupport()` crea tree/stream support desde la misma metadata usada por la extracción manual;
- quoted source integra furniture interno del host mediante variables públicas de código (`--code-background`, `--code-normal`, `--caret-color`) scoped a nuestra line decoration, sin selectores privados ni `!important`;
- la propia surface conserva variables `--syntax-*` y fondo negro explícito solicitado por producto.

La documentación oficial de Obsidian confirma que `--code-background` y la familia `--code-*` son la interfaz pública de styling para código y advierte que Editing/Reading usan librerías de highlighting distintas.

No cuenta como revisión limpia.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

La arquitectura todavía no fijaba precedencia si un futuro `StreamParser` define `parser.tokenTable` y el engine de Syntax Highlight aporta una entrada con la misma clave.

Corrección:

1. `parser.tokenTable` explícito del autor del parser tiene prioridad;
2. `engine.tokenTags` rellena nombres no definidos por el parser;
3. después se intentan nombres/modificadores públicos de `tags`;
4. desconocidos fallan localmente.

La misma tabla efectiva y la misma precedencia alimentan `effectiveStreamParser` y el resolver manual, evitando divergencia entre CodeMirror nativo y semantic ranges manuales.

No cuenta como revisión limpia. La siguiente revisión se realiza sobre el plan completo ya corregido.
