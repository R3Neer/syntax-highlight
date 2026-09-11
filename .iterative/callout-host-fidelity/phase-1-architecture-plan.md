# Plan arquitectónico temporal · Fase 1 · Obsidian-native

Estado: TEMPORAL. Eliminar tras implementación, tests, validación real y limpieza final.

Este documento define **qué arquitectura debe existir**. El plan posterior de implementación definirá el orden operativo con checkboxes.

## 1. Principios de autoridad

Orden de autoridad para decisiones del adaptador Obsidian:

1. API y Developer Documentation oficial de Obsidian.
2. Sample plugin oficial de Obsidian para frontera de bundle/runtime.
3. API/guía oficial de CodeMirror 6.
4. Evidencia capturada en Obsidian real.
5. Tests con EditorView/happy-dom como garantía lógica, nunca como sustituto del host.

Cuando un comportamiento visual de un tema dependa de una clase privada de Obsidian, se preferirá el contrato público aunque no reproduzca pixel-perfect ese selector privado. El plugin ofrecerá clases/variables propias para que temas/snippets puedan personalizarlo sin ramificar por nombre de tema.

## 2. Frontera de runtime

### 2.1 Una sola identidad CodeMirror/Lezer

El artifact Obsidian debe resolver desde el host:

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

aunque el plugin no importe directamente todos ellos. La lista seguirá el sample oficial para evitar que dependencias transitivas introduzcan una segunda identidad.

