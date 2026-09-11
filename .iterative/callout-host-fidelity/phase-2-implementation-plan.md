# Plan de implementación temporal · Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Este checklist ejecuta el plan arquitectónico de Fase 2 ya estabilizado. Es la fuente de verdad del progreso; la arquitectura detallada vive en `phase-2-architecture-plan.md`.

## 0. Baseline y guardrails

- [x] Branch `plan/obsidian-callout-host-fidelity` confirmada y baseline CI verde.
- [x] Mantener diagnostics y documentos temporales Fase 1/2 hasta gate real satisfactorio.
- [x] Mantener routing rendered de Fase 1 sin modificaciones.
- [x] Mantener prohibición de bridge DOM/private selectors y frontera runtime CodeMirror/Lezer.
- [x] Crear ledger temporal para tests antiguos adaptados por contratos retirados.
- [x] Reservar cobertura nueva para después del TM de implementación.

## 1. Catálogo common: engine como fuente de verdad

- [x] `CommonLanguage` usa engine discriminado `tree | stream | plain`.
- [x] Tree conserva factories de LanguageSupport existentes.
- [x] Stream contiene `StreamParser` + `tokenTags` declarativos.
- [x] `startState` opcional se normaliza como la API pública de CodeMirror: delegar si existe, estado trivial si no.
- [x] Plain no tiene parser/support.
- [x] Eliminar `support()` paralelo capaz de divergir.
- [x] PowerShell es stream-backed con tokenTags públicos para variable/number/operator/builtin/punctuation/string/comment/keyword/error.
- [x] No existe rama de renderer por id PowerShell.
- [x] `commonLanguageSupport()` construye tree/stream support desde el mismo engine.
- [x] `COMMON_SEMANTIC_HIGHLIGHTER` es la única tabla Tag → `syntax-common-*`.
- [x] Retirar highlighters manuales Reading/Editor host-specific antiguos.

## 2. Resolver stream y parser efectivo

- [x] Precedencia: `parser.tokenTable > engine.tokenTags > tags/modifiers públicos > unknown local`.
- [x] Varios style words y modificadores `.` soportados.
- [x] Resolver estático cacheado una vez por engine.
- [x] Parser efectivo no muta el parser original.
- [x] Nombres explícitos se reescriben a synthetic deterministas para evitar que aliases legacy internos ganen antes que `tokenTable`.
- [x] Synthetic names usan únicamente el contrato público de `StreamParser.tokenTable`.
- [x] Preservar/delegar `name`, `startState`, `copyState`, `blankLine`, `indent`, `languageData`, `mergeTokens`.
- [x] Sin acceso a `StreamLanguage.streamParser`, NodeProps, NodeType ids o TokenTable interno.

## 3. `common-semantic-ranges.ts`

- [x] Módulo puro sin DOM/EditorView/Obsidian.
- [x] Tree: parser actual + `highlightTree(..., COMMON_SEMANTIC_HIGHLIGHTER)`.
- [x] Plain: `syntax-common-plain` sin parser.
- [x] Stream: `StringStream` + estado mutable desde inicio del source.
- [x] Defaults sin EditorState: `tabSize=4`, `indentUnit=2`; options explícitas soportadas.
- [x] LF y CRLF preservan offsets físicos.
- [x] Última línea no terminada soportada.
- [x] Líneas vacías físicas intermedias llaman `blankLine` si existe.
- [x] Source vacío y línea virtual posterior a terminador final siguen el límite actual de `StreamLanguage` y no llaman `blankLine`.
- [x] Zero-length token tiene guard finito y no puede colgar el scanner.
- [x] Unknown style omite solo ese token semántico.

## 4. Consumidores

- [x] `renderCommonCode()` consume `commonSemanticRanges()`.
- [x] Reading/rendered manual ya no emite `token *`.
- [x] `buildEditorBlockSemantics()` consume `commonSemanticRanges()` + `mapCodeBlockRange()`.
- [x] Markdown source manual ya no emite `cm-*`.
- [x] Mantener model/cache/viewport, line semantics y line numbers de Fase 1.
- [x] `SyntaxSourceView` usa `commonLanguageSupport()` + `syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER)`.
- [x] No añadir ViewPlugin stream manual a SourceView.
- [x] Retirar `parseCommonLanguageTree()` al quedar sin consumidores.
- [x] Adaptar tests antiguos de `support`, Prism y CM únicamente tras registrarlos en ledger.
- [x] Suite existente + build + `pack:all` verdes tras migración semántica.

## 5. Quoted source dark surface

- [x] Fondo: `var(--syntax-editor-code-background, #000)`.
- [x] Foreground: `var(--syntax-editor-code-color, #d4d4d4)`.
- [x] Caret: `var(--syntax-editor-code-caret, #d4d4d4)`.
- [x] Variables propias no se fijan localmente con literal, de modo que theme/snippet pueda heredarlas desde un ancestro.
- [x] Dentro de `.cm-line.syntax-editor-code-source`: `--code-background: transparent`.
- [x] Dentro del mismo scope: `--code-normal` y `--caret-color` apuntan a foreground/caret propios.
- [x] Roles `syntax-common-*` tienen fallbacks dark-safe scoped; variable PowerShell usa fallback propio y no `--text-normal`.
- [x] Line numbers tienen fallback legible sobre negro.
- [x] `syntax-common-invalid` existe con fallback de error.
- [x] Sin `.cm-inline-code`, `HyperMD-*`, `.cm-embed-block`, `.cm-callout` como dependencia funcional.
- [x] Sin `!important` nuevo, branch por theme o margins verticales.
- [x] Suite existente + build + `pack:all` verdes tras CSS y correcciones.

