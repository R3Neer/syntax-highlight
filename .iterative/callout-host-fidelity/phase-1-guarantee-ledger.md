# Ledger temporal · garantías migradas en Fase 1

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Este ledger registra el destino **concreto** de las garantías que antes estaban mezcladas con `LivePreviewRenderedBlockBridge`. Un nombre de archivo significa cobertura automatizada revisada; `GATE REAL` significa deliberadamente no simulable con happy-dom; `ELIMINADA` significa comportamiento inseparable del hack retirado y no una garantía funcional del producto.

## `live-preview-host.test.ts`

| Garantía antigua | Destino concreto |
| --- | --- |
| detector rechaza múltiples CODE directos | `rendered-code-candidate.test.ts` |
| metadata/fence se detecta estructuralmente | `rendered-code-candidate.test.ts` · PRE-only / CODE-only / agreement / conflict |
| Text presentation usa renderer común | `reading-fallback.test.ts`, `plain-text-editor.test.ts`, `live-preview-source-surface.test.ts` |
| PowerShell usa renderer común | `powershell-semantic-bridge.test.ts` |
| unknown queda untouched | `reading-fallback.test.ts` + `rendered-code-candidate.test.ts` |
| idempotencia | `reading-fallback.test.ts` · processed marker / repeated pass |
| aislamiento de excepción por bloque | `reading-fallback.test.ts` |
| preservar copy/furniture | `rendered-code-candidate.test.ts` + `reading-host-fixture.test.ts` |
| observar inserción tardía `.cm-embed-block` | **ELIMINADA**: comportamiento específico del hack MutationObserver |
| recreación de widget `.cm-embed-block` | **GATE REAL**: `registerMarkdownCodeBlockProcessor` debe reaplicarse cuando Obsidian vuelva a renderizar el bloque |
| dejar de reaccionar tras dispose del bridge | **ELIMINADA**: el bridge desaparece; lifecycle del ViewPlugin source queda cubierto por `_tmp-host-diagnostics.test.ts` y destrucción del `EditorView` |

## `live-preview-adversarial.test.ts`

| Garantía antigua | Destino concreto |
| --- | --- |
| Markdown presentation + syntax | `reading-fallback.test.ts`, `plain-text-editor.test.ts`, `live-preview-source-surface.test.ts` |
| configured TOML rendered | `reading-fallback.test.ts` y tests existentes del renderer/configured profiles |
| MUD depende del perfil | tests existentes de settings/registry/Reading + cierre del ledger en revisión TM |
| `markdownEditor=false` no activa comportamiento de highlight del editor | `markdown-mode-settings.test.ts` + `plain-text-editor.test.ts` |
| controles arbitrarios conservan identidad/listeners | `rendered-code-candidate.test.ts` + `reading-fallback.test.ts` |
| clasificación tardía por class MutationObserver | **ELIMINADA**: comportamiento específico del hack |

## `live-preview-extension-integration.test.ts`

| Garantía antigua | Destino concreto |
| --- | --- |
| `createMarkdownEditorExtensions()` instala el bridge rendered | **ELIMINADA**: la arquitectura nueva prohíbe ese bridge |
| recreación de widget rendered procesada por el bridge | **GATE REAL** del code-block processor oficial |
| wiring de EditorView con extensiones | `editor-block-model.test.ts` + `_tmp-host-diagnostics.test.ts` |
| registro/desregistro de diagnostics al destruir el view | `_tmp-host-diagnostics.test.ts` (`captureLivePreview()` queda vacío tras `view.destroy()`) |

## Garantías nuevas surgidas durante revisión de implementación

| Garantía | Destino concreto |
| --- | --- |
| un rendered processor dentro de un MarkdownView `source` respeta `markdownEditor` | `markdown-mode-settings.test.ts` |
| Reading/preview respeta `markdownReading` | `markdown-mode-settings.test.ts` |
| una transclusión decide por el `MarkdownView` que contiene el elemento antes que por `context.sourcePath` | `markdown-mode-settings.test.ts` · ownership precede sourcePath |
| `sourcePath` único sirve de fallback cuando aún no existe ownership DOM | `markdown-mode-settings.test.ts` |
| ausencia/ambigüedad de owner cae a `markdownReading` | `markdown-mode-settings.test.ts` |
| runtime CodeMirror/Lezer no se duplica en el artifact | `build-runtime.test.mjs` + guardrail real de `esbuild.config.mjs` en cada build CI |
| private selectors no vuelven a producción | `architecture-boundaries.test.mjs`; diagnostics temporal es la única excepción |
| PowerShell conserva variable/operator/number/builtin/string/comment en ambas rutas | `powershell-semantic-bridge.test.ts` |
| cuerpo lógico visible conserva estructura completa aunque el viewport corte el bloque | `editor-block-model.test.ts` |
| caché semántica se reutiliza en rematerialización sin doc change y se invalida conservadoramente | `editor-block-model.test.ts` + revisión del branch `update.viewportChanged/selectionSet` |

## Evidencia de packaging/CI

Además de los tests unitarios:

- `npm run build` ejecuta el guardrail sobre el metafile real de esbuild;
- `pack:all` construye correctamente el paquete Obsidian;
- el artifact CI revisado conserva `require()` externos para CodeMirror/Lezer/Obsidian y contiene código de los language packages no externalizados (incluido PowerShell/Nushell), por lo que la frontera host/language queda materializada como diseñó el plan.

## Regla de cierre

- Ninguna garantía automatizable queda apuntando genéricamente a “Fase 9”.
- Las filas `GATE REAL` no deben sustituirse por DOM inventado de happy-dom.
- Las filas `ELIMINADA` describen únicamente comportamiento inseparable de la implementación privada retirada.
- Si el gate real contradice una garantía de host, se vuelve a análisis/plan TM; no se restaura el hack por reflejo.
