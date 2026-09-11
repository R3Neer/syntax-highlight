# Plan arquitectónico temporal · Fase 2 · semántica common + source dark

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Este documento define qué arquitectura debe existir tras el gate real fallido de Fase 1. No contiene el orden operativo ni checkboxes; ese será un segundo plan temporal después de estabilizar este mediante TM.

## 1. Autoridad y restricciones que se conservan

Orden de autoridad:

1. documentación/API oficial de Obsidian;
2. API oficial de CodeMirror/Lezer;
3. evidencia capturada en Obsidian real;
4. tests como garantía lógica, nunca sustituto del host.

Se conservan los invariantes válidos de Fase 1:

- CodeMirror/Lezer host siguen externalizados según la frontera oficial ya adoptada;
- source Live Preview se modifica solo mediante editor extensions/decorations;
- no se muta DOM gestionado por CodeMirror;
- no se reintroducen `.cm-embed-block`, `.cm-callout` ni `HyperMD-codeblock*` como dependencia funcional;
- rendered continúa entrando por APIs Markdown soportadas;
- contraste JS continúa restringido a `.syntax-highlight-frame` propio;
- scanner quote-aware, mapping físico/lógico, presentation y Smart Editing permanecen intactos salvo adaptación de tipos estrictamente necesaria.

La documentación de Obsidian recomienda decorations desde ViewPlugin cuando el trabajo puede limitarse al viewport y CSS variables para styling de elementos propios. Esta fase mantiene ambas reglas.

## 2. El engine de `CommonLanguage` es la fuente de verdad

Se elimina la duplicidad conceptual entre `support()` y el mecanismo semántico manual.

`CommonLanguage` tendrá un engine discriminado o equivalente que sea la autoridad tanto para construir soporte CodeMirror como para extraer semantic ranges manuales:

1. **tree-backed**: factory de `LanguageSupport`/lenguaje Lezer estable;
2. **stream-backed**: `StreamParser` público + tabla explícita style -> `Tag`/`Tag[]`;
3. **plain**: sin parser, Text.

Un helper único, nombre provisional `commonLanguageSupport(language)`, devuelve:

- el support tree-backed proporcionado por su factory;
- para stream-backed, `new LanguageSupport(StreamLanguage.define(effectiveStreamParser))`;
- `undefined` para plain.

`effectiveStreamParser` se construye sin mutar el parser importado y combina la metadata pública necesaria (`tokenTable`) con la tabla declarada en el engine. Así `SyntaxSourceView` y la extracción manual comparten exactamente la misma definición semántica de estilos aunque CodeMirror aplique una y Syntax Highlight extraiga la otra.

El tipo debe impedir que un caller descubra el engine con `instanceof StreamLanguage`.

PowerShell será stream-backed porque ya importamos el `StreamParser` oficial `powerShell`.

Bash y los demás Lezer modernos serán tree-backed.

Text será plain.

## 3. Un único pipeline de semantic ranges manuales

Crear una autoridad pura única, nombre provisional `common-semantic-ranges.ts`.

Contrato conceptual:

```text
CommonLanguage + source
        |
        +-- tree-backed ----+
        |                   |
        +-- stream-backed --+--> CommonSemanticRange[]
        |                   |
        +-- plain ----------+
```

`CommonSemanticRange` contiene al menos:

- `from`;
- `to`;
- clase(s) `syntax-common-*`.

No contiene clases Prism ni clases CodeMirror de compatibilidad.

Esta autoridad será utilizada por los caminos donde Syntax Highlight extrae manualmente semántica:

- `renderCommonCode()`;
- `buildEditorBlockSemantics()` para Markdown source.

`SyntaxSourceView` utiliza `commonLanguageSupport()` y no necesita la ruta manual para colorear cuando CodeMirror posee el EditorView completo.

## 4. Highlighter semántico único

Sustituir los dos highlighters host-specific actuales por una única tabla tag -> clase propia, nombre provisional:

```text
COMMON_SEMANTIC_HIGHLIGHT_STYLE
```

Solo emite `syntax-common-*`.

No contiene `cm-*` ni `token *`.

Puede usarse:

- con `highlightTree()` en engine tree-backed;
- mediante su interfaz pública `Highlighter.style(tags)` en engine stream-backed;
- con `syntaxHighlighting()` en EditorViews que CodeMirror posea completamente, como `SyntaxSourceView`.

Así la taxonomía semántica tiene una sola fuente de verdad.

## 5. Engine tree-backed

Para parser Lezer:

