# Plan de implementación temporal · Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Este plan ejecuta el plan arquitectónico de Fase 2 estabilizado por TM. Los checkboxes son la fuente de verdad del progreso. No marcar una tarea hasta que el cambio exista y haya pasado las comprobaciones aplicables.

## 0. Baseline y guardrails

- [ ] Confirmar branch `plan/obsidian-callout-host-fidelity` y CI verde antes de tocar producción Fase 2.
- [ ] Mantener diagnostics y todos los documentos temporales Fase 1/2 hasta gate real satisfactorio.
- [ ] No limpiar ni modificar routing rendered en esta fase salvo que el gate fresco lo falsifique posteriormente.
- [ ] Mantener tests arquitectónicos Fase 1 que prohíben bridge DOM/private selectors.
- [ ] Mantener externals/peer boundary Fase 1 sin cambios salvo necesidad demostrada.
- [ ] Crear/mantener ledger temporal de tests adaptados/retirados por cambio deliberado de contrato.
- [ ] Reservar cobertura nueva de Fase 2 para la fase de tests, después del TM de implementación; durante implementación solo adaptar tests antiguos cuando bloqueen CI por un contrato que se retira deliberadamente y registrar la garantía.
- [ ] Registrar cualquier cambio de alcance en este plan antes de implementarlo.

## 1. Refactor del catálogo common: engines + highlighter único

### 1.1 Tipos y autoridad

- [ ] Refactorizar `CommonLanguage` a engine discriminado `tree | stream | plain`.
- [ ] Tree engine conserva la factory actual de `LanguageSupport`.
- [ ] Stream engine contiene `StreamParser`, estado inicial explícito y `tokenTags` declarativos.
- [ ] El tipo stream impide llegar al scanner sin una factoría/`startState` explícito.
- [ ] Plain engine no tiene parser/support.
- [ ] Eliminar `support()` paralelo capaz de divergir del engine.

### 1.2 Highlighter semántico

- [ ] Sustituir `COMMON_READING_HIGHLIGHT_STYLE` y `COMMON_EDITOR_HIGHLIGHT_STYLE` por `COMMON_SEMANTIC_HIGHLIGHTER` construido con `tagHighlighter()`.
- [ ] Mantener una única tabla `Tag | Tag[] -> syntax-common-*`.
- [ ] Añadir `tags.invalid -> syntax-common-invalid`.
- [ ] No emitir `cm-*` ni `token *` desde esta tabla.
- [ ] Mantener temporalmente aliases/exports antiguos únicamente mientras existan consumidores todavía no migrados; eliminarlos al cerrar Fase 4.

### 1.3 PowerShell declarativo

- [ ] Declarar PowerShell como stream-backed usando el `powerShell` oficial de legacy-modes.
- [ ] Declarar `tokenTags` al menos para `variable`, `number`, `operator`, `builtin`, `punctuation`, `string`, `comment`, `keyword`, `error`.
- [ ] Mapear `error` a `tags.invalid`.
- [ ] No introducir ningún `if (language.id === "powershell")` en renderer/materialización.

### 1.4 Helpers stream y support en la capa de catálogo

Para evitar ciclos, `common-languages.ts` es también la capa inferior compartida para metadata/resolución stream. `common-semantic-ranges.ts` puede importarla; nunca al revés.

- [ ] Implementar en `common-languages.ts` (o helpers internos del mismo módulo) la resolución efectiva de style words y la construcción de `effectiveStreamParser`.
- [ ] Los helpers no importan `common-semantic-ranges.ts`, renderer, DOM ni EditorView.
- [ ] Crear helper único `commonLanguageSupport(language)`.
- [ ] Tree devuelve el support de su factory.
- [ ] Plain devuelve `undefined`.
- [ ] Stream usa `effectiveStreamParser` sin mutar el parser importado.
- [ ] Ejecutar typecheck + suite existente + build antes de avanzar a semantic ranges.

## 2. Resolver stream efectivo usando solo API pública

### 2.1 Precedencia de styles

