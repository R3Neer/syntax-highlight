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

- `SyntaxSourceView` conserva `common.support() + syntaxHighlighting()`;
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

La siguiente revisión se hace sobre el plan corregido completo. Esta revisión no cuenta como limpia.
