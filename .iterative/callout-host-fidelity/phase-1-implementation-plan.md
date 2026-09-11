# Plan de implementación temporal · Fase 1

Estado: TEMPORAL. Eliminar tras implementación, tests, validación real y limpieza final.

Este plan ejecuta el plan arquitectónico estabilizado. Los checkboxes son la fuente de verdad del progreso.

## 0. Baseline y guardrails

- [x] Head/branch correctos y baseline CI verde.
- [x] Mantener diagnostics y documentos temporales hasta gate real.
- [x] Registrar cambios de alcance antes de implementarlos.
- [x] Mantener ledger de garantías retiradas/migradas.

## 1. Frontera oficial de runtime

- [x] Centralizar externals del sample oficial: `obsidian`, `electron`, CodeMirror, Lezer y `builtinModules`.
- [x] Hacer consumir esa frontera a esbuild.
- [x] Guardrail real sobre metafile: host runtime no bundled y host imports marcados external.
- [x] Mantener language packages no-host bundled.
- [x] Declarar peers npm solo para runtime imports externos reales del artifact.
- [x] `npm ci`, build y `pack:all` verdes.

## 2. Fallback estructural rendered desacoplado

- [x] Crear `rendered-code-candidate.ts` host-neutral.
- [x] PRE-only válido.
- [x] CODE-only válido.
- [x] PRE/CODE agreement válido.
- [x] Conflicto/ambigüedad fail-closed.
- [x] Un único CODE directo.
- [x] Preservar furniture auxiliar.
- [x] Processed marker/idempotencia.
- [x] Adaptar Reading fallback sin dependencia de Live Preview privado.

## 3. Eliminar bridge DOM de rendered Live Preview

- [x] Inventariar garantías antiguas en ledger.
- [x] Eliminar `LivePreviewRenderedBlockBridge`.
- [x] Eliminar `live-preview-host.ts`.
- [x] Eliminar MutationObserver/replacement del EditorView para rendered code.
- [x] Eliminar dependencias funcionales de `.cm-embed-block`/`.cm-callout`.
- [x] Dejar LP rendered bajo `registerMarkdownCodeBlockProcessor` oficial.
- [x] Generic Markdown postprocessor no es requisito de LP.
- [x] Reubicar diagnostics temporal en el ViewPlugin source.

## 4. Modelo source y caché por viewport

- [x] Crear `editor-block-model.ts` puro, sin DOM/EditorView ownership.
- [x] Modelo estructural/resuelto separado de semántica cara.
- [x] Resolver configured/common por reconstrucción de modelo.
- [x] Parse/tokenize solo bloques visibles.
- [x] Procesar cuerpo lógico completo de cada bloque visible.
- [x] Mapear spans lógicos a offsets físicos tras quote prefix.
- [x] Una única line semantics propia por línea.
- [x] Fusionar surface + presentation.
- [x] Line-number policy separada.
- [x] Caché semántica conservadora: doc/revision invalidan; viewport/selection reutilizan.
- [x] ViewPlugin rematerializa en model/viewport/selection relevantes.
- [x] Registry subscriptions/diagnostics se limpian en destroy.

## 5. Surface/presentation source con clases propias

- [x] Eliminar emisión `HyperMD-codeblock*`.
- [x] Usar `syntax-editor-code-source*`.
- [x] Surface mediante `--syntax-editor-code-background` -> `--code-background`.
- [x] Base foreground mediante `--syntax-editor-code-color` -> `--text-normal`.
- [x] Categorías semánticas conservan fallbacks `--code-*` cuando corresponda.
- [x] No hardcodear Nier, negro ni otro tema.
- [x] No introducir margins verticales de Live Preview.
- [x] Presentation Text/Markdown convive con surface en una única line decoration propia.

## 6. Contraste respetando ownership

- [x] `CommonContrastManager` solo normaliza DOM propio bajo `.syntax-highlight-frame`.
- [x] Source CodeMirror no recibe mutaciones inline del manager.
- [x] Settings preview sigue excluido.
- [x] Configured profiles siguen fuera del normalizador common.
- [x] Observer/pending roots limitados a subtrees propios.
- [x] Restore/dispose solo sobre nodos que el manager pudo modificar.

## 7. Common highlighting / PowerShell

- [x] Runtime CodeMirror/Lezer unificado con host.
- [x] Mantener `EditorState + ensureSyntaxTree` para StreamLanguage.
- [x] No añadir rama PowerShell específica al renderer.
- [x] Mantener `createCommonHighlightStyle()` como taxonomía única.
- [x] Mantener source-file editor con `common.support()` + `syntaxHighlighting(COMMON_EDITOR_HIGHLIGHT_STYLE)`.
- [x] Mode/settings rendered extraído a política pura `markdown-render-mode.ts`; `main.ts` sigue siendo adapter host público.

## 8. Revisión TM de implementación

- [x] Revisar diff completo contra plan arquitectónico.
- [x] Revisar ausencia de mutación DOM de CodeMirror.
- [x] Revisar imports/bundle runtime contra sample oficial.
- [x] Revisar ausencia de selectores privados como dependencia funcional.
- [x] Revisar que LP rendered no dependa del generic postprocessor.
- [x] Revisar ownership de contraste.
- [x] Revisar performance/invalidation del ViewPlugin.
- [x] Revisar ledger de garantías retiradas.
- [x] Incorporar correcciones de revisiones 1–5.
- [x] Reabrir tras extracción `markdown-render-mode.ts` provocada por tests.
- [x] Obtener dos revisiones consecutivas sin cambios finales: Revisiones 9 y 10.

