# Análisis temporal · Fase 1 · arquitectura Obsidian-native

Estado: TEMPORAL. Eliminar al cerrar implementación, tests y validación real de este ciclo.

## Objetivo

Rediseñar la integración de Syntax Highlight con Obsidian para que las fronteras de runtime, rendering y Live Preview usen contratos soportados por Obsidian/CodeMirror, en vez de depender de identidad de módulos duplicada o de DOM interno de Live Preview.

No se busca solo corregir PowerShell o un callout concreto. El objetivo es que la arquitectura explique y soporte de forma estable:

- lenguajes configurados y comunes;
- Reading View y Live Preview;
- representación rendered y representación source;
- top-level y blockquote/callout;
- Text/Markdown presentacional;
- temas comunitarios sin tablas por nombre de tema;
- contraste, line numbers y Smart Editing sin duplicar responsabilidades.

## Fuentes de autoridad revisadas

Se contrastó la implementación actual con:

1. **Obsidian Developer Documentation · Decorations**: para cambiar el aspecto de Live Preview se deben usar editor extensions y decorations. ViewPlugin es apropiado cuando la decoración se determina desde lo visible/viewport; StateField cuando debe mantenerse fuera del viewport o afectar estructura vertical.
2. **CodeMirror Reference/System Guide**: el DOM de contenido de CodeMirror no debe modificarse directamente; la representación se altera mediante decorations. Mark nesting depende de precedencia; line decorations añaden atributos al wrapper de línea.
3. **Obsidian sample plugin oficial · esbuild.config.mjs**: externaliza `obsidian`, los paquetes `@codemirror/*` y también `@lezer/common`, `@lezer/highlight` y `@lezer/lr`.
4. **Obsidian plugin API / maintainer guidance**: `registerMarkdownCodeBlockProcessor` funciona tanto en Reading View como en Live Preview. La representación editable de Live Preview debe resolverse mediante una editor extension.
5. **Obsidian CSS guidance**: plugins deben usar clases propias y variables CSS de Obsidian; no deben sobrescribir ni depender de styling core interno cuando pueda evitarse.
6. **CodeMirror decoration precedence**: varias fuentes de decorations se componen; los marks pueden anidarse/dividirse según precedencia. Reutilizar nombres de clases internas de otra extensión no equivale a participar en su mismo contrato estructural.

## Estado actual reconstruido

### Arranque

`main.ts` crea:

- `LanguageRegistry`;
- `ThemeManager` + `CommonContrastManager`;
- code-block processors por fence seguro;
- Reading postprocessor fallback;
- source-file views;
- `createMarkdownEditorExtensions()` para Live Preview/source.

### Rendered

`renderResolvedFence()` converge configured/common en `reading.ts`, que crea DOM propio `syntax-highlight-frame > pre > code`.

- Reading View entra por `registerMarkdownCodeBlockProcessor` o por el fallback estructural tardío.
- Live Preview rendered puede entrar por el processor oficial, pero además existe `LivePreviewRenderedBlockBridge`, un ViewPlugin que observa el DOM con `MutationObserver`, busca `.cm-embed-block`, detecta PRE/CODE y reemplaza nodos manualmente.

### Source

`createEditorHighlighter()` es un ViewPlugin que:

1. lee todo `state.doc`;
2. ejecuta `findCodeBlocks()`;
3. separa cuerpo lógico de offsets físicos;
4. tokeniza/parsa;
5. mapea rangos lógicos a offsets del Markdown;
6. emite `Decoration.mark`, `Decoration.line` y widgets de números de línea.

Actualmente existen dos productores independientes de `Decoration.line` para una misma línea quoted:

- presentation (`syntax-presentational`, alignment/flow);
- surface (`syntax-quoted-code-source HyperMD-codeblock HyperMD-codeblock-*-bg`).

El segundo imita clases privadas/de implementación de Obsidian/Nier.

## Hallazgo A · frontera de runtime incorrecta

`packages/obsidian/esbuild.config.mjs` externaliza CodeMirror (`@codemirror/language`, `state`, `view`, etc.) pero **no** externaliza Lezer.

A la vez:

- `StreamLanguage` se importa desde `@codemirror/language`, por lo que en Obsidian real procede del runtime del host;
- `common-languages.ts` importa `tags` desde `@lezer/highlight`;
- `editor.ts`/`reading.ts` usan `highlightTree`/HighlightStyle sobre árboles producidos por lenguajes CodeMirror.

La implementación de `StreamLanguage` resuelve nombres legacy (`builtin`, etc.) a tags de Lezer y escribe esos tags en el árbol mediante propiedades privadas del módulo de highlight. `highlightTree` lee esas propiedades y compara tags por identidad.