## 6. Coherencia y scope

- [x] `syntax-common-*` es la única taxonomía semántica manual common.
- [x] Configured profiles permanecen intactos.
- [x] `blocks.ts`, presentation, contrast manager, build boundary, Smart Editing y configured tokenizers no cambian funcionalmente.
- [x] Routing rendered no cambia.
- [x] Tests Fase 1 de private selectors/runtime continúan verdes.
- [x] Ledger registra todas las expectativas antiguas adaptadas hasta ahora.

## 7. TM de implementación

- [x] Revisión 1: CAMBIOS NECESARIOS, cache del resolver + revisión inicial de blank lines.
- [x] Revisión 2: CAMBIOS NECESARIOS, corregir blank-line boundary contra StreamLanguage oficial + startState opcional.
- [x] Sincronizar este checklist con la arquitectura estable y el estado real.
- [ ] Revisar layering/API pública/tag precedence/parser efectivo.
- [ ] Revisar LF/CRLF/blank/source vacío/zero-length y scope del diff.
- [ ] Revisar cascade CSS, overrides heredables y ausencia de private selectors/`!important`.
- [ ] Revisar ledger y confirmar que no se perdió ninguna garantía.
- [ ] Obtener primera revisión completa SIN CAMBIOS.
- [ ] Obtener segunda revisión consecutiva SIN CAMBIOS.
- [ ] Solo entonces pasar a tests nuevos.

## 8. Tests nuevos/reconstruidos Fase 2

### Engine/resolver
- [ ] Bash tree produce roles `syntax-common-*`.
- [ ] Text plain sigue parserless.
- [ ] PowerShell stream produce variable/number/operator/builtin/string/comment/keyword/punctuation/invalid.
- [ ] `parser.tokenTable` gana a `engine.tokenTags`; engine rellena ausentes.
- [ ] Tags públicos, modifiers, múltiples styles y unknown local.
- [ ] Synthetic evita colisión con alias legacy y no aparece en semantic output.
- [ ] Parser sin `startState` usa estado trivial igual que el contrato CodeMirror.

### Scanner
- [ ] Estado multilinea con parser sintético.
- [ ] LF y CRLF offsets exactos.
- [ ] Última línea no terminada.
- [ ] Blank line física intermedia.
- [ ] Source vacío y terminador final no inventan `blankLine` adicional.
- [ ] Zero-length con cambio de estado funciona; parser que nunca avanza termina por guard.

### Consumidores
- [ ] Reading y quoted editor PowerShell convergen en los mismos roles propios.
- [ ] Bash Reading/editor convergen en roles propios.
- [ ] Manual rendered no contiene `token *`; manual editor no contiene `cm-*`.
- [ ] Quote mapping sigue excluyendo `>`.
- [ ] Line numbers/presentation/cache sin regresión.
- [ ] SourceView usa support nativo + highlighter único.

### CSS/arquitectura
- [ ] Fallback quoted es negro y variable heredada puede sobrescribirlo.
- [ ] `--code-background` queda neutralizado solo en scope propio.
- [ ] Foreground/caret/line numbers/roles tienen fallbacks legibles sobre negro.
- [ ] Sin private selectors ni `!important` nuevo.
- [ ] Fase 1 architectural guardrails siguen verdes.
- [ ] Cerrar ledger con archivo de prueba concreto por garantía.

## 9. TM de tests

- [ ] Primera revisión completa de cobertura/fragilidad.
- [ ] Segunda revisión consecutiva SIN CAMBIOS.
- [ ] CI completa + `pack:all` verde.

## 10. Gate manual Obsidian real Fase 2

No limpiar diagnostics todavía.

### Visual
- [ ] PowerShell top-level source sigue coloreado.
- [ ] PowerShell top-level rendered coloreado.
- [ ] PowerShell quoted source negro, sin píldoras claras dominantes y con semántica coloreada.
- [ ] PowerShell quoted rendered coloreado.
- [ ] Reading PowerShell top-level/quoted coloreado.
- [ ] Bash mantiene roles coherentes source/rendered sin taxonomía dual nuestra.
- [ ] Text quoted conserva presentation.
- [ ] Cursor source ↔ rendered sin regresión estructural.

### Routing rendered fresco
- [ ] Enable diagnostics antes de crear/renderizar subtree.
- [ ] Crear/modificar contenido después del enable.
- [ ] Inspeccionar eventos nested PowerShell.
- [ ] Confirmar `reading-specialized` si processor oficial es ruta garantizada.
- [ ] Si solo aparece `reading-fallback`, detener limpieza y volver a análisis TM.

### Settings
- [ ] `markdownEditor=false` elimina semantic decorations propias.
- [ ] `markdownReading=false` mantiene Reading sin renderer semántico propio.

## 11. Limpieza final conjunta Fase 1 + Fase 2

Solo tras gate satisfactorio:

- [ ] Eliminar diagnostics temporales y controller/wiring global.
- [ ] Actualizar README, theme integration y documentación/changelog obsoletos.
- [ ] Eliminar todos los `.iterative/callout-host-fidelity/*` agotados.
- [ ] CI final + `pack:all`.
- [ ] Auditar diff final sin temporales ni excepciones private-selector.
