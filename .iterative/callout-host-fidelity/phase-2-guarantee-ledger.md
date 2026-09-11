# Ledger temporal · garantías migradas en Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Este ledger registra los contratos antiguos que cambiaron durante Fase 2 y su cobertura concreta posterior. No sustituye el gate de Obsidian real.

## `common-languages.test.ts`

| Contrato antiguo | Tratamiento | Cobertura concreta |
| --- | --- | --- |
| Text se identifica por ausencia de `support` | migrado a `engine.kind === "plain"` y `commonLanguageSupport() === undefined` | `common-languages.test.ts`; `common-semantic-engine.test.ts` |
| Markdown/PowerShell exponen `support()` directamente | migrado a `commonLanguageSupport(language)` | `common-languages.test.ts`; `common-source-view-highlighting.test.ts` |
| PowerShell manual debe pasar por `parseCommonLanguageTree()` + EditorState | retirado: manual usa scanner `StreamParser`; SourceView conserva support nativo | `common-semantic-engine.test.ts`; `common-source-view-highlighting.test.ts`; `common-semantic-architecture.test.mjs` |

## `reading.test.ts`

| Contrato antiguo | Tratamiento | Cobertura concreta |
| --- | --- | --- |
| Text parserless inferido por `support === undefined` | migrado a engine plain | `common-semantic-engine.test.ts`; `reading.test.ts` |
| Bash/Nushell/PowerShell rendered incluyen clases Prism `token *` | retirado: manual rendered usa solo `syntax-common-*` | `theme-compat.test.ts`; `common-semantic-consumers.test.ts`; `powershell-semantic-bridge.test.ts` |
| PowerShell comment se prueba mediante `.token.comment` | migrado a `syntax-common-comment` | `common-semantic-engine.test.ts`; `powershell-semantic-bridge.test.ts`; `reading.test.ts` |

## `theme-compat.test.ts`

| Contrato antiguo | Tratamiento | Cobertura concreta |
| --- | --- | --- |
| highlighters Reading/Editor generan `token *` y `cm-*` | sustituidos por `COMMON_SEMANTIC_HIGHLIGHTER` + `syntax-common-*` | `theme-compat.test.ts`; `common-semantic-architecture.test.mjs`; `common-semantic-engine.test.ts` |
| PowerShell editor se valida vía árbol StreamLanguage y `cm-comment` | manual PowerShell usa scanner directo; SourceView usa support nativo | `common-semantic-engine.test.ts`; `common-source-view-highlighting.test.ts` |
| declaration compara compatibility classes Prism/CM | se conserva solo `syntax-common-declaration` | `theme-compat.test.ts`; `common-semantic-consumers.test.ts` |

## `powershell-semantic-bridge.test.ts`

| Contrato antiguo | Tratamiento | Cobertura concreta |
| --- | --- | --- |
| Reading PowerShell expone Prism `token variable/number/operator/string/comment/builtin` | mismos roles, solo `syntax-common-*` | `powershell-semantic-bridge.test.ts`; `common-semantic-engine.test.ts` |
| quoted editor PowerShell expone `cm-variable/number/operator/string/comment/builtin` | mismos roles, solo `syntax-common-*` | `powershell-semantic-bridge.test.ts`; `common-semantic-engine.test.ts` |

## `reading-fallback.test.ts`

| Contrato antiguo | Tratamiento | Cobertura concreta |
| --- | --- | --- |
| fallback PowerShell demuestra syntax mediante `.token.comment` | migrado a `.syntax-common-comment`; badge/line numbers/contenido se conservan | `reading-fallback.test.ts`; `powershell-semantic-bridge.test.ts` |

## Garantías nuevas de Fase 2

| Garantía | Cobertura concreta |
| --- | --- |
| `parser.tokenTable > engine.tokenTags` | `common-semantic-engine.test.ts` |
| `engine.tokenTags` rellena styles ausentes y alimenta también parser nativo | `common-stream-token-tags.test.ts` |
| synthetic names evitan colisión con aliases legacy | `common-semantic-engine.test.ts` |
| campos públicos de `StreamParser` preservados | `common-semantic-engine.test.ts` |
| LF/CRLF, state multilinea, blank física, source vacío/final virtual y zero-length guard | `common-semantic-engine.test.ts` |
| Bash tree atraviesa Reading y quoted source con roles propios | `common-semantic-consumers.test.ts` |
| SourceView nativo usa support + highlighter único para PowerShell/Bash | `common-source-view-highlighting.test.ts`; `common-semantic-architecture.test.mjs` |
| quoted surface negra, remapeo `--code-*`, contraste AA, invalid y line numbers | `quoted-source-dark-palette.test.mjs`; `live-preview-source-surface.test.ts` |
| sin private selectors/bridge DOM/`!important` como dependencia funcional | `architecture-boundaries.test.mjs`; `quoted-source-dark-palette.test.mjs` |
| routing rendered oficial en Obsidian real | **gate manual**; no se sustituye por happy-dom |

## Estado del ledger

CERRADO para Fase 8: cada garantía migrada tiene cobertura concreta o está explícitamente reservada al gate real.

Reglas mantenidas:

- una garantía host-real no se sustituye por un fixture happy-dom;
- no se considera cobertura la mera existencia de una clase o comentario sin test asociado;
- este ledger sigue siendo temporal y se elimina tras el gate satisfactorio y la limpieza final.
