# Plan de implementación temporal · Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Este plan ejecuta el plan arquitectónico de Fase 2 estabilizado por TM. Los checkboxes son la fuente de verdad del progreso. No marcar tareas por intención: solo cuando el cambio exista y haya pasado las comprobaciones aplicables.

## 0. Baseline y guardrails

- [ ] Confirmar branch `plan/obsidian-callout-host-fidelity` y CI verde antes de producción Fase 2.
- [ ] Mantener diagnostics y documentos temporales Fase 1/2 hasta gate real satisfactorio.
- [ ] No limpiar ni reescribir routing rendered durante esta fase.
- [ ] Mantener tests arquitectónicos Fase 1 que prohíben private selectors/bridge DOM.
- [ ] Crear/mantener ledger temporal para cualquier test antiguo adaptado o retirado porque su contrato cambie.
- [ ] Cobertura **nueva** se reserva para Fase 8, después del TM de implementación.
- [ ] Registrar aquí cualquier cambio de alcance antes de implementarlo.

## 1. Modelo de engine común y highlighter único

### Tipos y metadata

- [ ] Refactorizar `CommonLanguage` a engine discriminado `tree | stream | plain`.
- [ ] Tree engine conserva factory actual de `LanguageSupport`.
- [ ] Stream engine contiene `StreamParser` y `tokenTags` explícito.
- [ ] Plain engine no tiene parser/support.
- [ ] Eliminar `support()` paralelo que pueda divergir del engine.

### PowerShell declarativo

- [ ] Declarar PowerShell como engine stream con `powerShell` oficial de legacy-modes.
- [ ] Declarar tokenTags públicos para `variable`, `number`, `operator`, `builtin`, `punctuation`, `string`, `comment`, `keyword`, `error`.
- [ ] No introducir `if (language.id === "powershell")` en rendering/materialización.

### Support común

- [ ] Implementar `commonLanguageSupport(language)`.
- [ ] Tree devuelve su support.
- [ ] Stream crea parser efectivo sin mutar parser original.
- [ ] Combinar token tables con precedencia `parser.tokenTable > engine.tokenTags`.
- [ ] Plain devuelve `undefined`.

### Highlighter

- [ ] Crear `COMMON_SEMANTIC_HIGHLIGHT_STYLE` con solo `syntax-common-*`.
- [ ] Mantener temporalmente exports host-specific antiguos solo mientras existan consumidores sin migrar.
- [ ] Ejecutar typecheck + suite existente + build antes de pasar a ranges.

## 2. `common-semantic-ranges.ts`

### Contrato puro

- [ ] Crear `CommonSemanticRange { from, to, classes }`.
- [ ] Crear `commonSemanticRanges(language, source, options?)` dispatcher tree/stream/plain.
- [ ] Módulo sin DOM, EditorView u Obsidian.

### Tree-backed

- [ ] Obtener parser/lenguaje desde engine tree.
- [ ] Parsear como ruta actual.
- [ ] `highlightTree()` con `COMMON_SEMANTIC_HIGHLIGHT_STYLE`.
- [ ] Devolver solo `syntax-common-*`.

### Plain

- [ ] Producir ranges plain sin parser, conservando Text.

### Stream scanner

- [ ] Estado con `startState(indentUnit)` si existe.
- [ ] Recorrer líneas completas en orden.
- [ ] LF.
- [ ] CRLF sin error de offset.
- [ ] Última línea sin terminador.
- [ ] `blankLine(state, indentUnit)` en vacías cuando exista.
- [ ] `StringStream(line, tabSize, indentUnit)` con defaults 4/2.
- [ ] Options explícitas tabSize/indentUnit.
- [ ] `stream.start/pos` → offsets absolutos.
- [ ] Guard finito para `token()` sin avance.

### Stream styles

- [ ] Tabla efectiva `parser.tokenTable > engine.tokenTags`.
- [ ] Resolver tabla efectiva primero.
- [ ] Resolver luego nombres públicos `tags`.
- [ ] Resolver modificadores públicos `.`.
- [ ] Varios style names separados por espacios.
- [ ] `COMMON_SEMANTIC_HIGHLIGHT_STYLE.style(tags)`.
- [ ] Unknown style falla localmente.
- [ ] Cero internals StreamLanguage/NodeProps/TokenTable interno.

