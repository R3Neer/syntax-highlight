# Plan arquitectónico temporal · Fase 2 · semántica common + source dark

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Este documento define la arquitectura posterior al gate real fallido de Fase 1. El orden operativo y los checkboxes vivirán en un segundo plan temporal cuando este quede estable según TM.

## 1. Autoridad e invariantes conservados

Autoridad: documentación/API oficial de Obsidian → API oficial CodeMirror/Lezer → evidencia de Obsidian real → tests lógicos.

Se conservan los invariantes válidos de Fase 1:

- runtime CodeMirror/Lezer del host externalizado;
- Live Preview source solo mediante editor extensions/decorations;
- ninguna mutación DOM de CodeMirror;
- ninguna dependencia funcional de `.cm-embed-block`, `.cm-callout` o `HyperMD-codeblock*`;
- rendered mediante APIs Markdown soportadas;
- contraste JS solo sobre `.syntax-highlight-frame` propio;
- `blocks.ts`, quote mapping, presentation y Smart Editing permanecen autoridades actuales salvo adaptación de tipos estrictamente necesaria;
- ViewPlugin sigue limitando materialización/trabajo caro al viewport.

La documentación de Obsidian recomienda decorations desde ViewPlugin cuando el trabajo puede limitarse al viewport y CSS variables para styling de elementos propios. Esta fase mantiene ambas reglas.

La documentación oficial de variables CSS de Obsidian confirma además `--code-background`, `--code-normal`, `--code-comment`, `--code-function`, `--code-keyword`, `--code-operator`, `--code-property`, `--code-punctuation`, `--code-string`, `--code-tag` y `--code-value` como variables públicas de código, y advierte expresamente que Editing y Reading usan sistemas de syntax highlighting distintos y pueden no coincidir visualmente. La arquitectura no intenta fingir que son el mismo sistema: unifica únicamente nuestra taxonomía propia.

## 2. El engine de `CommonLanguage` es la fuente de verdad

`CommonLanguage` tendrá un engine discriminado o equivalente:

1. **tree-backed**: factory de `LanguageSupport`/lenguaje Lezer;
2. **stream-backed**: `StreamParser` público con estado inicial explícito + tabla declarativa style → `Tag | Tag[]`;
3. **plain**: sin parser.

No habrá un `support()` paralelo capaz de divergir del engine.

Para que el scanner manual no dependa del valor interno que `StreamLanguage` usa cuando `StreamParser.startState` falta, el engine stream exige una de estas dos formas equivalentes a nivel de tipos:

- parser cuyo `startState(indentUnit)` esté presente; o
- wrapper declarativo del engine que aporte una factoría de estado inicial explícita.

PowerShell ya expone `startState`, así que no necesita excepción. Un futuro parser stateless sin `startState` deberá declararse mediante un wrapper explícito en el catálogo; no se inventará un estado genérico dentro del scanner.

Un helper único `commonLanguageSupport(language)` devuelve:

- support del engine tree;
- para stream, `LanguageSupport(StreamLanguage.define(effectiveStreamParser))`;
- `undefined` para plain.

`effectiveStreamParser` se crea sin mutar el parser importado. Envuelve únicamente su salida de `token()` y su `tokenTable` mediante APIs públicas para que los styles declarados por el parser/engine tengan una representación inequívoca también dentro de `StreamLanguage`.

PowerShell: stream-backed. Bash y demás gramáticas Lezer: tree-backed. Text: plain.

## 3. Autoridad única de semantic ranges manuales

Crear `common-semantic-ranges.ts` (nombre provisional):

```text
CommonLanguage + source
        |
        +-- tree -----------+
        +-- stream ---------+--> CommonSemanticRange[]
        +-- plain ----------+
```

`CommonSemanticRange` contiene `from`, `to` y clases `syntax-common-*`. Nunca contiene `cm-*` ni `token *`.

Consumidores manuales:

- `renderCommonCode()`;
- `buildEditorBlockSemantics()` de Markdown source.

`SyntaxSourceView` usa `commonLanguageSupport()` y la ruta nativa de CodeMirror, no esta extracción manual.

## 4. Highlighter semántico único

Sustituir `COMMON_READING_HIGHLIGHT_STYLE` y `COMMON_EDITOR_HIGHLIGHT_STYLE` por un único `COMMON_SEMANTIC_HIGHLIGHTER` creado con la API pública `tagHighlighter()` de `@lezer/highlight`.

El highlighter solo emite clases `syntax-common-*`; no crea reglas CSS anónimas ni clases generadas.