1. obtener el support/lenguaje desde el engine;
2. ejecutar su parser como hoy;
3. ejecutar `highlightTree()` con `COMMON_SEMANTIC_HIGHLIGHT_STYLE`;
4. devolver ranges puros.

La función de parseo tree-backed no contendrá lógica específica de `StreamLanguage`.

No cambiar parsers modernos que ya funcionan.

## 6. Engine stream-backed

### 6.1 API pública únicamente

La extracción manual stream usará solo APIs documentadas de CodeMirror/Lezer:

- `StreamParser`;
- `StringStream`;
- `startState`;
- `token`;
- `blankLine` cuando proceda;
- `tokenTable`;
- `tags` públicos;
- `Highlighter.style(tags)`.

No leer:

- `StreamLanguage.streamParser` interno;
- NodeProps internos del árbol;
- `TokenTable` interno de CodeMirror;
- NodeType ids privados;
- la tabla interna de aliases legacy de `StreamLanguage`.

El parser se recorre de principio a fin del cuerpo lógico para conservar estado multilinea.

### 6.2 Metadata explícita para styles no públicos

El contrato público de `StreamParser.token()` permite devolver:

- nombres de tags públicos;
- nombres definidos en `tokenTable`;
- modificadores públicos separados por `.`;
- varios styles separados por espacios.

No trataremos la tabla interna de aliases legacy de CodeMirror como API.

Cada engine stream-backed declara una tabla propia basada exclusivamente en `Tag` públicos para cualquier nombre no expresable directamente por el contrato público.

PowerShell declarará explícitamente, junto a su engine, al menos:

- `variable` -> `tags.variableName`;
- `number` -> `tags.number`;
- `operator` -> `tags.operator`;
- `builtin` -> `tags.standard(tags.variableName)`;
- `punctuation` -> `tags.punctuation`;
- `string` -> `tags.string`;
- `comment` -> `tags.comment`;
- `keyword` -> `tags.keyword`;
- `error` -> `tags.invalid`.

La misma tabla se incorpora al `tokenTable` del `effectiveStreamParser` usado por `commonLanguageSupport()`. No existen dos configuraciones distintas de PowerShell.

El resolver stream manual:

1. consulta la tabla efectiva declarada en el engine/parser;
2. si no hay entrada, resuelve nombres/modificadores que existan en `tags` públicos;
3. combina múltiples style names en un único conjunto de `Tag`;
4. pasa el conjunto a `COMMON_SEMANTIC_HIGHLIGHT_STYLE.style(tags)`;
5. si un style no puede resolverse, falla de forma local y deja ese trozo sin clase semántica, sin abortar el bloque.

### 6.3 Scanner por líneas y offsets

La implementación stream debe preservar offsets exactos del source:

- `\n`, `\r\n` y última línea sin terminador;
- `StringStream` recibe solo el contenido de una línea, nunca el terminador;
- los ranges emitidos se desplazan por el offset real de esa línea;
- líneas vacías llaman `blankLine(state, indentUnit)` cuando exista;
- `tabSize`/`indentUnit` usan defaults compatibles con CodeMirror cuando no exista EditorState (`4` y `2`) y podrán pasarse explícitamente si un caller posee state.

Como `StreamParser.token()` puede realizar un paso de longitud cero si actualiza estado, el scanner tendrá un guard finito propio contra loops sin avance. No copiará ni dependerá de helpers internos de `StreamLanguage`.

### 6.4 PowerShell no recibe un renderer especial

No habrá `if (language.id === "powershell")` en Reading/editor rendering.

La única particularidad de PowerShell es declarativa: su `CommonLanguage` usa engine stream con `powerShell` y su tabla explícita token -> tag.

## 7. Una única taxonomía visual de manual highlighting

Eliminar del highlighter manual common la mezcla:

```text
syntax-common-* + cm-*
syntax-common-* + token *
```

Los semantic ranges manuales emiten solo `syntax-common-*`.

Motivos:

- `cm-*` y `token *` representan ecosistemas visuales diferentes;
- themes pueden asignarles reglas distintas y `!important`;
- el gate Bash demostró divergencia visual entre source/rendered aunque la intención semántica sea la misma;
- Obsidian recomienda integrar styling propio mediante CSS variables en lugar de depender de selectores internos.

`styles.css` usa variables públicas `--code-*`/`--color-*` como inputs de tema, pero la clasificación visual la controla Syntax Highlight.

Configured profiles no cambian.

## 8. Markdown Live Preview source