### Gate de implementación

- [ ] No añadir tests nuevos todavía.
- [ ] Ejecutar typecheck + suite existente + build; si tests antiguos fallan por contrato deliberadamente retirado, adaptarlos solo tras anotarlos en ledger.
- [ ] No retirar ruta antigua hasta que los consumidores nuevos compilen y la suite existente esté verde.

## 3. Migrar manual highlighting Markdown/Reading

### Reading/rendered

- [ ] `renderCommonCode()` consume `commonSemanticRanges()`.
- [ ] Eliminar `highlightTree()` directo de `reading.ts`.
- [ ] Eliminar clases manuales `token *`.
- [ ] Mantener badge, line numbers, `language-* is-loaded`, presentation y DOM estructural.

### Markdown source

- [ ] `buildEditorBlockSemantics()` consume `commonSemanticRanges()`.
- [ ] Mantener `mapCodeBlockRange()` quoted/top-level.
- [ ] Eliminar clases manuales `cm-*`.
- [ ] Mantener model/cache/viewport Fase 1 sin rediseño.
- [ ] Mantener line decorations/furniture separados.

### Retirada ruta antigua

- [ ] Eliminar `parseCommonLanguageTree()` si queda sin consumidor legítimo o convertirlo en helper tree-only interno.
- [ ] Eliminar exports host-specific cuando todos los consumidores estén migrados.
- [ ] Registrar en ledger tests antiguos adaptados por la retirada de `cm-*`/`token *`.
- [ ] CI existente verde.

## 4. `SyntaxSourceView`

- [ ] Sustituir `common.support()` por `commonLanguageSupport(common)`.
- [ ] Usar `syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHT_STYLE)`.
- [ ] No añadir ViewPlugin stream manual.
- [ ] Conservar language support, indentation/brackets, Smart Editing y lifecycle.
- [ ] Adaptar tests existentes solo si prueban nombres/export retirados, registrándolo en ledger.
- [ ] CI existente verde.

## 5. Source dark surface

### Fallbacks propios realmente sobrescribibles

No declarar los custom properties propios con valor literal en la misma `.cm-line`, porque eso impediría heredar un override de theme/snippet.

- [ ] `background-color: var(--syntax-editor-code-background, #000)`.
- [ ] `color: var(--syntax-editor-code-color, #d4d4d4)` o fallback final equivalente.
- [ ] caret mediante `var(--syntax-editor-code-caret, #d4d4d4)`.
- [ ] Variables `--syntax-*` pueden heredarse desde `body`, theme, snippet o scope superior.

### Integración host sin selectores privados

- [ ] En `.cm-line.syntax-editor-code-source`: `--code-background: transparent`.
- [ ] `--code-normal: var(--syntax-editor-code-color, #d4d4d4)`.
- [ ] `--caret-color: var(--syntax-editor-code-caret, #d4d4d4)`.
- [ ] No `.cm-inline-code`, `HyperMD-*`, `.cm-embed-block`, `.cm-callout`.
- [ ] No `!important`.
- [ ] No margins verticales.

### Paleta sobre negro

- [ ] Revisar cada `.syntax-common-*` en quoted scope con fallback final legible.
- [ ] Orden: variable propia → `--code-*`/`--color-*` → literal legible.
- [ ] Plain no termina en `--text-normal` en quoted source.
- [ ] Sin excepción Nier/nombre de theme.
- [ ] CI existente verde.

## 6. Coherencia y retirada de taxonomía host-specific

- [ ] Buscar producción por `token *` generado por manual highlighter y eliminarlo.
- [ ] Buscar producción por `cm-*` generado por manual highlighter y eliminarlo.
- [ ] No confundir clases creadas por CodeMirror con clases emitidas por Syntax Highlight.
- [ ] `syntax-common-*` queda como única taxonomía semántica manual.
- [ ] Configured profiles permanecen intactos.
- [ ] Tests private-selector boundary siguen verdes.
- [ ] Ledger contiene destino Fase 8 para cada garantía de test retirada/adaptada.

## 7. Revisión TM de implementación

