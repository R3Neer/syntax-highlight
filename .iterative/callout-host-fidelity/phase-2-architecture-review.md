# Revisión TM temporal · arquitectura Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se revisó el plan contra la documentación oficial actual de Obsidian y CodeMirror/Lezer, más la evidencia del gate real.

### Cambio A · no copiar aliases internos de StreamLanguage

El primer plan proponía resolver manualmente la tabla legacy interna que la implementación actual de `StreamLanguage` usa para nombres como `variable` o `builtin`.

Eso era innecesariamente frágil: la API pública de `StreamParser` documenta que `token()` devuelve nombres de tags públicos o nombres definidos en `tokenTable`, pero la tabla de aliases legacy concreta pertenece a la implementación de CodeMirror, no a un contrato que debamos replicar.

Corrección:

- cada `CommonLanguage` stream-backed puede declarar una tabla explícita style -> `Tag`/`Tag[]` usando tags públicos;
- PowerShell declara junto a su engine los styles que realmente devuelve (`variable`, `number`, `operator`, `builtin`, `punctuation`, `string`, `comment`, `keyword`, `error`);
- el resolver genérico usa esa tabla, `parser.tokenTable` público y nombres/modificadores públicos de `tags`;
- no existe una rama de renderer PowerShell ni una copia de la tabla privada de CodeMirror.

### Cambio B · no reinventar parsing incremental en SyntaxSourceView

El primer plan pretendía sustituir también el highlighting stream de `SyntaxSourceView` por un ViewPlugin manual.

El gate no incrimina esa ruta y CodeMirror documenta precisamente `StreamLanguage + syntaxHighlighting()` como adaptación oficial de modos stream cuando CodeMirror posee el EditorView completo.

Corrección:

- `SyntaxSourceView` conserva la ruta nativa `LanguageSupport + syntaxHighlighting()`;
- solo cambia al highlighter semántico único `syntax-common-*`;
- la extracción stream directa se limita a los caminos manuales de Markdown/Reading donde hoy falla `StreamLanguage tree -> highlightTree`.

### Cambio C · contrato exacto del scanner stream

Se añadió al plan:

- offsets correctos para LF/CRLF/última línea;
- `blankLine` en líneas vacías;
- defaults CodeMirror para `tabSize`/`indentUnit` cuando no hay EditorState;
- soporte para múltiples styles;
- guard propio contra tokens de longitud cero que no avancen;
- fallo local de styles no resolubles, nunca aborto del bloque.

### Evidencia oficial usada

- Obsidian: decorations mediante ViewPlugin para trabajo limitado al viewport; CSS variables para styling de elementos propios.
- CodeMirror: `StreamParser`, `StringStream`, `tokenTable`, `HighlightStyle` y `Highlighter.style(tags)` son APIs públicas documentadas.

No cuenta como revisión limpia.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Se revisó la coherencia entre metadata de lenguaje, soporte CodeMirror y el requisito visual real del quoted source.

### Cambio A · engine y support no pueden ser fuentes paralelas

El plan corregido todavía permitía `support()` por un lado y engine stream por otro. Eso podía volver a introducir dos configuraciones del mismo lenguaje.

Corrección:

- el engine de `CommonLanguage` pasa a ser la fuente de verdad;
- tree-backed contiene su factory de support;
- stream-backed contiene `StreamParser + tokenTags`;
- un helper único `commonLanguageSupport()` construye el `LanguageSupport` de ambos engines;
- para stream-backed se crea un parser efectivo sin mutar el importado y se incorpora la misma tabla pública token -> tag que usa la extracción manual.

Así CodeMirror nativo y semantic ranges manuales comparten exactamente la misma metadata declarativa.

### Cambio B · la línea negra no basta si el host conserva furniture inline

Las capturas reales muestran fondos tipo inline-code dentro del quoted source. Pintar únicamente la `.cm-line` de negro podría dejar rectángulos claros encima.

No se añadirán selectores `.cm-inline-code` ni otros internals. La documentación oficial de Obsidian confirma que `--code-background` y `--code-normal` son variables públicas de código, y además señala expresamente que Editing y Reading usan librerías de syntax highlighting distintas y su styling puede no coincidir perfectamente.

Corrección arquitectónica:

- la line decoration propia mantiene su fondo con `--syntax-editor-code-background`;
- dentro de ese scope se redefine `--code-background: transparent` para que furniture host que consuma la variable se integre en la surface;
- `--code-normal` y `--caret-color` se redirigen a foreground/caret propios y legibles;
- no usar `!important` ni selector privado;
- roles `syntax-common-*` siguen usando variables públicas/fallbacks propios.

Esto usa precisamente la interfaz de CSS variables que Obsidian documenta, sin pretender conocer la estructura DOM interna que las consume.

No cuenta como revisión limpia.