## 9. Tests de Fase 1

### Runtime/build

- [x] Externals frente a frontera oficial adoptada.
- [x] Metafile rechaza host runtime bundled.
- [x] Metafile rechaza host import no external.
- [x] Language packages no están externalizados y aparecen en artifact CI.
- [x] Runtime imports externos reales están declarados como peers npm.
- [x] Externals preventivos sin import real no se convierten en peers fantasma.
- [x] Packaging final validado por `pack:all`.

### Reading/fallback

- [x] PRE-only.
- [x] CODE-only.
- [x] PRE/CODE agreement.
- [x] PRE/CODE conflict fail-closed.
- [x] Único CODE directo.
- [x] Furniture identity/listeners.
- [x] Idempotence/processed marker.
- [x] Aislamiento de excepción por bloque.
- [x] Unknown untouched/fail-closed.
- [x] Fallback sin clases privadas de Live Preview.

### Editor model/materialization

- [x] Modelo top-level y quoted sin DOM.
- [x] Bloques fuera de viewport no se tokenizan.
- [x] Bloque visible procesa cuerpo lógico completo aunque viewport corte el bloque.
- [x] Cache se reutiliza en rematerialización sin doc change; `viewportChanged`/`selectionSet` comparten esa ruta.
- [x] Cache se invalida en doc/revision.
- [x] Máximo una line semantics propia por línea.
- [x] Presentation + surface conviven.
- [x] Mapping quoted evita colorear `>`.
- [x] Line numbers se anclan tras quote prefix.
- [x] Lifecycle del EditorView limpia diagnostics/subscriptions.

### Mode/settings rendered

- [x] Owner source -> `markdownEditor`.
- [x] Owner preview -> `markdownReading`.
- [x] Ownership por container prevalece sobre sourcePath.
- [x] Transclusión host/sourcePath distinto.
- [x] Unique sourcePath como fallback secundario.
- [x] Ausencia/ambigüedad -> `markdownReading`.

### Theme/contrast

- [x] No se emiten `HyperMD-codeblock*` en producción.
- [x] Source usa clases/variables propias y públicas.
- [x] Contrast manager no modifica source CodeMirror.
- [x] Contrast manager sí normaliza rendered DOM propio.
- [x] Restore/dispose preserva foreground original.

### PowerShell/common

- [x] Reading: variable/operator/number/builtin/string/comment.
- [x] Source quoted: categorías equivalentes `cm-*` + `syntax-common-*`.
- [x] Text sigue parserless.
- [x] Markdown mantiene parser.

### Prohibiciones arquitectónicas

- [x] Producción no temporal sin `.cm-embed-block`, `.cm-callout`, `HyperMD-codeblock*` como dependencia funcional.
- [x] Única excepción temporal: `_tmp-host-diagnostics.ts` y sus tests.
- [x] No existe bridge rendered/MutationObserver del EditorView.
- [x] Ningún test finge el contrato real de `registerMarkdownCodeBlockProcessor` mediante `.cm-embed-block` inventado.
- [x] Ledger apunta a tests concretos o `GATE REAL`/`ELIMINADA`.

## 10. Revisión TM de tests

- [x] Revisar cobertura frente a invariantes arquitectónicos.
- [x] Cerrar ledger de garantías migradas.
- [x] No llamar “real” a fixtures happy-dom.
- [x] Eliminar/evitar tests basados en DOM incidental privado del host.
- [x] Incorporar correcciones de Revisiones 1–6.
- [x] Dos revisiones consecutivas sin cambios: Revisiones 7 y 8.
- [x] CI completa verde: lint, typecheck, tests, build, `pack:all`, artifact.

## 11. Gate manual Obsidian real

**BLOQUE ACTUAL. No limpiar diagnostics todavía.**

- [ ] Instalar artifact/build exacto del head validado.
- [ ] Validar PowerShell top-level source.
- [ ] Validar PowerShell top-level rendered.
- [ ] Validar PowerShell quoted source.
- [ ] Validar PowerShell quoted rendered.
- [ ] Validar Text presentacional quoted source.
- [ ] Validar Text presentacional quoted rendered.
- [ ] Validar cambio de cursor source <-> rendered.
- [ ] Validar `markdownEditor`/`markdownReading` en sus modos correspondientes.
- [ ] Validar tema activo y ausencia de crash.
- [ ] Validar que nested rendered funciona por `registerMarkdownCodeBlockProcessor` tras retirar bridge DOM.
- [ ] No exigir que generic Markdown postprocessor se ejecute en LP.
- [ ] Capturar diagnostics solo si existe discrepancia.
- [ ] Si falla, volver a análisis/plan TM antes de cualquier nuevo fix.

## 12. Limpieza final

**Solo tras gate manual satisfactorio.**

- [ ] Eliminar `_tmp-host-diagnostics.ts` y tests diagnostics.
- [ ] Retirar wiring/global controller temporal.
- [ ] Confirmar que tras limpieza no queda ninguna excepción a selectores privados.
- [ ] Actualizar `packages/obsidian/README.md`.
- [ ] Actualizar `docs/theme-integration.md`.
- [ ] Actualizar documentación histórica/release si describe el bridge retirado.
- [ ] Eliminar documentos temporales `.iterative/callout-host-fidelity/*` agotados, incluidos los planes Fase 1 y ledger/reviews.
- [ ] Ejecutar CI final y `pack:all`.
- [ ] Revisar diff final para confirmar ausencia de artefactos temporales.