- [ ] Diff completo contra arquitectura Fase 2.
- [ ] Solo APIs públicas stream.
- [ ] Engine/support no duplicados.
- [ ] Sin rama renderer PowerShell.
- [ ] Tree languages no cambian parser accidentalmente.
- [ ] LF/CRLF/blank/zero-length correctos.
- [ ] Manual ranges sin `cm-*`/`token *`.
- [ ] Source dark sin private selectors/`!important` y overrides heredables.
- [ ] Routing rendered intacto.
- [ ] Scope: blocks/presentation/contrast/build/smart-edit/configured tokenizers intactos salvo imports inevitables.
- [ ] Ledger de tests migrados completo.
- [ ] Aplicar correcciones.
- [ ] Repetir hasta dos revisiones consecutivas sin cambios.
- [ ] Solo entonces Fase 8.

## 8. Tests nuevos/reconstruidos Fase 2

### Semantic engine

- [ ] Bash tree produce semantic ranges.
- [ ] Text plain conserva ranges.
- [ ] PowerShell stream produce variable/number/operator/builtin/string/comment/keyword/punctuation.
- [ ] Sin rama renderer por id PowerShell.
- [ ] `parser.tokenTable` gana a `engine.tokenTags`.
- [ ] engine tokenTags rellena nombres ausentes.
- [ ] tags públicos directos.
- [ ] modificadores públicos.
- [ ] múltiples styles.
- [ ] unknown style local.

### Scanner stream

- [ ] estado multilinea con parser sintético.
- [ ] LF offsets.
- [ ] CRLF offsets.
- [ ] última línea sin newline.
- [ ] blankLine.
- [ ] zero-length con cambio de estado permitido.
- [ ] parser que nunca avanza termina por guard.

### Consumidores

- [ ] Reading PowerShell: roles `syntax-common-*`, sin `token *` manuales.
- [ ] Markdown editor PowerShell: roles equivalentes, sin `cm-*` manuales.
- [ ] Bash Reading/editor convergen en roles propios.
- [ ] quoted mapping excluye `>`.
- [ ] line numbers/presentation sin regresión.
- [ ] `commonLanguageSupport(PowerShell)` usa tabla efectiva correcta.
- [ ] SourceView usa helper + semantic highlighter único.

### CSS/arquitectura

- [ ] fallback surface quoted negro.
- [ ] custom prop heredado puede sobrescribir negro.
- [ ] `--code-background` neutralizado scoped.
- [ ] foreground/caret/plain legibles.
- [ ] sin `!important` nuevo.
- [ ] sin private selectors.
- [ ] arquitectura Fase 1 sigue verde.

### Ledger

- [ ] Cada garantía de test adaptado/retirado en implementación tiene sustituto o referencia concreta.

## 9. Revisión TM de tests

- [ ] Cobertura contra cada invariante.
- [ ] No convertir internals CodeMirror en contrato de tests.
- [ ] happy-dom nunca etiquetado host real.
- [ ] Colores: probar variables/clases, no pixel exacto salvo negro explícito.
- [ ] Cerrar ledger.
- [ ] Repetir hasta dos revisiones consecutivas sin cambios.
- [ ] CI completa + `pack:all` verde.

## 10. Gate manual Obsidian real Fase 2

No limpiar diagnostics todavía.

### Visual

- [ ] PowerShell top-level source sigue coloreado.
- [ ] PowerShell top-level rendered coloreado.
- [ ] PowerShell quoted source negro, sin píldoras claras dominantes, semántica coloreada.
- [ ] PowerShell quoted rendered coloreado.
- [ ] Reading PowerShell top-level/quoted coloreado.
- [ ] Bash semánticamente coherente source/rendered sin taxonomía dual nuestra.
- [ ] Text quoted conserva presentation.
- [ ] Cursor source ↔ rendered sin regresión estructural.

### Routing fresco

- [ ] Enable diagnostics antes de crear/renderizar subtree.
- [ ] Crear/modificar contenido después de enable.
- [ ] Inspeccionar eventos nested PowerShell.
- [ ] Confirmar `reading-specialized` si processor oficial es ruta garantizada.
- [ ] Si solo `reading-fallback`, detener limpieza y volver a análisis TM.

### Settings

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
