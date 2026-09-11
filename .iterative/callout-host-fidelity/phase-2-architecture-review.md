# Revisión TM temporal · arquitectura Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

- separar engine tree/stream/plain explícitamente;
- no copiar aliases internos de `StreamLanguage`;
- conservar `SyntaxSourceView` sobre la ruta nativa `StreamLanguage + syntaxHighlighting()` en vez de sustituirla por un parser manual.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

La tabla semántica dejó de modelarse como `HighlightStyle` host-specific y pasó a un único `Highlighter` creado mediante la API pública `tagHighlighter()`. Ese mismo highlighter se usa en `highlightTree`, scanner stream y `syntaxHighlighting()`.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

- se explicitó que Obsidian documenta motores de highlighting diferentes en Editing/Reading y no se promete identidad visual pixel-perfect con highlighting nativo top-level;
- se cerró la semántica física de LF/CRLF/terminador final para no crear una blank line sintética.

## Revisión 4

Resultado: CAMBIOS NECESARIOS.

Una simple fusión de `tokenTable` todavía podía depender de la precedencia interna de aliases legacy de `StreamLanguage`.

Corrección: `effectiveStreamParser.token()` reescribe styles cubiertos por `parser.tokenTable`/`engine.tokenTags` a nombres sintéticos privados y los publica por el `tokenTable` efectivo. El scanner manual usa el mismo resolver. La precedencia queda en Syntax Highlight pero se implementa exclusivamente por API pública.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

`StreamParser.startState` es opcional en la API pública y su fallback interno no es un contrato que el scanner manual deba copiar.

Corrección: un engine stream manualmente escaneable exige estado inicial explícito. PowerShell ya lo aporta. `startState` y `StringStream` reciben un `indentUnit` explícito y coherente.

## Revisión 6

Resultado: CAMBIOS NECESARIOS.

Una surface negra fija no puede heredar ciegamente una paleta de theme light.

Corrección: paleta dark plugin-owned, sobrescribible mediante variables propias y con defaults contrastados sobre negro. Bajo la línea quoted, las variables públicas `--code-*` se reasignan a esa paleta para integrar furniture del host sin selectores privados ni `!important`.

## Revisión 7

Resultado: CAMBIOS NECESARIOS.

El wrapper stream debe preservar todo el contrato público ajeno al styling.

Corrección: conservar/delegar `name`, `startState`, `copyState`, `blankLine`, `indent`, `languageData`, `mergeTokens` y demás campos públicos aplicables, sustituyendo únicamente `token()`/`tokenTable` en la frontera de styles.

## Revisión 8

Resultado: SIN CAMBIOS.

Primera revisión limpia del plan actual.

Se contrastó de nuevo contra documentación oficial de Obsidian y CodeMirror/Lezer y contra los módulos actuales del adapter:

- ViewPlugin/decorations mantienen ownership correcto y trabajo por viewport;
- styling propio se apoya en variables CSS y no muta DOM;
- `tagHighlighter`, `Highlighter.style`, `syntaxHighlighting`, `StreamParser`, `StringStream` y `tokenTable` son APIs públicas suficientes;
- nombres sintéticos no dependen de aliases/NodeProps/TokenTable internos;
- wrapper conserva capacidades no relacionadas con highlighting;
- scanner conserva offsets/estado y no inventa blank final;
- SourceView mantiene parser incremental oficial;
- no se reabre routing rendered sin evidencia fresca;
- no se intenta suprimir highlighting nativo mediante internals o `!important`.

No se encontró cambio necesario. Esta es la primera revisión limpia del estado actual; los pares limpios anteriores a las Revisiones 4–7 quedan invalidados por los cambios posteriores.