Los semantic ranges comunes se generan desde `commonSemanticRanges()` y se mapean físicamente con `mapCodeBlockRange()` como hoy.

No se depende de syntax-tree NodeProps de `StreamLanguage` para manual highlighting.

Se mantiene el modelo/caché por bloque visible de Fase 1.

No se asumirá que Obsidian soporta nativamente todos nuestros common languages. Por tanto Syntax Highlight sigue emitiendo sus semantic marks como garantía propia incluso top-level; ahora serán solo `syntax-common-*`.

El host puede coexistir con esos marks en top-level. No intentamos detectar soporte nativo mediante DOM o clases privadas.

## 9. SyntaxSourceView

`SyntaxSourceView` queda deliberadamente en la ruta nativa de CodeMirror:

```text
commonLanguageSupport(language)
+ syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHT_STYLE)
```

También para stream-backed languages.

Razones:

- CodeMirror posee ese EditorView completo;
- `StreamLanguage + syntaxHighlighting()` es la API oficial para modos legacy;
- el gate demuestra que la ruta nativa de CodeMirror sí puede colorear PowerShell;
- sustituirla por otro ViewPlugin manual obligaría a reinventar parsing incremental sin evidencia de necesidad.

Como `commonLanguageSupport()` construye el StreamLanguage desde la misma metadata engine/tokenTable, la source view y la extracción manual no pueden divergir por configuración declarativa.

Si el gate posterior revela un fallo específico de PowerShell en `SyntaxSourceView`, se abrirá análisis separado antes de tocar esta decisión.

## 10. Source dark surface como contrato propio

### 10.1 No clonar el tema con selectores privados

Nier demuestra que `--code-background` no necesariamente representa el aspecto real del source code nativo.

No se reintroducen `HyperMD-*` ni `.cm-inline-code` como dependencia funcional para copiarlo.

La surface quoted es propiedad de Syntax Highlight.

### 10.2 Defaults explícitos y sobrescribibles

El requisito de producto es fondo negro en quoted source. Por tanto el fallback final es explícito, no inferido del tema:

```css
--syntax-editor-code-background: #000;
--syntax-editor-code-color: #d4d4d4;
--syntax-editor-code-caret: #d4d4d4;
```

La forma concreta puede expresarse como custom properties en un scope del plugin o como fallback final equivalente. Un tema/snippet puede sobrescribir las variables propias sin conocer internals.

El hardcode de negro aquí es deliberado y limitado a una superficie plugin-owned solicitada por producto. No existe rama por Nier ni por nombre de tema.

### 10.3 Neutralizar furniture inline del host mediante variables públicas

El gate muestra que Obsidian puede conservar spans/furniture internos con aspecto de inline code dentro del quoted source. Pintar solo la línea de negro podría dejar fondos claros encima.

No se seleccionarán esos spans por clases privadas.

Dentro del scope `.cm-line.syntax-editor-code-source`, la line decoration/CSS redefine variables públicas de código para que los descendientes del host que las consuman se integren en nuestra surface, por ejemplo conceptualmente:

```css
--code-background: transparent;
--code-normal: var(--syntax-editor-code-color);
--caret-color: var(--syntax-editor-code-caret);
```

No se usa `!important`. La guía oficial de Obsidian favorece CSS variables y desaconseja `!important` en temas; esta solución deja al host consumir sus propias variables pero cambia su valor únicamente bajo una línea que Syntax Highlight ha marcado explícitamente como su surface.

La surface de la línea usa `--syntax-editor-code-background`, no el `--code-background` neutralizado.

### 10.4 Roles sobre negro

Dentro de `.cm-line.syntax-editor-code-source`, los roles `syntax-common-*` deben tener fallbacks legibles sobre negro.

Orden preferido:

1. variable propia `--syntax-common-*`;
2. variable pública `--code-*`/`--color-*` apropiada si es usable;
3. último fallback literal legible.

El texto plain no debe caer a `--text-normal` como último valor, porque un tema claro puede usar texto oscuro aunque la surface quoted sea negra.

Opening/body/closing comparten superficie. Solo body presentacional recibe alignment/flow.

## 11. Rendered / Reading

`renderCommonCode()` consume `CommonSemanticRange[]` directamente.

No vuelve a interpretar tags ni añade `token *`.

El DOM estructural actual se conserva:

- `.syntax-highlight-frame`;
- badge;
- line numbers;
- `.syntax-code-line`;
- `.syntax-code-line-content`;
- `code.language-* is-loaded`.

