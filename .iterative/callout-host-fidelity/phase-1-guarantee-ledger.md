# Ledger temporal · garantías migradas en Fase 1

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## `live-preview-host.test.ts`

| Garantía antigua | Destino |
| --- | --- |
| detector rechaza múltiples CODE directos | Fase 9 · Reading/fallback candidate tests |
| metadata/fence se detecta estructuralmente | Fase 9 · PRE-only/CODE-only/agreement/conflict |
| Text presentation usa renderer común | Fase 9 · common renderer/presentation tests existentes + nuevas line semantics source |
| PowerShell usa renderer común | Fase 9 · PowerShell/common semantic spans |
| unknown queda untouched | Fase 9 · Reading/fallback fail-closed |
| idempotencia | Fase 9 · processed marker/fallback |
| aislamiento de excepción por bloque | Fase 9 · Reading fallback isolation |
| preservar copy/furniture | Fase 9 · Reading furniture identity |
| observar inserción tardía `.cm-embed-block` | ELIMINADA: comportamiento específico del hack MutationObserver |
| recreación de widget `.cm-embed-block` | GATE REAL: processor oficial debe reaplicarse cuando Obsidian renderice el bloque |
| dejar de reaccionar tras dispose del bridge | ELIMINADA: la clase deja de existir; lifecycle del ViewPlugin source se cubre separadamente |

## `live-preview-adversarial.test.ts`

| Garantía antigua | Destino |
| --- | --- |
| Markdown presentation + syntax | Fase 9 · common Markdown renderer + editor model/materialization |
| configured TOML rendered | tests de renderer configurado existentes / Fase 9 ledger closure |
| MUD depende del perfil | tests de settings/registry existentes / Fase 9 ledger closure |
| `markdownEditor=false` no activa comportamiento de highlight del editor | Fase 9 · matriz pública de modo/settings: `MarkdownView.getMode() === source` usa `markdownEditor`; preview/no-owner usa `markdownReading`; incluir owner por `containerEl` con `context.sourcePath` distinto (transclusión) |
| controles arbitrarios conservan identidad/listeners | Fase 9 · Reading/fallback furniture identity |
| clasificación tardía por class MutationObserver | ELIMINADA: comportamiento específico del hack |

## `live-preview-extension-integration.test.ts`

| Garantía antigua | Destino |
| --- | --- |
| `createMarkdownEditorExtensions()` instala el bridge rendered | ELIMINADA: arquitectura nueva prohíbe ese bridge |
| recreación de widget rendered procesada por el bridge | GATE REAL del code-block processor oficial |
| wiring de EditorView real con extensiones | Fase 9 · editor model/materialization + diagnostics registration lifecycle |

## Garantías nuevas surgidas durante revisión de implementación

| Garantía | Destino |
| --- | --- |
| un rendered processor dentro de un MarkdownView `source` respeta `markdownEditor` | Fase 9 · mode/settings matrix |
| Reading/preview respeta `markdownReading` | Fase 9 · mode/settings matrix |
| una transclusión decide por el `MarkdownView` que contiene el elemento antes que por `context.sourcePath` | Fase 9 · mode/settings matrix con host file != sourcePath |
| ausencia/ambigüedad de owner cae de forma conservadora a `markdownReading` | Fase 9 · mode/settings matrix |

## Regla de cierre

Ninguna fila marcada “Fase 9” puede quedar sin una prueba equivalente o una referencia explícita a una prueba existente revisada. Las filas “GATE REAL” no deben reemplazarse por un DOM artificial de happy-dom. Las filas “ELIMINADA” describen únicamente comportamiento inseparable de la implementación privada retirada.