Los paquetes de lenguaje que Obsidian no proporciona (`@codemirror/lang-*`, Nushell, shell, C#, legacy modes, etc.) siguen empaquetados, pero sus dependencias de runtime CodeMirror/Lezer se resuelven contra los externals del host.

### 2.2 Declaración npm

`@r3nner/syntax-highlight-obsidian` declarará como peers los módulos host que importa directamente y Lezer requerido por el runtime, además de `obsidian`. Las versiones serán compatibles con la familia declarada por el paquete `obsidian`, evitando fijar una versión que contradiga `minAppVersion`.

### 2.3 Guardrail de build

La configuración de externals se centraliza en un módulo importable por esbuild/tests.

El build con `metafile` ejecutará una comprobación que falle si se empaqueta cualquiera de los runtime packages prohibidos. No bastará con un test que compare strings del config.

## 3. Ownership por modo

### 3.1 Reading View

Ownership: Markdown renderer de Obsidian + APIs de Markdown processor.

Ruta primaria:

`registerMarkdownCodeBlockProcessor(fence) -> renderResolvedFence()`.

Ruta secundaria soportada:

`registerMarkdownPostProcessor` tardío, **solo como Reading fallback**, para PRE/CODE reconocidos que hayan quedado nativos.

No hay CodeMirror ni editor decorations en esta ruta.

### 3.2 Live Preview · rendered

Ownership: Obsidian.

Syntax Highlight participa únicamente mediante `registerMarkdownCodeBlockProcessor`, que Obsidian soporta en Live Preview.

Se elimina cualquier:

- `MutationObserver` sobre `view.dom` para encontrar rendered code;
- dependencia funcional de `.cm-embed-block`/`.cm-callout`;
- reemplazo manual de nodos que pertenezcan al DOM de CodeMirror.

Si un fence no puede registrarse de forma segura mediante la API oficial, Live Preview rendered queda nativo para ese alias. No se compensa mediante DOM privado. Aliases seguros equivalentes siguen disponibles.

### 3.3 Live Preview · source

Ownership: CodeMirror/Obsidian.

Syntax Highlight participa solo mediante `registerEditorExtension()` y decorations.

No se modifica directamente DOM, selection ni source para pintar.

## 4. Arquitectura source

### 4.1 Dos etapas internas

Separar:

#### A. Modelo semántico del documento

Entrada:

- `state.doc`;
- registry/settings revision.

Salida: bloques resueltos con:

- `MudCodeBlock` físico/lógico;
- runtime configurado o `CommonFenceMatch`;
- token spans ya mapeados a offsets físicos;
- política de line numbers;
- line semantics propias de Syntax Highlight.

Se recalcula solo si cambia documento o revision relevante.

#### B. Materialización del viewport

Entrada:

- modelo semántico cacheado;
- `view.visibleRanges`;
- estado de selección cuando sea relevante para reconciliación visual.

Salida:

- `Decoration.mark` visibles;
- una única `Decoration.line` propia por línea;
- widgets inline visibles de números.

Se recalcula en:

- model change;
- `viewportChanged`;
- `selectionSet` si puede cambiar qué source está materializando Live Preview.

### 4.2 Módulos

Mantener `blocks.ts` como autoridad de scanning/mapping Markdown.

Crear un módulo pequeño y puro, nombre provisional `editor-block-model.ts`, que contenga:

- tipos del modelo;
- resolución configured/common;
- construcción de spans físicos;
- construcción de line semantics;
- intersección con rangos visibles.

`editor.ts` queda como adapter CodeMirror:

- ViewPlugin lifecycle;
- cache/revision;
- conversión del modelo a DecorationSet;
- Smart Editing composition.

No mover lógica de Markdown a DOM helpers.

### 4.3 Una sola line decoration por línea

Cada línea física tendrá como máximo una line decoration de Syntax Highlight.

Clases propias posibles:

- `syntax-editor-code-source`
- `syntax-editor-code-source-opening`
- `syntax-editor-code-source-body`
- `syntax-editor-code-source-closing`
- `syntax-presentational`
- `syntax-presentation-family-*`
- `syntax-presentation-align-*`
- `syntax-presentation-flow-*`

No se emiten `HyperMD-codeblock*`.

La opening/closing line solo recibe surface, no alignment del body salvo decisión explícita posterior.

### 4.4 Token marks

Configured profiles:

- continúan con clases semánticas/paleta propias.

Common languages:

- siempre emiten `syntax-common-*`;
- además emiten `cm-*` en source y `token *` en rendered para interoperabilidad de temas;
- su legibilidad no depende de estar debajo de `.HyperMD-codeblock` porque `syntax-common-*` tiene fallback basado en variables oficiales.

### 4.5 Furniture

Line-number widgets siguen siendo inline widgets de CodeMirror y solo se generan para líneas visibles.

Text/Markdown mantienen su política de no mostrar line numbers/badge.

## 5. Styling source soportado

### 5.1 Surface propia

`styles.css` estiliza únicamente clases propias.

Contrato público:

```css
--syntax-editor-code-background: var(--code-background);
--syntax-editor-code-color: var(--code-normal, var(--text-normal));
```

La implementación puede añadir variables para border/radius si son necesarias, con fallback a variables oficiales de Obsidian.

No se hardcodea negro ni nombre de tema.

Un vault/tema puede obtener una superficie negra o cualquier otra mediante la variable del plugin sin tocar selectores internos.

### 5.2 Presentation

Alignment/flow se aplica a `.cm-line.syntax-presentational`, como ahora, pero la clase vendrá de la única line decoration consolidada.

No usar margins verticales en Live Preview; cualquier furniture visual usa padding/border siguiendo las guías de themes/plugins.

### 5.3 Compatibilidad temática

La política queda:

1. theme puede estilizar `cm-*`/`token *` si el selector aplica;
2. semantic class propia ofrece fallback con `--code-*`;
3. CommonContrastManager corrige solo foreground insuficiente;
4. surface nunca es responsabilidad del contrast manager.

## 6. Common-language highlighting

### 6.1 PowerShell

No habrá excepción PowerShell de rendering. La corrección principal es la identidad única Lezer.

`parseCommonLanguageTree()` conserva el tratamiento especial de `StreamLanguage` mediante `EditorState + ensureSyntaxTree`, porque Obsidian ya demostró que `parser.parse()` directo puede requerir `ParseContext`.

Tras unificar runtime se valida que `highlightTree()` produzca spans para:

- variable;
- operator;
- number;
- builtin/cmdlet;
- comment/string en fixtures adicionales.

### 6.2 Compartición de taxonomy

`createCommonHighlightStyle()` sigue siendo la única tabla de tag -> semantic/host-compatible class para Reading/manual highlights.

El source-file editor seguirá pudiendo usar `syntaxHighlighting(COMMON_EDITOR_HIGHLIGHT_STYLE)` con el mismo runtime Lezer del host.

No duplicar una tabla específica para Markdown Live Preview.

## 7. Rendered candidate fallback de Reading

Separar el detector estructural de PRE/CODE de cualquier concepto de Live Preview.

Nombre provisional: `rendered-code-candidate.ts`.

Debe:

- aceptar metadata `language-*` en PRE, CODE o ambos si es consistente;
- rechazar conflictos/ambigüedad;
- exigir un único CODE directo;
- preservar furniture auxiliar;
- respetar processed markers;
- no conocer `.cm-embed-block`.

`reading-host.ts` lo usa para su postprocessor tardío.

## 8. Lifecycle y diagnostics

### 8.1 Diagnostics temporal

Mientras se valida la nueva arquitectura, `_tmp-host-diagnostics.ts` puede registrar el EditorView desde el ViewPlugin source, sin necesitar un bridge rendered.

No debe justificar ninguna dependencia de DOM privada en producción final.

### 8.2 Limpieza final

Tras validar Obsidian real:

- eliminar `_tmp-host-diagnostics.ts`;
- eliminar sus tests temporales;
- eliminar todos los documentos `.iterative/...` nacidos de este ciclo y los anteriores del mismo objetivo que ya no tengan función;
- no dejar controllers globales de diagnóstico en release.

## 9. Migración de tests

### Mantener

- scanner quote-aware y mapping físico/lógico;
- common language token bridge;
- presentation semantics;
- Reading processor/fallback;
- Smart Editing.

### Reemplazar o renombrar

- tests que describen DOM inventado como `real`;
- tests del `LivePreviewRenderedBlockBridge`, porque la clase desaparece;
- `live-preview-source-surface.test.ts` debe probar line semantics propias, no `HyperMD-*`.

### Añadir

- build boundary test/metafile assertion: Lezer/CodeMirror host runtime no bundled;
- PowerShell semantic spans tras runtime unificado;
- editor model cache + visible materialization;
- consolidación: máximo una line decoration propia por línea;
- no aparición de `HyperMD-codeblock`, `.cm-embed-block` o `.cm-callout` en código funcional;
- Reading fallback PRE-only/CODE-only/agreement/conflict;
- code-block processor Live Preview se considera gate manual/host, no se simula como API interna.

## 10. Flujo final esperado

```text
                     +-----------------------------+
                     | Markdown source / EditorState|
                     +--------------+--------------+
                                    |
                +-------------------+-------------------+
                |                                       |
         Reading/rendered LP                       LP source
                |                                       |
 registerMarkdownCodeBlockProcessor              Editor extension
                |                                       |
        renderResolvedFence                     cached block model
                |                                       |
           DOM propio                         visible decorations
                |                             /       |        \
                |                           marks    lines     widgets
                |                             |       |          |
                +---------------> theme/CSS <-+-------+----------+
                                      |
                              contrast foreground
```

Reading-only fallback cuelga del lado rendered como postprocessor oficial y nunca del EditorView.

## 11. Criterios arquitectónicos de aceptación

La arquitectura se considera lista para implementación solo si la revisión confirma dos veces consecutivas, sin cambios, que:

1. coincide con el sample oficial en la frontera CodeMirror/Lezer;
2. no muta DOM gestionado por CodeMirror;
3. usa APIs de Markdown para rendered y editor extensions para source;
4. no depende de clases internas de Obsidian para funcionalidad;
5. no hardcodea Nier ni otro tema;
6. mantiene una ruta común de semantic highlighting;
7. evita duplicar line semantics dentro del plugin;
8. mantiene Reading fallback dentro de una API soportada;
9. conserva mobile compatibility del manifest;
10. deja un gate de validación en Obsidian real antes de limpiar diagnostics/temporales.
