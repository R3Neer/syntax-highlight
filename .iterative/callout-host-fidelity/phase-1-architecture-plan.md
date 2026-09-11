# Plan arquitectónico temporal · Fase 1 · Obsidian-native

Estado: TEMPORAL. Eliminar tras implementación, tests, validación real y limpieza final.

Este documento define **qué arquitectura debe existir**. El plan posterior de implementación definirá el orden operativo con checkboxes.

## 1. Principios de autoridad

Orden de autoridad:

1. API y Developer Documentation oficial de Obsidian.
2. Sample plugin oficial de Obsidian para frontera de bundle/runtime.
3. API/guía oficial de CodeMirror 6.
4. Evidencia capturada en Obsidian real.
5. Tests con EditorView/happy-dom como garantía lógica, nunca como sustituto del host.

Cuando un tema dependa de clases privadas de Obsidian, se preferirá el contrato público aunque no reproduzca pixel-perfect ese selector. Syntax Highlight expondrá clases y variables propias para personalización sin ramificar por tema.

## 2. Frontera de runtime

### 2.1 Una sola identidad CodeMirror/Lezer

El artifact Obsidian debe resolver desde el host la lista que externaliza el sample oficial:

- `@codemirror/autocomplete`
- `@codemirror/collab`
- `@codemirror/commands`
- `@codemirror/language`
- `@codemirror/lint`
- `@codemirror/search`
- `@codemirror/state`
- `@codemirror/view`
- `@lezer/common`
- `@lezer/highlight`
- `@lezer/lr`

Los paquetes de lenguaje que Obsidian no proporciona siguen empaquetados, pero sus imports CodeMirror/Lezer deben resolver a esos externals.

### 2.2 Declaración npm

`@r3nner/syntax-highlight-obsidian` declarará como peers los módulos host que importa directamente y los módulos Lezer cuya identidad forma parte del contrato, además de `obsidian`. Los rangos deben ser compatibles con los peers declarados por `obsidian` y con `minAppVersion`.

No se convertirán en peers paquetes de lenguaje que Obsidian no proporciona.

### 2.3 Guardrail de build

Centralizar externals en un módulo importable por esbuild/tests.

El build usará `metafile` y fallará si empaqueta cualquiera de los runtime packages prohibidos. No basta con comprobar strings del config.

## 3. Ownership por modo

### 3.1 Reading View

Ownership: Markdown renderer de Obsidian + APIs de Markdown.

Ruta primaria:

`registerMarkdownCodeBlockProcessor(fence) -> renderResolvedFence()`.

Ruta secundaria soportada:

`registerMarkdownPostProcessor` tardío, **solo Reading fallback**, para PRE/CODE reconocidos que hayan quedado nativos.

### 3.2 Live Preview · rendered

Ownership: Obsidian.

Syntax Highlight participa únicamente mediante `registerMarkdownCodeBlockProcessor`, API soportada también en Live Preview.

Se elimina:

- `MutationObserver` sobre `view.dom` para descubrir rendered code;
- dependencia funcional de `.cm-embed-block`/`.cm-callout`;
- reemplazo manual de DOM gestionado por CodeMirror.

Si un alias no puede registrarse de forma segura con la API oficial, Live Preview rendered queda nativo para ese alias. No se recupera mediante DOM privado.

### 3.3 Live Preview · source

Ownership: CodeMirror/Obsidian.

Syntax Highlight participa solo mediante `registerEditorExtension()` y decorations. No modifica DOM, selection ni source para pintar.

## 4. Arquitectura source

### 4.1 Dos etapas internas

#### A. Modelo semántico del documento

Entrada: `state.doc` + registry/settings revision.

Salida por bloque:

- `MudCodeBlock` físico/lógico;
- runtime configurado o `CommonFenceMatch`;
- token spans mapeados a offsets físicos;
- política de line numbers;
- line semantics propias.

Se recalcula solo con documento/revision relevantes.

#### B. Materialización del viewport

Entrada: modelo cacheado + `view.visibleRanges` + selección cuando importe para la reconciliación source/rendered del host.

