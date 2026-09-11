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

## 2. Separar language support de extracción semántica manual

`CommonLanguage.support()` seguirá significando: "extensiones CodeMirror útiles cuando Syntax Highlight crea un EditorView propio".

Dejará de significar implícitamente: "este mismo LanguageSupport es también el mecanismo por el que extraemos manualmente ranges para Reading/Markdown decorations".

`CommonLanguage` distinguirá tres engines semánticos:

1. **tree-backed**: lenguaje con parser Lezer estable;
2. **stream-backed**: `StreamParser` público;
3. **plain**: sin parser, Text.

La representación concreta puede ser un discriminated union o campos equivalentes, pero el tipo debe hacer imposible que el caller tenga que descubrir el engine con `instanceof StreamLanguage`.

PowerShell será stream-backed porque ya importamos el `StreamParser` oficial `powerShell`.

Bash y los demás Lezer modernos serán tree-backed.

Text será plain.

## 3. Un único pipeline de semantic ranges

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

Esta función/ruta pura será utilizada por:

- `renderCommonCode()`;
- `buildEditorBlockSemantics()` para Markdown source;
- source view propia cuando el engine stream no sea seguro mediante highlighting de árbol.

## 4. Engine tree-backed

Para parser Lezer:

1. obtener árbol como hoy;
2. ejecutar `highlightTree()`;
3. usar un `HighlightStyle` semántico que emita **solo** `syntax-common-*`;
4. devolver ranges puros.

`parseCommonLanguageTree()` deja de contener lógica específica de StreamLanguage. Puede renombrarse o aceptar únicamente tree-backed languages para que el tipo refleje la realidad.

No cambiar parsers modernos que ya funcionan.

## 5. Engine stream-backed

### 5.1 Usar API pública, no internals de StreamLanguage

La extracción manual stream usará:

- `StreamParser`;
- `StringStream`;
- `startState`;
- `token`;
- `blankLine` cuando proceda;
- `tokenTable` cuando el parser lo proporcione.

No leer:

- `StreamLanguage.streamParser` interno;
- NodeProps internos del árbol;
- `TokenTable` interno de CodeMirror;
- NodeType ids privados.

El parser se recorre de principio a fin del cuerpo lógico para conservar estado multilinea.

### 5.2 Resolver strings de token a tags semánticos

Implementar un resolver puro de styles de `StreamParser` basado en el contrato público de CodeMirror.

Debe soportar:

- tags públicos directos (`keyword`, `number`, `operator`, `comment`, `string`, `punctuation`, etc.);
- aliases legacy que CodeMirror documenta/usa para stream modes:
  - `variable` -> `variableName`;
  - `variable-2` -> `special(variableName)`;
  - `string-2` -> `special(string)`;
  - `def` -> `definition(variableName)`;
  - `tag` -> `tagName`;
  - `attribute` -> `attributeName`;
  - `type` -> `typeName`;
  - `builtin` -> `standard(variableName)`;
  - `qualifier` -> `modifier`;
  - `error` -> `invalid`;
  - `header` -> `heading`;
  - `property` -> `propertyName`;
- múltiples style names separados por espacios;
- `parser.tokenTable` como override/extension cuando exista.

El resolver debe usar `tags` públicos del mismo runtime del plugin y entregar `Tag[]` al highlighter semántico mediante su interfaz pública `Highlighter.style(tags)`.

Así tree y stream convergen en la misma tabla tag -> `syntax-common-*` sin depender de NodeProp identity.

### 5.3 PowerShell no recibe un renderer especial

No habrá `if (language.id === "powershell")` en Reading/editor rendering.

La única particularidad de PowerShell es declarativa: su `CommonLanguage` usa engine stream con el `powerShell` StreamParser oficial.

## 6. Una única taxonomía visual de manual highlighting

Eliminar del highlighter manual common la mezcla:

```text
syntax-common-* + cm-*
syntax-common-* + token *
```

Los semantic ranges manuales emiten solo `syntax-common-*`.

Motivos:

- `cm-*` y `token *` representan dos ecosistemas visuales diferentes;
- themes pueden asignarles reglas distintas y `!important`;
- el gate Bash demostró divergencia visual entre source/rendered aunque la intención semántica sea la misma;
- Obsidian recomienda integración temática mediante CSS variables para elementos propios.

`styles.css` sigue usando variables públicas `--code-*`/`--color-*` como inputs de tema, pero la clasificación visual la controla Syntax Highlight.

Configured profiles no cambian.

## 7. Markdown Live Preview source

### 7.1 Common languages

Los semantic ranges comunes se generan desde la nueva autoridad pura y se mapean físicamente con `mapCodeBlockRange()` como hoy.

No se depende de syntax-tree NodeProps de StreamLanguage.

Se mantiene el modelo/caché por bloque visible de Fase 1.

### 7.2 Coexistencia con highlighting nativo top-level

No se asumirá que Obsidian soporta nativamente todos nuestros common languages (por ejemplo futuras gramáticas o Nushell). Por tanto **no se desactiva de forma global el manual semantic highlighting top-level**.

Regla:

- Syntax Highlight sigue emitiendo sus semantic marks como garantía propia;
- las clases son solo `syntax-common-*`, no simulaciones `cm-*`;
- el host puede seguir aportando su highlighting nativo top-level;
- no intentamos detectar soporte nativo mediante DOM/clases privadas.

