# Plan de implementación temporal · Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Checklist operativo vigente. La arquitectura detallada vive en `phase-2-architecture-plan.md`.

## 0. Baseline y guardrails

- [x] Baseline CI verde en `plan/obsidian-callout-host-fidelity`.
- [x] Mantener diagnostics/documentos temporales hasta gate real.
- [x] Mantener routing rendered, private-selector prohibition y runtime boundary de Fase 1.
- [x] Ledger temporal de tests antiguos adaptados.
- [x] Cobertura nueva reservada para después del TM de implementación.

## 1. Catálogo common y highlighter único

- [x] `CommonLanguage` usa engine `tree | stream | plain`.
- [x] Engine es fuente única de `LanguageSupport` y metadata manual.
- [x] `startState` opcional se normaliza como la API pública de CodeMirror.
- [x] PowerShell es stream-backed con tokenTags declarativos públicos.
- [x] Bash/Nushell y demás gramáticas modernas siguen tree-backed; Text plain.
- [x] `COMMON_SEMANTIC_HIGHLIGHTER` es la única tabla Tag → `syntax-common-*`.
- [x] Sin rama renderer específica PowerShell.

## 2. Resolver stream / parser efectivo

- [x] Precedencia `parser.tokenTable > engine.tokenTags > tags/modifiers públicos > unknown local`.
- [x] Resolver estático cacheado una vez por engine.
- [x] Nombres explícitos se reescriben a synthetic deterministas para el `StreamLanguage` nativo.
- [x] Synthetic usa solo el contrato público `StreamParser.tokenTable`, sin copiar/consultar aliases legacy internos.
- [x] Parser original no se muta.
- [x] Se preservan/delegan `name`, start state, `copyState`, `blankLine`, `indent`, `languageData`, `mergeTokens`.
- [x] Sin `StreamLanguage.streamParser`, NodeProps, NodeType ids o TokenTable interno.

## 3. `common-semantic-ranges.ts`

- [x] Módulo puro sin DOM/EditorView/Obsidian.
- [x] Tree: parser actual + `highlightTree` con highlighter único.
- [x] Plain: `syntax-common-plain` sin parser.
- [x] Stream: `StringStream` directo + estado mutable.
- [x] Defaults manuales `tabSize=4`, `indentUnit=2`; options explícitas.
- [x] LF/CRLF offsets físicos, última línea no terminada.
- [x] Blank line física intermedia llama `blankLine`; source vacío/final virtual siguen límite StreamLanguage.
- [x] Zero-length token tiene guard finito.
- [x] Unknown style omite solo ese token semántico.

## 4. Consumidores y retirada de taxonomía host-specific

- [x] `renderCommonCode()` consume `commonSemanticRanges()`.
- [x] Reading/rendered manual no emite `token *`.
- [x] `buildEditorBlockSemantics()` consume semantic ranges + `mapCodeBlockRange()`.
- [x] Markdown source manual no emite `cm-*`.
- [x] Model/cache/viewport, line semantics y line numbers de Fase 1 conservados.
- [x] `SyntaxSourceView` usa `commonLanguageSupport()` + `syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER)`.
- [x] Sin ViewPlugin stream manual en SourceView.
- [x] `parseCommonLanguageTree()` y highlighters host-specific retirados.
- [x] Tests antiguos de `support`, Prism y CM adaptados después de registrarlos en ledger.
- [x] Suite existente + build + `pack:all` verdes tras migración semántica.

## 5. Quoted source dark surface

### 5.1 Base ya implementada

- [x] Background `var(--syntax-editor-code-background, #000)`.
- [x] Foreground `var(--syntax-editor-code-color, #d4d4d4)`.
- [x] Caret `var(--syntax-editor-code-caret, #d4d4d4)`.
- [x] Variables propias quedan heredables desde un ancestro.
- [x] `--code-background: transparent` scoped a `.cm-line.syntax-editor-code-source`.
- [x] Sin private selectors, `!important`, branch por theme o margins verticales.

### 5.2 Paleta dark-safe completa

- [x] `--code-normal` → `--syntax-editor-code-color` → `#d4d4d4`.
- [x] `--code-comment` → `--syntax-common-comment` → `#6a9955`.
- [x] `--code-function` → `--syntax-common-callable` → `#dcdcaa`.
- [x] `--code-important` → `--syntax-common-regex` → `#d16969`.
- [x] `--code-keyword` → `--syntax-common-keyword` → `#c586c0`.
- [x] `--code-string` → `--syntax-common-string` → `#ce9178`.
- [x] `--code-value` → `--syntax-common-number` → `#b5cea8`.
- [x] `--code-operator` → `--syntax-common-operator` → `#d4d4d4`.
- [x] `--code-property` → `--syntax-common-property` → `#9cdcfe`.
- [x] `--code-punctuation` → `--syntax-common-punctuation` → `#d4d4d4`.
- [x] `--code-tag` → `--syntax-common-meta` → `#c586c0`; type conserva `#4ec9b0`.
- [x] `--caret-color` → `--syntax-editor-code-caret` → `#d4d4d4`.
- [x] `syntax-common-invalid` quoted → `--syntax-common-invalid` → `#f44747`.
- [x] Line numbers quoted → `--syntax-editor-code-line-number` → `#858c99`.
- [x] Roles scoped consumen primero `--syntax-common-*` y después `--code-*` remapeado.
- [x] CI existente + build + `pack:all` verdes tras completar la paleta.