Salida:

- `Decoration.mark` visibles;
- máximo una `Decoration.line` propia por línea;
- widgets inline visibles.

Se recalcula en model change, `viewportChanged` y `selectionSet` cuando corresponda.

### 4.2 Módulos

`blocks.ts` permanece como autoridad de scanning/mapping Markdown.

Crear un módulo puro provisional `editor-block-model.ts` con:

- tipos de modelo;
- resolución configured/common;
- spans físicos;
- line semantics;
- intersección con visible ranges.

`editor.ts` queda como adapter CodeMirror: lifecycle del ViewPlugin, cache/revision, materialización DecorationSet y composición de Smart Editing.

### 4.3 Una sola line decoration propia por línea

Clases propias:

- `syntax-editor-code-source`
- `syntax-editor-code-source-opening`
- `syntax-editor-code-source-body`
- `syntax-editor-code-source-closing`
- `syntax-presentational`
- `syntax-presentation-family-*`
- `syntax-presentation-align-*`
- `syntax-presentation-flow-*`

No emitir `HyperMD-codeblock*`.

Opening/closing reciben surface, no alignment del body salvo decisión explícita posterior.

### 4.4 Token marks

Configured profiles mantienen sus clases/paletas propias.

Common languages siempre emiten `syntax-common-*` y, adicionalmente, `cm-*` en source / `token *` en rendered para interoperabilidad. La legibilidad básica no dependerá de ancestors privados de Obsidian.

### 4.5 Furniture

Line numbers siguen siendo widgets inline y solo se materializan para líneas visibles. Text/Markdown mantienen su política sin line numbers/badge.

## 5. Styling source soportado

### 5.1 Surface propia

`styles.css` estiliza únicamente clases propias.

Contrato público:

```css
--syntax-editor-code-background: var(--code-background);
--syntax-editor-code-color: var(--code-normal, var(--text-normal));
```

`--code-background` y la familia `--code-*` son variables de código de Obsidian. No se hardcodea negro ni nombre de tema. Un vault/tema puede sobrescribir la variable propia del plugin.

### 5.2 Presentation

Alignment/flow se aplica sobre `.cm-line.syntax-presentational` desde la line decoration consolidada.

No introducir margins verticales en Live Preview; usar padding/border/radius si se necesita furniture visual.

### 5.3 Compatibilidad temática

1. El tema puede estilizar `cm-*`/`token *` cuando sus selectores apliquen.
2. `syntax-common-*` ofrece fallback con `--code-*`.
3. En **source**, no hay mutación JS de color: CodeMirror conserva ownership total del DOM.
4. Surface nunca pertenece al contrast manager.

## 6. Contraste: separar DOM propio de DOM CodeMirror

El `CommonContrastManager` actual escribe `style.color` y `data-syntax-contrast-adjusted` directamente en cualquier `syntax-common-*` que observe, incluidos potencialmente spans source de CodeMirror. Eso no es compatible con la regla de ownership del editor.

Arquitectura objetivo:

- el normalizador JS solo puede modificar tokens dentro de DOM que Syntax Highlight posea, identificado por `.syntax-highlight-frame`;
- puede seguir reaccionando a cambio de tema/stylesheet para ese DOM rendered;
- debe ignorar tokens source dentro de `.cm-content` que no pertenezcan a un `.syntax-highlight-frame`;
- source confía en decorations + cascade de CSS/variables oficiales;
- settings preview conserva su exclusión actual;
- configured profiles siguen fuera de este normalizador común.

La implementación debe reducir el scope del observer/normalización cuando sea posible, pero no convertir esta fase en una reescritura del motor perceptual.

## 7. Common-language highlighting

### 7.1 PowerShell

No habrá excepción PowerShell de rendering. La corrección primaria es la identidad única Lezer.

`parseCommonLanguageTree()` conserva `EditorState + ensureSyntaxTree` para `StreamLanguage`; la llamada directa a `parser.parse()` ya demostró ser inválida en el runtime de Obsidian.

