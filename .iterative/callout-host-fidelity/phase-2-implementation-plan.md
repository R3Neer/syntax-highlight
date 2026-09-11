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

### 5.2 Reabierto tras Revisión arquitectónica 6

Remapear dentro de `.cm-line.syntax-editor-code-source` cada variable pública relevante a **variable propia heredable → literal dark-safe**:

- [ ] `--code-normal` → `--syntax-editor-code-color` → `#d4d4d4`.
- [ ] `--code-comment` → `--syntax-common-comment` → `#6a9955` o equivalente >=4.5:1.
- [ ] `--code-function` → `--syntax-common-callable` → `#dcdcaa`.
- [ ] `--code-important` → `--syntax-common-regex` → `#d16969`.
- [ ] `--code-keyword` → `--syntax-common-keyword` → `#c586c0`.
- [ ] `--code-string` → `--syntax-common-string` → `#ce9178`.
- [ ] `--code-value` → `--syntax-common-number` → `#b5cea8`.
- [ ] `--code-operator` → `--syntax-common-operator` → `#d4d4d4`.
- [ ] `--code-property` → `--syntax-common-property` → `#9cdcfe`.
- [ ] `--code-punctuation` → `--syntax-common-punctuation` → `#d4d4d4`.
- [ ] `--code-tag` → `--syntax-common-type/meta` con fallback dark-safe; si un único `--code-tag` no puede expresar ambos roles, escoger una variable propia canónica segura para furniture host y mantener roles propios separados.
- [ ] `--caret-color` → caret propio → `#d4d4d4`.
- [ ] `syntax-common-invalid` quoted usa `--syntax-common-invalid` → literal dark-safe, no `--text-error` del theme como autoridad final.
- [ ] Line numbers quoted usan fallback >=4.5:1 sobre negro.
- [ ] Roles scoped consumen primero `--syntax-common-*`; no dejan que el palette original del theme vuelva a ganar mediante `--code-*`.
- [ ] CI existente + build + `pack:all` verdes tras completar la paleta.

## 6. Coherencia y scope

- [x] `syntax-common-*` es única taxonomía semántica manual common.
- [x] Configured profiles intactos.
- [x] `blocks.ts`, presentation, contrast manager, build boundary, Smart Editing y configured tokenizers sin cambio funcional.
- [x] Routing rendered intacto.
- [x] Guardrails Fase 1 siguen verdes.
- [x] Ledger contiene todas las expectativas antiguas adaptadas hasta ahora.

## 7. TM de implementación

- [x] Revisión 1: CAMBIOS NECESARIOS, cache resolver + hipótesis inicial blank-line.
- [x] Revisión 2: CAMBIOS NECESARIOS, corregir boundary contra StreamLanguage oficial + startState opcional.
- [x] Revisión 3: CAMBIOS NECESARIOS, detectar contraste insuficiente de variables theme sobre surface negra y reabrir arquitectura.
- [x] Arquitectura reestabilizada con Revisiones 7–8 limpias.
- [ ] Reestabilizar este plan de implementación tras el cambio arquitectónico.
- [ ] Completar 5.2.
- [ ] Revisar layering/API pública/tag precedence/parser efectivo.
- [ ] Revisar scanner y scope del diff.
- [ ] Revisar cascade/contraste CSS y overrides heredables.
- [ ] Revisar ledger.
- [ ] Primera revisión completa SIN CAMBIOS.
- [ ] Segunda revisión consecutiva SIN CAMBIOS.
- [ ] Solo entonces tests nuevos.

## 8. Tests nuevos/reconstruidos Fase 2

### Engine/resolver
- [ ] Bash tree, Text plain y PowerShell stream producen roles propios correctos.
- [ ] PowerShell cubre variable/number/operator/builtin/string/comment/keyword/punctuation/invalid.
- [ ] `parser.tokenTable` > engine tokenTags; tags públicos/modifiers/múltiples styles/unknown local.
- [ ] Synthetic evita colisión legacy y no aparece en semantic output.
- [ ] Parser sin `startState` usa estado trivial.

### Scanner
- [ ] Estado multilinea sintético.
- [ ] LF/CRLF offsets, última línea no terminada, blank line física.
- [ ] Source vacío/final virtual no añaden blankLine.
- [ ] Zero-length con cambio de estado funciona; parser bloqueado termina por guard.

### Consumidores
- [ ] Reading/editor PowerShell convergen en roles propios y sin `token *`/`cm-*` manuales.
- [ ] Bash Reading/editor convergen.
- [ ] Quote mapping, line numbers, presentation y cache sin regresión.
- [ ] SourceView usa support nativo + highlighter único.

### CSS/arquitectura
- [ ] Surface default negra; override heredado puede cambiarla.
- [ ] Familia `--code-*` scoped deriva de paleta dark-safe propia.
- [ ] Contraste estático de fallbacks ordinarios >=4.5:1 sobre `#000`.
- [ ] Invalid y line numbers legibles.
- [ ] Sin private selectors/`!important` nuevo.
- [ ] Guardrails Fase 1 verdes.
- [ ] Ledger cerrado con cobertura concreta.

## 9. TM de tests

- [ ] Primera revisión completa cobertura/fragilidad.
- [ ] Segunda revisión consecutiva SIN CAMBIOS.
- [ ] CI + `pack:all` verde.

## 10. Gate manual Obsidian real

No limpiar diagnostics todavía.

### Visual
- [ ] PowerShell top-level source sigue coloreado.
- [ ] PowerShell top-level rendered coloreado.
- [ ] PowerShell quoted source negro, sin píldoras claras dominantes y coloreado.
- [ ] PowerShell quoted rendered coloreado.
- [ ] Reading PowerShell top-level/quoted coloreado.
- [ ] Bash conserva roles coherentes source/rendered.
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
