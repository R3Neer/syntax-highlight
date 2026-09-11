# Plan arquitectónico temporal · Fase 2 · semántica common + source dark

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Este documento es la arquitectura vigente de Fase 2. Sustituye las iteraciones anteriores del mismo plan después de que la revisión de implementación detectara que variables `--code-*` válidas para un papel claro pueden tener contraste insuficiente sobre la surface negra propia del plugin.

## 1. Invariantes heredados de Fase 1

- CodeMirror/Lezer host se externalizan según la frontera oficial ya adoptada.
- Live Preview source se modifica solo mediante editor extensions/decorations.
- No se muta DOM gestionado por CodeMirror.
- No se depende funcionalmente de `.cm-embed-block`, `.cm-callout`, `HyperMD-codeblock*` ni otras clases privadas del host.
- Rendered usa APIs Markdown soportadas; no se reintroduce bridge DOM/MutationObserver.
- `CommonContrastManager` solo modifica DOM rendered propio (`.syntax-highlight-frame`).
- `blocks.ts`, quote mapping, presentation, Smart Editing, configured tokenizers y build boundary permanecen fuera del alcance salvo imports/tipos inevitables.

## 2. Engine common como fuente de verdad

`CommonLanguage` tiene un engine discriminado:

- `tree`: factory de `LanguageSupport` para gramáticas Lezer modernas;
- `stream`: `StreamParser` público + tabla declarativa style → `Tag | Tag[]`;
- `plain`: sin parser.

`commonLanguageSupport(language)` construye el support desde ese mismo engine. No existe un `support()` paralelo capaz de divergir.

PowerShell es stream-backed; Bash/Nushell y demás parsers modernos son tree-backed; Text es plain.

`StreamParser.startState` se respeta como API opcional: se delega cuando existe y se usa estado trivial si no.

## 3. Highlighter semántico único

Existe una única tabla Tag → clase propia:

`COMMON_SEMANTIC_HIGHLIGHTER`

Solo emite `syntax-common-*`.

Se usa con:

- `highlightTree()` para tree-backed manual;
- `Highlighter.style(tags)` para stream-backed manual;
- `syntaxHighlighting()` en EditorViews propios como `SyntaxSourceView`.

Los caminos manuales dejan de emitir Prism `token *` y clases `cm-*`.

## 4. Engine stream directo para manual highlighting

Los caminos manuales Reading/Markdown source no convierten primero un `StreamParser` en árbol `StreamLanguage` para volver a extraer tags.

Usan únicamente API pública:

- `StreamParser`;
- `StringStream`;
- `token`, `startState`, `blankLine`, `tokenTable`;
- `tags` públicos;
- `Highlighter.style(tags)`.

El scanner procesa el source en orden y conserva estado multilinea.

### Offsets/líneas

- LF y CRLF conservan offsets físicos del string original.
- Última línea sin terminador se procesa.
- Línea vacía física dentro del rango llama `blankLine` si existe.
- Source vacío y la línea virtual posterior a un terminador final siguen el límite actual de `StreamLanguage`: no inventan una llamada adicional a `blankLine`.
- Tokens de longitud cero disponen de guard finito para evitar loops.

## 5. Resolución de styles stream

Precedencia:

1. `parser.tokenTable` del autor del parser;
2. `engine.tokenTags` declarativo;
3. nombres/modificadores públicos de `tags`;
4. desconocido: fallo local, sin abortar el bloque.

PowerShell declara explícitamente al menos:

- `variable` → `tags.variableName`;
- `number` → `tags.number`;
- `operator` → `tags.operator`;
- `builtin` → `tags.standard(tags.variableName)`;
- `punctuation` → `tags.punctuation`;
- `string` → `tags.string`;
- `comment` → `tags.comment`;
- `keyword` → `tags.keyword`;
- `error` → `tags.invalid`.

No existe rama de renderer por `language.id === "powershell"`.

### Support nativo y aliases legacy

`StreamLanguage` inicializa internamente su tabla legacy antes de consultar `tokenTable` extra. Para que nombres explícitos como `variable` usen nuestra metadata también en `SyntaxSourceView`, `effectiveCommonStreamParser()` reescribe exclusivamente los styles cubiertos por nuestra tabla efectiva a nombres sintéticos únicos y los publica mediante la API pública `tokenTable`.

No se copia ni consulta la tabla legacy interna; los nombres sintéticos evitan depender de ella.

El resolver sintético se compila/cachea una vez por engine.

## 6. Autoridad única de semantic ranges manuales

`common-semantic-ranges.ts` es puro, sin DOM/EditorView/Obsidian:

```text
CommonLanguage + source
  ├─ tree   -> highlightTree
  ├─ stream -> StreamParser directo
  └─ plain  -> plain ranges
             ↓
       CommonSemanticRange[]
```

Consumidores:

- `renderCommonCode()`;
- `buildEditorBlockSemantics()`.

`SyntaxSourceView` conserva la ruta nativa de CodeMirror:

`commonLanguageSupport() + syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER)`.

## 7. Quoted Live Preview source: surface negra propia

La surface de quoted source es propiedad del plugin. No intenta clonar el bloque nativo mediante selectores privados.

Fallbacks propios, heredables/overridables desde un ancestro:

- background: `var(--syntax-editor-code-background, #000)`;
- foreground: `var(--syntax-editor-code-color, #d4d4d4)`;
- caret: `var(--syntax-editor-code-caret, #d4d4d4)`.

Opening/body/closing comparten surface; presentation alignment/flow sigue solo en body.

## 8. Paleta dark-safe y variables públicas del host

### Problema demostrado

Una variable pública de un theme puede ser perfectamente válida y aun así estar diseñada para un fondo claro. En el theme usado durante el gate real, por ejemplo:

- `--code-property: rgb(51,77,190)` tiene contraste aproximado 2.95:1 sobre negro;
- `--code-value: rgb(161,83,170)` ronda 4.33:1.

Por tanto el orden `own var -> theme --code-* -> literal dark-safe` no garantiza legibilidad sobre una surface negra propia.

### Regla arquitectónica corregida

Dentro de `.cm-line.syntax-editor-code-source`, Syntax Highlight redefine la familia pública de variables de código relevante hacia su **paleta dark-safe propia**, usando siempre:

`--syntax-common-<role>` heredable → literal dark-safe.

Al menos:

- `--code-background: transparent`;
- `--code-normal`;
- `--code-comment`;
- `--code-function`;
- `--code-important`;
- `--code-keyword`;
- `--code-string`;
- `--code-value`;
- `--code-operator`;
- `--code-property`;
- `--code-punctuation`;
- `--code-tag`;
- `--caret-color`.

Esto cumple dos objetivos a la vez:

1. nuestros `syntax-common-*` consumen una paleta compatible con el fondo que nosotros controlamos;
2. cualquier furniture interno del host que consuma variables públicas de código hereda la misma paleta, sin saber qué clases DOM usa.

No se seleccionan `.cm-inline-code` ni otras clases privadas. No se usa `!important`.

Themes/snippets que quieran cambiar la surface pueden definir nuestras variables `--syntax-editor-code-*` / `--syntax-common-*` en un ancestro.

### Contraste

Los fallbacks literales de texto semántico ordinario deben alcanzar al menos 4.5:1 sobre el negro por defecto. Line numbers/furniture deben usar un fallback claramente legible y no depender de `--text-faint` del theme claro.

`syntax-common-invalid` bajo quoted source usa un fallback dark-safe propio, no `--text-error` del theme como autoridad final.

## 9. Rendered / Reading

`renderCommonCode()` consume `CommonSemanticRange[]` y conserva su estructura DOM actual. No añade Prism classes.

Themes pueden seguir influir mediante variables públicas fuera de quoted source, pero la taxonomía semántica es siempre `syntax-common-*`.

## 10. Routing rendered

El resultado diagnóstico vacío del gate anterior no falsifica todavía el processor oficial porque diagnostics se habilitó sobre un widget posiblemente ya materializado/cacheado.

Esta fase **no cambia routing rendered**.

El próximo gate habilita diagnostics antes de crear/modificar el subtree y fuerza render fresco:

- si aparece `reading-specialized`, la premisa Fase 1 queda confirmada;
- si la única ruta funcional es `reading-fallback`, se detiene limpieza y se reabre análisis arquitectónico específico de routing.

## 11. Criterios de aceptación

La implementación final debe conservar simultáneamente:

1. engine/support como única metadata por lenguaje;
2. solo APIs públicas stream;
3. PowerShell corregido por engine genérico, no renderer especial;
4. tree parsers sin cambios accidentales;
5. manual common solo `syntax-common-*`;
6. SourceView por ruta CodeMirror nativa;
7. scanner fiel en estado/offsets/blank lines;
8. quoted source negro y sobrescribible;
9. **toda variable pública de código relevante queda remapeada a una paleta dark-safe dentro de nuestra surface**;
10. sin private selectors, `!important` ni branch por theme;
11. ownership DOM de Fase 1 intacto;
12. routing rendered intacto hasta evidencia fresca;
13. scope limitado a common semantic engine/consumidores/SourceView/CSS/tests.