Validar spans para variable, operator, number, builtin/cmdlet, comment y string.

### 7.2 Taxonomía compartida

`createCommonHighlightStyle()` sigue siendo la tabla única tag -> semantic/host-compatible class para highlights manuales.

El editor de archivos comunes puede seguir usando `syntaxHighlighting(COMMON_EDITOR_HIGHLIGHT_STYLE)` contra el mismo runtime Lezer del host.

## 8. Reading fallback estructural

Separar el detector PRE/CODE de Live Preview en un módulo provisional `rendered-code-candidate.ts`.

Debe:

- aceptar `language-*` en PRE, CODE o ambos si coinciden;
- rechazar conflictos/ambigüedad;
- exigir un único CODE directo;
- preservar furniture auxiliar;
- respetar processed markers;
- no conocer `.cm-embed-block`.

`reading-host.ts` lo consume para el postprocessor tardío.

## 9. Lifecycle y diagnostics

### 9.1 Diagnostics temporal

Mientras se valida, `_tmp-host-diagnostics.ts` puede registrar EditorViews desde la extensión source. No debe requerir un bridge rendered.

### 9.2 Limpieza final

Tras validación real:

- eliminar `_tmp-host-diagnostics.ts` y tests temporales;
- eliminar documentos `.iterative/...` ya agotados para este objetivo;
- no dejar controller global de diagnóstico.

### 9.3 Deuda observada fuera de alcance

La revisión oficial también detecta recomendaciones generales no causales para este bug (p. ej. cuándo registrar ciertos watchers del vault o modernizar lifecycle de custom views). Se documentan como deuda futura y **no** se mezclan con esta refactorización para mantener una frontera verificable.

## 10. Migración de tests

### Mantener

- scanner quote-aware/mapping;
- common token bridge;
- presentation;
- Reading processor/fallback;
- Smart Editing.

### Reemplazar/renombrar

- tests que llaman `real` a DOM inventado;
- tests de `LivePreviewRenderedBlockBridge`;
- `live-preview-source-surface.test.ts` para line semantics propias, no `HyperMD-*`.

### Añadir

- guardrail de build/metafile para runtime host;
- PowerShell semantic spans con runtime unificado;
- cache/modelo + visible materialization;
- una line decoration propia por línea;
- prohibición de `HyperMD-codeblock`, `.cm-embed-block`, `.cm-callout` en funcionalidad production;
- contraste: source nunca recibe inline mutation del manager, rendered propio sí puede normalizarse;
- Reading fallback PRE-only/CODE-only/agreement/conflict;
- gate manual para comportamiento real de `registerMarkdownCodeBlockProcessor` en Live Preview.

## 11. Flujo final

```text
Markdown source / EditorState
        |
        +---------------------------+
        |                           |
 Reading / rendered LP          LP source
        |                           |
 code-block processor           editor extension
        |                           |
 renderResolvedFence            cached block model
        |                           |
 plugin-owned DOM               visible decorations
        |                      /       |       \
        |                    marks    lines    widgets
        |                      |        |        |
        +----------> CSS/theme <--------+--------+
        |
 rendered-only contrast normalization
```

Reading fallback cuelga solo del lado rendered mediante postprocessor oficial.

## 12. Criterios arquitectónicos de aceptación

El plan solo pasa a implementación cuando dos revisiones consecutivas confirmen sin cambios que:

1. coincide con el sample oficial en frontera CodeMirror/Lezer;
2. ningún componente de producción muta DOM gestionado por CodeMirror;
3. Markdown APIs resuelven rendered y editor extensions resuelven source;
4. funcionalidad no depende de `.cm-embed-block`, `.cm-callout` ni `HyperMD-codeblock*`;
5. no hardcodea tema;
6. mantiene una taxonomía semántica compartida;
7. cada línea tiene una sola line semantics propia;
8. Reading fallback usa API soportada;
9. contraste JS queda restringido a DOM propio;
10. conserva mobile compatibility;
11. existe gate de Obsidian real antes de limpiar diagnostics/temporales.
