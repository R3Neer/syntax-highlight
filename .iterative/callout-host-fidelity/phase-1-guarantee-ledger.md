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
| aislamiento de excepción por bloque | Fase 9 · Reading fallback isolation si no está ya cubierto |
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
| `markdownEditor=false` no activa bridge | sustituida por: source highlighter produce `Decoration.none`; rendered processor sigue gobernado por setting correspondiente según renderer actual |
| controles arbitrarios conservan identidad/listeners | Fase 9 · Reading/fallback furniture identity |
| clasificación tardía por class MutationObserver | ELIMINADA: comportamiento específico del hack |

## `live-preview-extension-integration.test.ts`

| Garantía antigua | Destino |
| --- | --- |
| `createMarkdownEditorExtensions()` instala el bridge rendered | ELIMINADA: arquitectura nueva prohíbe ese bridge |
| recreación de widget rendered procesada por el bridge | GATE REAL del code-block processor oficial |
| wiring de EditorView real con extensiones | Fase 9 · editor model/materialization + diagnostics registration lifecycle |

## Regla de cierre

Ninguna fila marcada “Fase 9” puede quedar sin una prueba equivalente o una referencia explícita a una prueba existente revisada. Las filas “GATE REAL” no deben reemplazarse por un DOM artificial de happy-dom. Las filas “ELIMINADA” describen únicamente comportamiento inseparable de la implementación privada retirada.