- [ ] Definir resolver común en la capa `common-languages.ts` con precedencia: `parser.tokenTable > engine.tokenTags > vocabulario público tags/modifiers > unknown local`.
- [ ] Resolver nombres públicos directos (`keyword`, `number`, `variableName`, etc.).
- [ ] Resolver modificadores públicos con `.` (`variableName.standard`, etc.).
- [ ] Resolver varios style words separados por espacios.
- [ ] Unknown style no aborta el bloque; solo deja ese token sin clase semántica.

### 2.2 Nombres sintéticos para `StreamLanguage`

- [ ] Precalcular nombres sintéticos deterministas para cada style cubierto por `parser.tokenTable` o `engine.tokenTags` (orden estable de claves, no dependiente del orden incidental de iteración futura).
- [ ] Los nombres sintéticos no colisionan con vocabulario público/legacy ni contienen espacios/modificadores.
- [ ] `effectiveStreamParser.token()` llama al token original y reescribe cada style word cubierto a su nombre sintético.
- [ ] `effectiveStreamParser.tokenTable` publica los nombres sintéticos con los `Tag | Tag[]` efectivos.
- [ ] Styles públicos no cubiertos por tablas se dejan intactos.
- [ ] El scanner manual importará y usará este mismo resolver; no tendrá una segunda tabla.

### 2.3 Preservar contrato completo del parser

- [ ] Preservar/delegar `name`.
- [ ] Preservar estado inicial original o la factoría explícita del engine.
- [ ] Preservar `copyState`.
- [ ] Preservar `blankLine`.
- [ ] Preservar `indent`.
- [ ] Preservar `languageData`.
- [ ] Preservar `mergeTokens`.
- [ ] Preservar cualquier otro campo público aplicable del `StreamParser` sin reinterpretarlo.
- [ ] No leer `StreamLanguage.streamParser`, NodeProps, NodeType ids ni TokenTable interno.

## 3. `common-semantic-ranges.ts`

### 3.1 Contrato puro y layering

- [ ] Crear `CommonSemanticRange { from, to, classes }`.
- [ ] Crear `commonSemanticRanges(language, source, options?)` dispatcher tree/stream/plain.
- [ ] Módulo sin DOM, EditorView ni imports de `obsidian`.
- [ ] Importar catálogo/highlighter/resolver stream desde `common-languages.ts`; `common-languages.ts` nunca importa este módulo.
- [ ] Ranges siempre expresados en offsets del string de entrada original.

### 3.2 Tree-backed

- [ ] Obtener parser/lenguaje desde el engine tree.
- [ ] Parsear como ruta tree actual.
- [ ] `highlightTree(tree, COMMON_SEMANTIC_HIGHLIGHTER)`.
- [ ] Emitir solo `syntax-common-*`.
- [ ] No cambiar parsers modernos que ya funcionan.

### 3.3 Plain

- [ ] Text/plain produce semántica plain sin parser.
- [ ] Conservar comportamiento actual de Text/presentation.

### 3.4 Scanner stream

- [ ] Crear estado con factoría explícita y `indentUnit` configurado.
- [ ] Defaults manuales: `tabSize=4`, `indentUnit=2`.
- [ ] Pasar el mismo `indentUnit` a estado inicial y `StringStream`.
- [ ] Permitir options explícitas `tabSize`/`indentUnit`.
- [ ] Recorrer el source sin normalizarlo.
- [ ] LF: offsets correctos.
- [ ] CRLF: un único terminador lógico, avance físico de 2 chars.
- [ ] Última línea sin terminador.
- [ ] Terminador final no crea blank line sintética.
- [ ] Línea vacía física intermedia llama `blankLine` cuando exista.
- [ ] Source vacío no llama token ni `blankLine`.
- [ ] `stream.start/pos` se convierten a offsets absolutos reales.
- [ ] Permitir token zero-length durante un número finito de intentos para respetar el contrato de cambio de estado; resetear el guard cuando el stream avance.
- [ ] Un parser que nunca avanza falla de forma controlada/local.
- [ ] Semantic classes salen de `COMMON_SEMANTIC_HIGHLIGHTER.style(tags)`.

### 3.5 Gate de implementación parcial