Si CodeMirror usa el Lezer del host y el plugin empaqueta otra copia de Lezer, árbol y highlighter pueden pertenecer a universos de identidad distintos. En tests todo se resuelve desde el mismo `node_modules`, por lo que esa frontera no se reproduce.

El sample oficial de Obsidian externaliza explícitamente `@lezer/common`, `@lezer/highlight` y `@lezer/lr` junto con CodeMirror. El paquete `obsidian` declara esos módulos como peers.

### Consecuencia

La primera mejora obligatoria es una **frontera de runtime única**:

- externalizar toda la familia CodeMirror/Lezer que Obsidian proporciona;
- declarar explícitamente esos requisitos de runtime en el paquete Obsidian;
- añadir una verificación de build para impedir que una copia de Lezer vuelva a colarse en `main.js`.

Este cambio debe preceder cualquier juicio sobre los colores PowerShell.

## Hallazgo B · el bridge rendered de Live Preview viola la frontera del editor

`LivePreviewRenderedBlockBridge` observa `view.dom` con `MutationObserver` y reemplaza PREs dentro de `.cm-embed-block`.

Problemas arquitectónicos:

1. `.cm-embed-block`, `.cm-callout` y la estructura interior son implementación de Live Preview, no API estable.
2. CodeMirror documenta que no debe modificarse directamente la estructura DOM que crea para el contenido; deben usarse decorations.
3. Obsidian ofrece una API específica para contenido rendered: `registerMarkdownCodeBlockProcessor`, y los mantenedores confirman que funciona en Reading View y Live Preview.
4. La evidencia real de este ciclo ya mostró que el processor especializado sí se invoca para PowerShell dentro del callout.

### Consecuencia

La arquitectura rendered debe quedar así:

- **Reading + rendered Live Preview**: code-block processor oficial como ruta primaria y única ruta Live Preview soportada;
- **Reading fallback**: postprocessor tardío solo para Reading View, porque es una API soportada y cubre DOM nativo que el processor no reclamó;
- **sin MutationObserver ni reemplazo manual de DOM de CodeMirror en Live Preview**.

Los aliases que Obsidian no permite registrar de forma segura no justifican manipular DOM privado. En Live Preview rendered deben quedar nativos si no existe una ruta oficial segura; Reading puede seguir recuperándolos mediante su postprocessor.

## Hallazgo C · source debe usar semántica propia, no impersonar clases internas del host

La Fase 0C añadió `HyperMD-codeblock*` a nuestras line decorations para intentar reutilizar styling de Nier/Obsidian.

Eso confunde dos contratos:

- `Decoration.line` propia en un rango documental;
- clases internas que Obsidian asigna como parte de su propia representación HyperMD.

Aunque el nombre CSS sea idéntico, no convierte nuestra decoration en una pieza de la extensión interna de Obsidian. Además crea dependencia de clases no documentadas y hace que el resultado dependa de precedencia/reconciliación de otras decorations.

### Consecuencia

Source pasa a tener **clases exclusivamente propias**:

- `syntax-editor-code-line`;
- roles propios de opening/body/closing cuando sean necesarios;
- `syntax-presentational` + familia/alignment/flow;
- tokens `syntax-common-*` y clases `cm-*` compatibles donde sea útil.

La superficie propia se estiliza con variables CSS oficiales de Obsidian y una variable pública del plugin, por ejemplo:

`--syntax-editor-code-background: var(--code-background)`.

No se garantiza imitar selectores internos de un tema concreto. Si un tema desea una superficie distinta puede sobrescribir la variable del plugin. Esto sigue la guía oficial: clase propia + variables semánticas.

## Hallazgo D · las line decorations propias deben ser una sola capa lógica

Actualmente presentation y quoted surface crean decoraciones de línea separadas para la misma posición.

Aunque CodeMirror puede componer atributos, esa división añade una frontera artificial dentro del propio plugin y complica precedencia, tests y diagnóstico.

### Consecuencia

Crear un único generador de **line semantics** por línea física que reúna:

- surface role;
- presentation family;
- alignment;
- flow;
- cualquier metadata estable propia.

Cada línea recibe como máximo una `Decoration.line` de Syntax Highlight. Los token marks y widgets siguen siendo capas distintas porque cumplen funciones distintas.

## Hallazgo E · el ViewPlugin actual mezcla modelo y materialización

`buildSyntaxDecorations()` escanea y tokeniza todo el documento cada vez que cambia doc/revision, y produce inmediatamente todos los tipos de decoration.

Obsidian recomienda ViewPlugin para trabajo ligado al viewport. La arquitectura actual tampoco separa:

1. descubrimiento/modelo de bloques;
2. semántica de tokens;
3. line semantics;
4. furniture;
5. materialización visible.

### Consecuencia

Mantener ViewPlugin, porque necesitamos cooperar con Live Preview y su viewport, pero dividir internamente:

- **document model cache**: `findCodeBlocks()` + resolución de lenguaje, recalculado solo con doc/revision;
- **materialización visible**: decorations construidas para bloques/líneas que intersectan `view.visibleRanges`;
- recalcular materialización en `docChanged`, `viewportChanged`, cambios de revision y cambios de selección cuando puedan cambiar la representación source/rendered del host.

No se introduce StateField salvo que una revisión demuestre que una decoration necesita existir fuera del viewport o alterar estructura vertical. Nuestros marks, line attributes y widgets inline encajan en ViewPlugin según la documentación oficial.

## Hallazgo F · responsabilidades visuales

### Lenguajes comunes

Deben seguir dos vías compatibles:

- clase semántica propia `syntax-common-*` como contrato estable del plugin;
- clase compatible `cm-*` en source / `token *` en rendered como oportunidad para que temas las estilicen.

El fallback garantizado debe proceder de variables CSS oficiales (`--code-*`, `--text-*`) y no depender de que exista un ancestor `HyperMD-codeblock`.

### Lenguajes configurados

Mantienen `syntax-color-<lang>-<category>` y sus paletas explícitas.

### Contraste

`CommonContrastManager` sigue siendo una fase posterior y solo actúa sobre `syntax-common-*`. No debe convertirse en gestor de surface ni de lifecycle.

## Hallazgo G · diagnostics y tests anteriores

La instrumentación 0D fue útil para identificar fronteras, pero es temporal.

Durante la implementación arquitectónica puede permanecer para validar el host real. Tras validación final debe eliminarse junto con sus tests temporales.

Tests como `live-preview-extension-integration.test.ts` y `live-preview-source-surface.test.ts` pueden conservar garantías lógicas, pero no deben denominarse ni tratarse como prueba de fidelidad del host real.

## Arquitectura objetivo resumida

```text
Markdown document
   |
   +--> Reading / rendered LP
   |      |
   |      +--> registerMarkdownCodeBlockProcessor (API oficial)
   |      |        -> renderResolvedFence
   |      |        -> DOM propio
   |      |
   |      +--> Reading-only fallback postprocessor
   |
   +--> Live Preview source
          |
          +--> registerEditorExtension
                  -> ViewPlugin
                  -> cached document block model
                  -> visible materialization
                       - one line decoration / line
                       - token marks
                       - inline furniture

Runtime de parsing/highlighting:
Obsidian CodeMirror + Obsidian Lezer (una sola identidad)
```

## Archivos que previsiblemente se tocan

### Build/runtime

- `packages/obsidian/esbuild.config.mjs`
- `packages/obsidian/package.json`
- `package-lock.json`
- posible helper/verification script de externals

### Source editor

- `packages/obsidian/src/editor.ts`
- posible nuevo módulo para modelo/materialización (`markdown-code-model.ts` o equivalente) si la revisión arquitectónica confirma que reduce responsabilidades
- `packages/obsidian/styles.css`

### Rendered integration

- `packages/obsidian/src/live-preview-host.ts`: candidato a eliminación completa
- `packages/obsidian/src/main.ts`: dejar de registrar bridge DOM si procede
- `packages/obsidian/src/reading-host.ts`: conservar solo responsabilidades Reading/rendered compartidas que sigan siendo necesarias

### Common highlighting

- `packages/obsidian/src/common-languages.ts`
- `packages/obsidian/src/reading.ts` solo si hace falta adaptar contratos, no para parchear PowerShell específicamente

### Diagnostics/tests/docs

- `_tmp-host-diagnostics.ts` y tests temporales: conservar hasta validación, eliminar al final
- tests del bridge Live Preview: retirar/migrar garantías útiles
- `docs/theme-integration.md` y `packages/obsidian/README.md`: corregir arquitectura documentada

## Invariantes de la mejora

1. Ningún código de producción escanea o reemplaza DOM interno de CodeMirror mediante MutationObserver.
2. Ningún CSS/TS de producción depende de `.cm-embed-block`, `.cm-callout` o `HyperMD-codeblock*` para implementar funcionalidad propia.
3. El bundle Obsidian no incluye copias privadas de módulos CodeMirror/Lezer que el host proporciona.
4. Reading/rendered y source tienen fronteras explícitas y distintas.
5. Un bloque top-level y quoted entra en el mismo modelo semántico; solo cambia su mapping físico/presentation de línea.
6. Cada línea recibe como máximo una line decoration propia de Syntax Highlight.
7. La integración temática usa clases propias + variables oficiales; las clases `cm-*`/`token *` son compatibilidad de tokens, no infraestructura de layout.
8. El plugin funciona sin conocer el nombre del tema activo.
9. No se modifica source, selection ni DOM directamente para pintar Live Preview.
10. La validación final incluye host real; happy-dom prueba lógica/wiring, no fidelidad de Obsidian.
