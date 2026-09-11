# Revisión TM temporal · plan de implementación Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

### Cambio A · respetar separación TM implementación/tests

El primer plan introducía tests nuevos de `common-semantic-ranges` antes de haber estabilizado implementación.

Corrección:

- durante Fases 1–6 solo se ejecuta lint/typecheck/suite **existente**/build;
- tests antiguos que fallen porque prueban una API deliberadamente retirada pueden adaptarse durante implementación únicamente tras registrarlos en un ledger;
- toda cobertura nueva de Fase 2 se crea en Fase 8, después de dos revisiones consecutivas limpias de implementación.

### Cambio B · custom properties realmente sobrescribibles

Asignar `--syntax-editor-code-background: #000` directamente sobre la propia `.cm-line` impediría que un valor heredado desde theme/snippet reemplazara ese default.

Corrección:

- usar `background-color: var(--syntax-editor-code-background, #000)`;
- equivalentes `var(--syntax-editor-code-color, #d4d4d4)` y `var(--syntax-editor-code-caret, #d4d4d4)`;
- no declarar esos custom properties con el literal en la misma línea;
- mantener `--code-background`, `--code-normal` y `--caret-color` como adaptación scoped del host.

### Cambio C · ledger de tests migrados

El plan exige un ledger temporal para cualquier test antiguo adaptado/retirado durante implementación, con destino concreto en Fase 8. Así CI no puede quedar verde por pérdida silenciosa de garantías.

No cuenta como revisión limpia.