- [ ] No añadir todavía tests nuevos de Fase 2.
- [ ] Ejecutar typecheck + suite existente + build.
- [ ] Si un test antiguo falla porque esperaba `cm-*`/`token *` deliberadamente retirados, registrar la garantía en ledger antes de adaptarlo.
- [ ] No retirar consumidores antiguos hasta que `commonSemanticRanges()` compile y el baseline siga verde.

## 4. Migrar consumidores manuales y SourceView

### 4.1 Reading/rendered

- [ ] `renderCommonCode()` consume `commonSemanticRanges()`.
- [ ] Eliminar `highlightTree()` directo de `reading.ts`.
- [ ] Eliminar clases manuales `token *` del renderer common.
- [ ] Mantener badge, line numbers, `language-* is-loaded`, presentation y estructura DOM.
- [ ] Mantener `CommonContrastManager` rendered-only sin cambios funcionales.

### 4.2 Markdown source

- [ ] `buildEditorBlockSemantics()` consume `commonSemanticRanges()`.
- [ ] Mantener `mapCodeBlockRange()` para quoted/top-level.
- [ ] Eliminar clases manuales `cm-*`.
- [ ] Mantener model/cache/viewport de Fase 1 sin rediseñarlo.
- [ ] Mantener line semantics/furniture separados de semantic ranges.

### 4.3 `SyntaxSourceView`

- [ ] Sustituir `common.support()` por `commonLanguageSupport(common)`.
- [ ] Usar `syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER)`.
- [ ] No añadir ViewPlugin stream manual.
- [ ] Conservar language support, indentation, brackets, Smart Editing y lifecycle.

### 4.4 Retirada ruta antigua

- [ ] Eliminar `parseCommonLanguageTree()` si queda sin consumidor o convertirlo en helper estrictamente tree-only donde corresponda.
- [ ] Eliminar exports host-specific antiguos cuando no queden consumidores.
- [ ] Confirmar que manual common output ya no genera `cm-*` ni `token *`.
- [ ] Registrar tests antiguos adaptados en ledger.
- [ ] CI existente verde.

## 5. Source quoted dark surface + paleta accesible

### 5.1 Surface propia y overrides heredables

- [ ] `background-color: var(--syntax-editor-code-background, #000)`.
- [ ] `color: var(--syntax-editor-code-color, #d4d4d4)` o fallback final equivalente.
- [ ] caret usa `var(--syntax-editor-code-caret, #d4d4d4)`.
- [ ] No declarar las custom props propias con literales en la misma línea de forma que bloquee overrides heredados.
- [ ] Themes/snippets pueden definir `--syntax-editor-code-*` en scope superior.

### 5.2 Paleta scoped

- [ ] Definir/consumir variables propias al menos para `color`, `comment`, `keyword`, `function`, `string`, `value`, `operator`, `property`, `punctuation`, `tag`, `important`, `invalid`, `caret`.
- [ ] Elegir defaults dark-safe con contraste >= 4.5:1 sobre `#000` para roles de texto ordinario.
- [ ] Documentar cualquier excepción puramente decorativa si se decide una.
- [ ] `syntax-common-invalid` usa variable propia y fallback de error legible.

### 5.3 Reasignación de variables públicas dentro de quoted source

- [ ] `--code-background: transparent`.
- [ ] `--code-normal` -> paleta propia.
- [ ] `--code-comment` -> paleta propia.
- [ ] `--code-function` -> paleta propia.
- [ ] `--code-important` -> paleta propia.
- [ ] `--code-keyword` -> paleta propia.
- [ ] `--code-string` -> paleta propia.
- [ ] `--code-value` -> paleta propia.
- [ ] `--code-operator` -> paleta propia.
- [ ] `--code-property` -> paleta propia.
- [ ] `--code-punctuation` -> paleta propia.
- [ ] `--code-tag` -> paleta propia.
- [ ] `--caret-color` -> caret propio.
- [ ] La surface de la línea no consume el `--code-background` neutralizado.

### 5.4 Restricciones

- [ ] No `.cm-inline-code`, `HyperMD-*`, `.cm-embed-block`, `.cm-callout` como dependencia funcional.
- [ ] No `!important` nuevo.
- [ ] No branch por Nier/tema.
- [ ] No margins verticales que alteren layout del editor.
- [ ] Opening/body/closing comparten surface/paleta; alignment/flow solo body.
- [ ] CI existente verde.