Se usa como el mismo objeto `Highlighter` en las tres fronteras:

- `highlightTree(tree, COMMON_SEMANTIC_HIGHLIGHTER)` en tree-backed;
- `COMMON_SEMANTIC_HIGHLIGHTER.style(tags)` en stream-backed;
- `syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER)` en EditorViews propios.

CodeMirror documenta `syntaxHighlighting(highlighter: Highlighter)` y Lezer documenta `tagHighlighter()`/`Highlighter.style()`, por lo que no necesitamos que la fuente de verdad semántica sea un `HighlightStyle` específico de CodeMirror.

Una única tabla tag → rol semántico es fuente de verdad.

## 5. Engine tree-backed

1. obtener support/lenguaje del engine;
2. parsear como hoy;
3. `highlightTree()` con `COMMON_SEMANTIC_HIGHLIGHTER`;
4. devolver ranges puros.

No hay lógica StreamLanguage en esta rama ni cambios a parsers modernos que ya funcionan.

## 6. Engine stream-backed

### 6.1 Solo API pública

Usar exclusivamente:

- `StreamParser` y `StringStream`;
- `startState`, `token`, `blankLine`, `tokenTable`;
- `tags` públicos;
- `Highlighter.style(tags)`.

No leer `StreamLanguage.streamParser`, NodeProps, TokenTable/NodeType internos ni aliases internos.

El cuerpo lógico se recorre desde el principio para preservar estado multilinea.

### 6.2 Tabla declarativa, precedencia y nombres sintéticos

El contrato público permite que `token()` devuelva nombres de tags públicos, nombres de `tokenTable`, modificadores con `.` y varios styles separados por espacios.

Cada engine stream puede aportar `tokenTags` para nombres legacy/no públicos.

PowerShell declara al menos:

- `variable` → `tags.variableName`;
- `number` → `tags.number`;
- `operator` → `tags.operator`;
- `builtin` → `tags.standard(tags.variableName)`;
- `punctuation` → `tags.punctuation`;
- `string` → `tags.string`;
- `comment` → `tags.comment`;
- `keyword` → `tags.keyword`;
- `error` → `tags.invalid`.

Precedencia determinista de Syntax Highlight:

1. `parser.tokenTable` explícito del autor del parser gana si define la clave;
2. `engine.tokenTags` rellena nombres que el parser no haya definido;
3. si ninguna tabla define el nombre, resolver nombres/modificadores públicos existentes en `tags`;
4. style desconocido: fallo local, sin abortar el bloque.

No se confía en la precedencia interna que `StreamLanguage` pueda aplicar a nombres legacy. Para cualquier style cubierto por `parser.tokenTable` o `engine.tokenTags`, `effectiveStreamParser` reescribe el nombre devuelto por `token()` a un nombre sintético estable que no colisione con vocabulario legacy/público, por ejemplo `syntaxStreamToken0`, y coloca su `Tag | Tag[]` en el `tokenTable` efectivo bajo ese nombre sintético.

Ejemplo conceptual:

```text
parser devuelve "builtin"
        ↓
resolver efectivo → tags.standard(tags.variableName)
        ↓
effectiveStreamParser devuelve "syntaxStreamToken3"
        ↓
tokenTable.syntaxStreamToken3 = tags.standard(tags.variableName)
```

Si un style no está en ninguna tabla y ya usa el vocabulario público (`number`, `variableName.standard`, etc.), se conserva sin reescritura.

Los múltiples style names de una devolución se resuelven palabra a palabra con la misma precedencia. El scanner manual usa exactamente el mismo resolver, de modo que SourceView/StreamLanguage y semantic ranges manuales no pueden divergir por aliases internos.

Los nombres sintéticos son detalle privado de construcción del parser efectivo, no parte del DOM, CSS ni API pública del plugin.

### 6.3 Scanner por líneas y offsets

Debe preservar:

- LF, CRLF y última línea sin terminador;
- `StringStream` recibe solo el contenido de la línea;
- ranges desplazados por el offset real de la línea;
- `blankLine(state, indentUnit)` únicamente para líneas vacías físicas reales;
- defaults deterministas sin EditorState: `tabSize=4`, `indentUnit=2`;
- el mismo `indentUnit` se pasa tanto a la factoría de estado inicial como a `StringStream`;
- opciones explícitas cuando un caller tenga state/configuración propia.

Semántica de terminadores:

- `a\nb` → dos líneas;
- `a\nb\n` → dos líneas terminadas; no se sintetiza una tercera línea vacía;
- `a\n\nb` → sí existe una línea vacía intermedia y se llama `blankLine`;
- source vacío → no inventa token ni `blankLine`;
- `\r\n` se trata como un terminador único, pero el siguiente offset físico avanza dos caracteres.

Como `token()` puede hacer pasos de longitud cero si cambia estado, habrá un guard finito propio contra loops sin avance, sin copiar helpers internos.

El scanner no altera ni normaliza el source antes de tokenizar: los offsets emitidos siempre están expresados en las coordenadas del string recibido.

### 6.4 Sin renderer PowerShell

No habrá `if (language.id === "powershell")` en Reading/editor rendering. PowerShell solo difiere declarativamente por su engine/parser/tokenTags.

## 7. Una sola taxonomía visual manual

Los manual ranges emiten solo `syntax-common-*`.

Se eliminan nuestras clases manuales `cm-*` y `token *`, porque Obsidian documenta que Editing y Reading usan librerías de syntax highlighting diferentes y su styling puede diferir. La evidencia Bash confirmó precisamente esa divergencia.

CSS propio integra themes mediante variables públicas `--code-*`/`--color-*`; configured profiles no cambian.

### 7.1 Límite deliberado de equivalencia visual

La garantía de Syntax Highlight es que **sus** caminos manuales (quoted source y rendered/Reading) asignan la misma categoría `syntax-common-*` a la misma semántica.

No se garantiza identidad pixel-perfect con highlighting nativo top-level que Obsidian o un theme añadan por su cuenta. Un theme puede aplicar reglas propias —incluso `!important`— a las clases nativas del host. La documentación oficial ya advierte que Editing y Reading pueden no coincidir.

Por tanto:

- no se elimina el highlighting nativo del host;
- no se detectan sus clases privadas;
- no se usa `!important` para ganarle una guerra de especificidad;
- el gate exige semántica propia correcta y legible donde somos responsables, no igualdad visual exacta entre dos motores ajenos distintos.

## 8. Markdown Live Preview source

`commonSemanticRanges()` produce semántica y `mapCodeBlockRange()` mantiene mapping físico.

El modelo/caché por bloque visible de Fase 1 se conserva.

No se desactiva la garantía manual en top-level: Obsidian no garantiza soporte nativo para todos nuestros common languages. Nuestros marks `syntax-common-*` coexisten con los del host sin detectar internals.

En top-level, si el host aporta simultáneamente su propio highlighting, ambos sistemas pueden coexistir. Las pruebas lógicas verifican nuestros ranges/clases; el gate visual no interpreta diferencias de color causadas exclusivamente por reglas nativas del host como fallo de nuestra taxonomía.

## 9. SyntaxSourceView

Conservar la ruta oficial CodeMirror:

```text
commonLanguageSupport(language)
+ syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER)
```

También para stream-backed.

No se reinventa parsing incremental. Si un gate posterior demuestra fallo específico de esta ruta, se abrirá análisis separado.

## 10. Quoted source: surface dark propia

### 10.1 Surface

No clonar Nier ni ningún tema con selectores privados.

El requisito del producto es fondo negro, por lo que los fallbacks finales de la surface plugin-owned son explícitos:

```css
background-color: var(--syntax-editor-code-background, #000);
color: var(--syntax-editor-code-color, #d4d4d4);
caret-color: var(--syntax-editor-code-caret, #d4d4d4);
```

Un theme/snippet puede sobrescribir estas variables propias en un scope superior o más específico sin conocer internals.

No se define una custom property mediante autorreferencia (`--x: var(--x, ...)`); el literal es únicamente fallback de consumo.

### 10.2 Integrar furniture interno del host mediante variables públicas

La documentación oficial confirma `--code-background`, `--code-normal` y la familia `--code-*` como variables públicas para código, y `--caret-color` como variable pública de caret.

Dentro de `.cm-line.syntax-editor-code-source` se redefinen variables, no clases internas:

```css
--code-background: transparent;
--code-normal: var(--syntax-editor-code-color, #d4d4d4);
--caret-color: var(--syntax-editor-code-caret, #d4d4d4);
```

La propia línea usa `--syntax-editor-code-background`, así que neutralizar `--code-background` solo evita rectángulos claros de descendants/furniture que consuman esa variable.

No usar `!important`, `.cm-inline-code` ni `HyperMD-*`.

### 10.3 Roles legibles sobre negro

Dentro de la surface, cada `syntax-common-*` usa:

1. variable propia `--syntax-common-*`;
2. variable pública `--code-*`/`--color-*` apropiada;
3. fallback literal legible.