## 6. Coherencia y scope

- [x] `syntax-common-*` es única taxonomía semántica manual common.
- [x] Configured profiles intactos.
- [x] `blocks.ts`, presentation, contrast manager, build boundary, Smart Editing y configured tokenizers sin cambio funcional.
- [x] Routing rendered intacto.
- [x] Guardrails Fase 1 siguen verdes.
- [x] Ledger contiene todas las expectativas antiguas adaptadas.

## 7. TM de implementación

- [x] Revisión 1: CAMBIOS NECESARIOS.
- [x] Revisión 2: CAMBIOS NECESARIOS.
- [x] Revisión 3: CAMBIOS NECESARIOS; reapertura arquitectónica por contraste.
- [x] Arquitectura y plan reestabilizados tras reapertura.
- [x] Revisión 4 SIN CAMBIOS.
- [x] Revisión 5 consecutiva SIN CAMBIOS.
- [x] Implementación estable según TM antes de tests nuevos.

## 8. Tests nuevos/reconstruidos Fase 2

### Engine/resolver
- [x] Bash tree, Text plain y PowerShell stream producen roles propios correctos.
- [x] PowerShell cubre variable/number/operator/builtin/string/comment/keyword/punctuation/invalid.
- [x] `parser.tokenTable` > engine tokenTags; tags públicos/modifiers/múltiples styles/unknown local.
- [x] Synthetic evita colisión legacy y no aparece en semantic output.
- [x] Parser sin `startState` usa estado trivial coherente con support nativo.
- [x] `engine.tokenTags` rellena styles ausentes también para la ruta nativa.

### Scanner
- [x] Estado multilinea sintético.
- [x] LF/CRLF offsets, última línea no terminada, blank line física.
- [x] Source vacío/final virtual no añaden blankLine.
- [x] Zero-length con cambio de estado funciona; parser bloqueado termina por guard.

### Consumidores
- [x] Reading/editor PowerShell convergen en roles propios y sin `token *`/`cm-*` manuales.
- [x] Bash Reading/editor conservan roles semánticos significativos.
- [x] Quote mapping excluye `>`; line numbers/presentation/cache de Fase 1 siguen verdes.
- [x] SourceView usa support nativo + highlighter único para PowerShell y Bash.

### CSS/arquitectura
- [x] Surface default negra; override heredado puede cambiarla.
- [x] Familia `--code-*` scoped deriva de paleta dark-safe propia.
- [x] Contraste estático de fallbacks ordinarios >=4.5:1 sobre `#000`.
- [x] Invalid y line numbers legibles.
- [x] Sin private selectors/`!important` nuevo.
- [x] Guardrails Fase 1 verdes.
- [x] Ledger cerrado con cobertura concreta o gate real explícito.

## 9. TM de tests

- [x] Revisiones 1–5: CAMBIOS NECESARIOS, documentadas en `phase-2-tests-review.md`.
- [x] Revisión 6 completa SIN CAMBIOS: cobertura.
- [x] Revisión 7 consecutiva SIN CAMBIOS: fragilidad/contratos.
- [x] CI validado: 43 archivos / 288 tests + build + `pack:all` + artifact.
- [x] Tests Fase 2 estables según TM.

## 10. Gate manual Obsidian real

No limpiar diagnostics todavía.

### Visual
- [ ] PowerShell top-level source sigue coloreado.
- [ ] PowerShell top-level rendered coloreado.
- [ ] PowerShell quoted source negro, sin píldoras claras dominantes y coloreado.
- [ ] PowerShell quoted rendered coloreado.
- [ ] Reading PowerShell top-level/quoted coloreado.
- [ ] Bash conserva roles coherentes source/rendered; no se exige identidad pixel-perfect del host.
- [ ] Text quoted conserva presentation.
- [ ] Cursor source ↔ rendered sin regresión.

### Routing fresco
- [ ] Enable diagnostics antes de crear/renderizar subtree.
- [ ] Crear/modificar contenido después del enable.
- [ ] Confirmar `reading-specialized`; si solo `reading-fallback`, detener limpieza y volver a análisis TM.

### Settings
- [ ] `markdownEditor=false` elimina semantic decorations propias.
- [ ] `markdownReading=false` mantiene Reading sin renderer semántico propio.

## 11. Limpieza final conjunta Fase 1 + Fase 2

Solo tras gate satisfactorio:

- [ ] Eliminar diagnostics/controller/wiring temporal.
- [ ] Actualizar README/theme integration/changelog obsoletos.
- [ ] Eliminar todos los `.iterative/callout-host-fidelity/*` agotados.
- [ ] CI final + `pack:all`.
- [ ] Auditar diff final sin temporales ni excepciones private-selector.