## 6. Coherencia y prohibiciones

- [ ] Buscar producción por `token *` generado por manual common y eliminarlo.
- [ ] Buscar producción por `cm-*` generado por manual common y eliminarlo.
- [ ] No confundir clases generadas por CodeMirror/host con clases emitidas por Syntax Highlight.
- [ ] `syntax-common-*` es la única taxonomía semántica manual common.
- [ ] Configured profiles permanecen intactos.
- [ ] Fase 1 private-selector/build/runtime tests siguen verdes.
- [ ] Routing rendered no cambia.
- [ ] Ledger tiene destino de Fase 8 para cada garantía adaptada/retirada.

## 7. Revisión TM de implementación

- [ ] Revisar diff completo contra arquitectura Fase 2.
- [ ] Confirmar layering sin ciclo `common-languages -> common-semantic-ranges`.
- [ ] Confirmar solo APIs públicas stream.
- [ ] Confirmar engine/support no duplicados.
- [ ] Confirmar wrapper preserva contrato completo del parser.
- [ ] Confirmar nombres sintéticos evitan dependencia de aliases internos.
- [ ] Confirmar no existe rama renderer PowerShell.
- [ ] Confirmar tree languages no cambian parser accidentalmente.
- [ ] Revisar LF/CRLF/blank/final newline/source vacío/zero-length.
- [ ] Manual ranges sin `cm-*`/`token *`.
- [ ] `syntax-common-invalid` presente y usable.
- [ ] Source dark sin private selectors/`!important`, con overrides heredables y paleta completa.
- [ ] Verificar contraste estático de defaults dark previsto para Fase 8.
- [ ] SourceView sigue ruta nativa CodeMirror.
- [ ] Routing rendered intacto.
- [ ] Scope: `blocks`, presentation, contrast manager, build, smart-edit y configured tokenizers intactos salvo imports/tipos inevitables.
- [ ] Ledger completo.
- [ ] Aplicar correcciones encontradas.
- [ ] Repetir hasta dos revisiones consecutivas sin cambios.
- [ ] Solo entonces pasar a tests nuevos Fase 8.

## 8. Tests nuevos/reconstruidos Fase 2

### 8.1 Engine/highlighter

- [ ] Bash tree produce semantic ranges `syntax-common-*`.
- [ ] Text plain conserva semántica parserless.
- [ ] PowerShell stream produce variable/number/operator/builtin/string/comment/keyword/punctuation/invalid.
- [ ] No existe rama renderer por id PowerShell.
- [ ] `COMMON_SEMANTIC_HIGHLIGHTER` creado con `tagHighlighter` funciona con `highlightTree`.
- [ ] `COMMON_SEMANTIC_HIGHLIGHTER.style(tags)` funciona para stream.
- [ ] `syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER)` funciona en EditorView propio.

### 8.2 Resolver/parser efectivo

- [ ] `parser.tokenTable` gana a `engine.tokenTags`.
- [ ] engine tokenTags rellena nombres ausentes.
- [ ] nombres públicos directos.
- [ ] modificadores públicos.
- [ ] múltiples style words.
- [ ] unknown style falla localmente.
- [ ] nombre original que colisiona con alias legacy se reescribe a synthetic y mantiene la semántica declarada.
- [ ] nombres sintéticos son deterministas y no aparecen en semantic classes/DOM.
- [ ] `effectiveStreamParser` preserva `name`.
- [ ] preserva `languageData`.
- [ ] preserva `indent`.
- [ ] preserva `copyState`.
- [ ] preserva `blankLine`.
- [ ] preserva `mergeTokens`.
- [ ] preserva/usa estado inicial explícito.

### 8.3 Scanner stream

- [ ] estado multilinea con parser sintético.
- [ ] LF offsets.
- [ ] CRLF offsets.
- [ ] última línea sin newline.
- [ ] newline final no crea blank sintética.
- [ ] blank line intermedia llama `blankLine`.
- [ ] source vacío no llama token/blankLine.
- [ ] `startState` y `StringStream` reciben mismo indentUnit.
- [ ] options tabSize/indentUnit.
- [ ] zero-length con transición de estado puede avanzar después.
- [ ] parser que nunca avanza termina por guard controlado.