El tema puede seguir influir mediante variables públicas y reglas generales sobre `code.language-*`, pero no mediante una segunda taxonomía de token que compita con `syntax-common-*`.

## 12. Diagnostics y gate rendered

El resultado `[]` del gate anterior no se interpreta como prueba de fallo del processor porque el controller se habilitó sobre un widget que podía estar ya materializado/cacheado.

No cambiar producción rendered por ese dato todavía.

El próximo gate debe:

1. habilitar diagnostics antes de crear el rendered subtree;
2. forzar creación fresca mediante una nota nueva o edición documental posterior al enable;
3. capturar todos los eventos del fence objetivo;
4. distinguir `reading-specialized` de `reading-fallback`.

Criterio:

- si aparece `reading-specialized`, la premisa de Fase 1 queda confirmada;
- si la única ruta funcional es `reading-fallback`, se detiene limpieza y se vuelve a análisis arquitectónico antes de cualquier parche.

## 13. Módulos previstos

### Modificar

- `common-languages.ts`: engine como fuente de verdad, `commonLanguageSupport()` y highlighter semántico único;
- `editor-block-model.ts`: consumir common semantic ranges;
- `reading.ts`: consumir common semantic ranges;
- `source-view.ts`: consumir `commonLanguageSupport()` y highlighter semántico único;
- `styles.css`: source dark surface, variables host scoped y paleta legible;
- tests correspondientes.

### Crear

- `common-semantic-ranges.ts` (nombre provisional): engine tree/stream/plain + resolver stream público.

### No tocar salvo adaptación de imports/tipos

- `blocks.ts`;
- `block-presentation.ts`;
- `rendered-code-candidate.ts`;
- `reading-host.ts`;
- `markdown-render-mode.ts`;
- `contrast-manager.ts`;
- `build-runtime.mjs`;
- Smart Editing;
- configured tokenizers.

## 14. Tests arquitectónicos necesarios

Sin implementar todavía, la arquitectura exige después:

- stream tokenizer PowerShell devuelve ranges para variable/number/operator/builtin/string/comment;
- no existe rama renderer `language.id === powershell`;
- `commonLanguageSupport(PowerShell)` usa el mismo parser/tokenTable declarativo que la extracción manual;
- multiline strings/comments conservan estado entre líneas;
- CRLF y última línea conservan offsets exactos;
- blank lines llaman `blankLine` si el parser lo define;
- un token de longitud cero no puede provocar loop infinito;
- style resolver soporta nombres/modificadores públicos, varios styles y `tokenTable` explícita;
- PowerShell usa tabla token -> tag declarativa propia, no aliases internos de CodeMirror;
- tree-backed Bash sigue produciendo semantic ranges;
- Text sigue plain;
- rendered manual no emite `token *`;
- editor manual no emite `cm-*`;
- source view conserva `commonLanguageSupport()+syntaxHighlighting()` con el highlighter semántico único;
- quoted source usa negro/foreground legible mediante variables propias;
- quoted source neutraliza `--code-background` del host dentro de su scope sin seleccionar clases privadas ni usar `!important`;
- no se reintroducen private selectors;
- gate real fuerza creación fresca y verifica ruta rendered.

## 15. Criterios de aceptación arquitectónica

El plan solo pasa al plan de implementación cuando dos revisiones consecutivas sin cambios confirmen que:

1. PowerShell se corrige por engine stream genérico, no por renderer especial;
2. engine y support comparten una sola metadata declarativa por lenguaje;
3. la extracción stream usa únicamente API pública `StreamParser`/`StringStream`/tags/Highlighter;
4. no se replica como contrato nuestra copia de la tabla interna de aliases legacy de CodeMirror;
5. tree languages existentes conservan su parser actual;
6. todos los manual paths convergen en `syntax-common-*`;
7. `cm-*`/`token *` dejan de ser parte de nuestra taxonomía manual;
8. no se sacrifica highlighting top-level de common languages no garantizados por Obsidian;
9. `SyntaxSourceView` conserva el camino nativo de CodeMirror salvo evidencia real posterior;
10. quoted source black es plugin-owned, sobrescribible y sin private selectors;
11. furniture inline del host se integra mediante variables públicas scoped, no selectores privados ni `!important`;
12. el scanner stream preserva estado multilinea, offsets y terminadores sin loops;
13. DOM ownership de Fase 1 sigue intacto;
14. no se modifica rendered host routing sin evidencia fresca;
15. el alcance no se expande a piezas que el gate no incrimina;
16. mobile y themes siguen pudiendo sobrescribir variables propias sin ramas por tema.
