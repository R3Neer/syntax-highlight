# Ledger temporal · garantías migradas en Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Este ledger registra tests existentes adaptados o retirados durante implementación porque su contrato production cambie. Los tests nuevos se crean después del TM de implementación, en Fase 8.

## `common-languages.test.ts`

| Contrato antiguo | Tratamiento durante implementación | Destino Fase 8 |
| --- | --- | --- |
| Text se identifica por ausencia de `support` | adaptar a `engine.kind === "plain"` y `commonLanguageSupport() === undefined` | semantic engine · Text plain |
| Markdown/PowerShell exponen `support()` directamente | adaptar a `commonLanguageSupport(language)` | support común · helper tree/stream |
| PowerShell manual debe pasar por `parseCommonLanguageTree()` + EditorState y no `parser.parse()` | retirar como garantía: la ruta manual deja de usar árbol StreamLanguage; conservar solo que PowerShell es engine stream y su support nativo existe | semantic engine PowerShell directo + SourceView usa support nativo |

## `reading.test.ts`

| Contrato antiguo | Tratamiento durante implementación | Destino Fase 8 |
| --- | --- | --- |
| Text parserless inferido por `support === undefined` | adaptar a engine plain | Text plain |
| Bash/Nushell/PowerShell rendered incluyen clases Prism `token *` además de `syntax-common-*` | retirar clases Prism de expectativas y mantener el rol `syntax-common-*` | Reading manual sin `token *`; convergencia Bash/PowerShell |
| PowerShell comment se prueba mediante `.token.comment` | adaptar a `.syntax-common-comment` | PowerShell stream roles |

## `theme-compat.test.ts`

| Contrato antiguo | Tratamiento durante implementación | Destino Fase 8 |
| --- | --- | --- |
| dos highlighters manuales distintos Reading/Editor generan `token *` y `cm-*` | adaptar a la taxonomía única `COMMON_SEMANTIC_HIGHLIGHT_STYLE` / `commonSemanticRanges()` | manual ranges solo `syntax-common-*` |
| PowerShell editor se valida a través de árbol StreamLanguage y `cm-comment` | adaptar al semantic engine directo y clase propia | PowerShell stream directo |
| declaration compara Prism/CodeMirror compatibility classes | conservar el rol semántico `syntax-common-declaration`, retirar host classes | highlighter semántico único |

## `powershell-semantic-bridge.test.ts`

| Contrato antiguo | Tratamiento durante implementación | Destino Fase 8 |
| --- | --- | --- |
| Reading PowerShell debe exponer Prism `token variable/number/operator/string/comment/builtin` | conservar las mismas categorías usando únicamente `syntax-common-*` | PowerShell stream produce todos los roles |
| quoted editor PowerShell debe exponer `cm-variable/number/operator/string/comment/builtin` | conservar equivalencia semántica usando únicamente `syntax-common-*` | Reading/editor convergen en los mismos roles y editor manual no emite `cm-*` |

## `reading-fallback.test.ts`

| Contrato antiguo | Tratamiento durante implementación | Destino Fase 8 |
| --- | --- | --- |
| fallback PowerShell demuestra syntax mediante `.token.comment` | adaptar a `.syntax-common-comment`; se conserva badge, line numbers y contenido | Reading PowerShell usa engine stream y no Prism manual |

## Regla

- Toda expectativa antigua sobre clases manuales `cm-*` o `token *` que se retire debe apuntar a una garantía nueva `syntax-common-*` de Fase 8.
- Una garantía host-real no puede sustituirse por un fixture happy-dom y se mantiene en gate real.
- No registrar como “migrada” una aserción que siga existiendo sin cambios.
- El ledger se cierra en Fase 8 únicamente cuando cada fila tenga prueba nueva o referencia concreta a cobertura conservada.