Plain no cae finalmente a `--text-normal`, porque una theme light podría dar texto oscuro sobre nuestra surface negra.

Opening/body/closing comparten surface; alignment/flow sigue solo en body presentacional.

## 11. Rendered / Reading

`renderCommonCode()` consume `CommonSemanticRange[]` directamente y no añade `token *`.

Se conserva la estructura DOM actual (`syntax-highlight-frame`, badge, line numbers, `syntax-code-line`, `language-* is-loaded`).

Themes influyen mediante variables públicas, no una segunda taxonomía manual.

## 12. Diagnostics y gate rendered

El `[]` anterior no prueba que el processor oficial no se ejecute: diagnostics se activó sobre un widget posiblemente ya materializado/cacheado.

No se modifica routing rendered aún.

Próximo gate:

1. enable diagnostics antes de crear el subtree;
2. forzar creación fresca tras enable;
3. capturar todos los eventos del fence;
4. distinguir `reading-specialized` y `reading-fallback`.

Si aparece `reading-specialized`, Fase 1 queda confirmada. Si la única ruta funcional es `reading-fallback`, se vuelve a análisis arquitectónico antes de limpiar o parchear.

## 13. Módulos previstos

Modificar:

- `common-languages.ts`;
- `editor-block-model.ts`;
- `reading.ts`;
- `source-view.ts` solo para helper/highlighter único;
- `styles.css`;
- tests.

Crear:

- `common-semantic-ranges.ts`.

No tocar salvo imports/tipos inevitables:

- `blocks.ts`;
- `block-presentation.ts`;
- `rendered-code-candidate.ts`;
- `reading-host.ts`;
- `markdown-render-mode.ts`;
- `contrast-manager.ts`;
- `build-runtime.mjs`;
- Smart Editing;
- configured tokenizers.

## 14. Tests exigidos después

- PowerShell stream: variable/number/operator/builtin/string/comment;
- no rama renderer PowerShell;
- stream-backed exige estado inicial explícito; no existe fallback mágico para parser sin `startState`;
- `commonLanguageSupport(PowerShell)` y scanner manual usan el mismo resolver efectivo;
- parser tokenTable gana sobre engine tokenTags incluso si el nombre original coincide con vocabulario legacy, gracias a la reescritura sintética;
- nombres/modificadores públicos y múltiples styles;
- multiline state, blankLine, LF/CRLF, terminador final sin blank fantasma, última línea sin terminador, source vacío y guard zero-length;
- `startState` y `StringStream` reciben el mismo `indentUnit` explícito;
- Bash tree sigue funcionando; Text plain;
- highlighter único creado con `tagHighlighter` funciona en `highlightTree`, stream `.style()` y `syntaxHighlighting()`;
- rendered manual sin `token *`; editor manual sin `cm-*`;
- source view conserva support + syntaxHighlighting con highlighter único;
- quoted source negro, foreground/caret legibles y `--code-background` neutralizado sin selector privado/`!important`;
- gate lógico distingue nuestras categorías de cualquier color nativo adicional del host;
- gate real con creación fresca para routing rendered.

## 15. Criterios de aceptación arquitectónica

Dos revisiones consecutivas sin cambios deben confirmar:

1. PowerShell se corrige por engine stream genérico, no renderer especial;
2. engine y support comparten una sola metadata y un mismo resolver efectivo;
3. solo API pública StreamParser/StringStream/token/tokenTable/tags/Highlighter/tagHighlighter;
4. ningún scanner inventa el estado de un StreamParser sin `startState`; el engine exige estado inicial explícito;
5. parser.tokenTable tiene precedencia explícita sin depender de aliases o precedencia internos, usando nombres sintéticos cuando sea necesario;
6. tree languages conservan parser actual;
7. manual paths convergen en `syntax-common-*`;
8. `cm-*`/`token *` salen de nuestra taxonomía manual;
9. no se sacrifica highlighting top-level common;
10. no se promete igualdad pixel-perfect con highlighting nativo que Obsidian documenta como motor distinto;
11. SourceView conserva camino nativo CodeMirror;
12. quoted black es plugin-owned y sobrescribible;
13. furniture host se integra con variables públicas scoped, sin internals ni `!important`;
14. scanner stream preserva estado/offsets, no inventa blank final y evita loops;
15. ownership DOM de Fase 1 permanece intacto;
16. rendered routing no cambia sin evidencia fresca;
17. alcance no se expande a piezas no incriminadas;
18. mobile/themes pueden sobrescribir variables propias sin ramas por tema.