### 8.4 Consumidores

- [ ] Reading PowerShell usa roles `syntax-common-*`, sin `token *` manuales.
- [ ] Markdown editor PowerShell usa roles equivalentes, sin `cm-*` manuales.
- [ ] Bash Reading/editor manual convergen en roles propios aunque el host pueda añadir styling nativo adicional.
- [ ] quoted mapping excluye `>`.
- [ ] line numbers/presentation sin regresión.
- [ ] `commonLanguageSupport(PowerShell)` usa el mismo resolver efectivo.
- [ ] SourceView usa helper + highlighter único y mantiene capabilities del parser.

### 8.5 CSS/arquitectura

- [ ] fallback surface quoted negro.
- [ ] override heredado de `--syntax-editor-code-background` sustituye negro.
- [ ] foreground/caret legibles.
- [ ] paleta semantic dark completa.
- [ ] contraste >= 4.5:1 sobre negro para roles exigidos, incluido invalid/error.
- [ ] `--code-background` neutralizado solo dentro de quoted source.
- [ ] `--code-important` y demás `--code-*` remapeados a paleta propia.
- [ ] no `!important` nuevo.
- [ ] no private selectors nuevos.
- [ ] arquitectura Fase 1 sigue verde.

### 8.6 Ledger

- [ ] Cada garantía de test adaptado/retirado durante implementación tiene sustituto o referencia concreta.

## 9. Revisión TM de tests

- [ ] Cobertura frente a cada invariante arquitectónico Fase 2.
- [ ] No convertir internals CodeMirror en contrato de tests.
- [ ] happy-dom nunca etiquetado host real.
- [ ] Probar roles/variables, no pixel exacto salvo negro explícito y contrastes matemáticos.
- [ ] Cerrar ledger.
- [ ] Repetir hasta dos revisiones consecutivas sin cambios.
- [ ] CI completa (`lint`, `typecheck`, tests, build, `pack:all`) verde.

## 10. Gate manual Obsidian real Fase 2

No limpiar diagnostics todavía.

### 10.1 Visual

- [ ] PowerShell top-level source sigue coloreado/legible.
- [ ] PowerShell top-level rendered coloreado por semantic ranges propios.
- [ ] PowerShell quoted source negro, sin píldoras claras dominantes y con semántica propia visible.
- [ ] PowerShell quoted rendered coloreado.
- [ ] Reading PowerShell top-level/quoted coloreado.
- [ ] Bash mantiene semántica propia correcta; diferencias puramente nativas de theme entre motores no son criterio de fallo.
- [ ] Text quoted conserva presentation.
- [ ] Cursor source ↔ rendered sin regresión estructural.

### 10.2 Routing fresco

- [ ] Enable diagnostics antes de crear/renderizar subtree.
- [ ] Crear una nota nueva o modificar documento después de enable.
- [ ] Capturar todos los eventos del nested PowerShell fresco.
- [ ] Confirmar `reading-specialized` si processor oficial es ruta garantizada.
- [ ] Si solo aparece `reading-fallback`, detener limpieza y volver a análisis/arquitectura TM.

### 10.3 Settings

- [ ] `markdownEditor=false` elimina semantic decorations propias.
- [ ] `markdownReading=false` mantiene Reading sin renderer semántico propio.

## 11. Limpieza final conjunta Fase 1 + Fase 2

Solo tras gate satisfactorio:

- [ ] Eliminar `_tmp-host-diagnostics.ts` y suites temporales.
- [ ] Retirar wiring/controller global diagnostics.
- [ ] Actualizar `packages/obsidian/README.md` al modelo sin bridge y engines tree/stream/plain.
- [ ] Actualizar `docs/theme-integration.md` a `syntax-common-*` + variables públicas/source dark.
- [ ] Revisar CHANGELOG si describe bridge retirado como arquitectura vigente.
- [ ] Eliminar todos los `.iterative/callout-host-fidelity/*` agotados, Fase 1 + 2.
- [ ] CI final + `pack:all`.
- [ ] Auditar diff final sin temporales ni excepciones private-selector.