Esto corrige la hipótesis H4 demasiado agresiva del análisis: "host first" se conserva como coexistencia, no como eliminación de nuestra garantía.

## 8. SyntaxSourceView

### 8.1 Tree-backed

Puede conservar `common.support()` + `syntaxHighlighting()` si produce correctamente highlighting en el EditorView propio.

El `HighlightStyle` empleado debe usar la misma taxonomía `syntax-common-*`.

### 8.2 Stream-backed

La source view no confiará en syntax-tree highlighting de StreamLanguage para la garantía de color.

Usará un ViewPlugin de decorations basado en la misma `commonSemanticRanges()` stream-backed.

Puede conservar `common.support()` simultáneamente para language data, indentación, brackets u otras capacidades CodeMirror, pero el color semántico stream viene de nuestra ruta directa.

Ese ViewPlugin debe ser viewport-aware cuando sea razonable; para un archivo source puede tokenizar desde inicio hasta el final del bloque/documento necesario para preservar estado stream, con caché/invalidation simple. No introducir un segundo parser distinto.

## 9. Source dark surface como contrato propio

## 9.1 No intentar clonar el tema con selectores privados

Nier demuestra que `--code-background` no necesariamente representa el aspecto real del source code nativo.

No se reintroducen `HyperMD-*` para copiarlo.

La surface quoted es propiedad de Syntax Highlight.

### 9.2 Defaults explícitos y sobrescribibles

Definir variables propias con default dark explícito:

```css
--syntax-editor-code-background: #000;
--syntax-editor-code-color: <foreground legible>;
--syntax-editor-code-caret: <caret legible>;
```

El default negro es requisito de producto, no detección de tema.

Un theme/snippet puede sobrescribir esas variables sin conocer internals.

### 9.3 Roles sobre negro

Dentro de `.cm-line.syntax-editor-code-source`, definir fallbacks dark-friendly para los roles `syntax-common-*` que de otro modo puedan heredar colores oscuros de `--text-normal` o variables inválidas.

Preferir variables públicas de código/color de Obsidian; proporcionar último fallback legible.

No ramificar por Nier ni por nombre de tema.

Opening/body/closing comparten superficie. Solo body presentacional recibe alignment/flow.

## 10. Rendered / Reading

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

## 11. Diagnostics y gate rendered

El resultado `[]` del gate anterior no se interpreta como prueba de fallo del processor porque el controller se habilitó sobre un widget que podía estar ya materializado/cacheado.

No cambiar producción rendered por ese dato todavía.

El próximo gate debe:

1. habilitar diagnostics antes de crear el rendered subtree;
2. forzar creación fresca (nota nueva o edición documental posterior al enable);
3. capturar todos los eventos del fence objetivo;
4. distinguir `reading-specialized` de `reading-fallback`.

Criterio:

- si aparece `reading-specialized`, la premisa de Fase 1 queda confirmada;
- si la única ruta funcional es `reading-fallback`, se detiene limpieza y se vuelve a análisis arquitectónico antes de cualquier parche.

## 12. Módulos previstos

### Modificar

- `common-languages.ts`: descriptor de engine y highlighter semántico único;
- `editor-block-model.ts`: consumir common semantic ranges;
- `reading.ts`: consumir common semantic ranges;
- `source-view.ts`: stream-backed decoration highlighter;
- `styles.css`: source dark surface + paleta scoped;
- tests correspondientes.

### Crear provisional o definitivo

- `common-semantic-ranges.ts` (nombre provisional): engine tree/stream/plain + stream-style resolver.

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

## 13. Tests arquitectónicos necesarios

Sin implementar todavía, la arquitectura exige después:

- stream tokenizer PowerShell devuelve ranges para variable/number/operator/builtin/string/comment;
- el mismo source produce los mismos semantic role ranges para host `editor` y `reading` porque ya no existen dos highlighters host-specific;
- multiline strings/comments conservan estado entre líneas;
- blank lines llaman `blankLine` si el parser lo define;
- resolver soporta legacy aliases y `tokenTable` custom;
- tree-backed Bash sigue produciendo semantic ranges;
- Text sigue plain;
- rendered no emite `token *` manuales;
- editor manual no emite `cm-*` manuales;
- quoted source usa negro/foreground legible mediante variables propias;
- no se reintroducen private selectors;
- source view PowerShell usa direct semantic decorations;
- gate real fuerza creación fresca y verifica ruta rendered.

## 14. Criterios de aceptación arquitectónica

El plan solo pasa al plan de implementación cuando dos revisiones consecutivas sin cambios confirmen que:

1. PowerShell se corrige por engine stream genérico, no por renderer especial;
2. la extracción stream usa únicamente API pública `StreamParser`/`StringStream`/tags/Highlighter;
3. tree languages existentes conservan su parser actual;
4. todos los manual paths convergen en `syntax-common-*`;
5. `cm-*`/`token *` dejan de ser parte de nuestra taxonomía manual;
6. no se sacrifica highlighting top-level de common languages no garantizados por Obsidian;
7. source view stream usa la misma semántica directa;
8. quoted source black es plugin-owned, sobrescribible y sin private selectors;
9. DOM ownership de Fase 1 sigue intacto;
10. no se modifica rendered host routing sin evidencia fresca;
11. el alcance no se expande a piezas que el gate no incrimina;
12. mobile y themes siguen pudiendo sobrescribir variables propias sin ramas por tema.
