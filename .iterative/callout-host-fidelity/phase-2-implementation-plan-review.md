# Revisión TM temporal · plan de implementación Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisiones 1–2

Resultado: CAMBIOS NECESARIOS.

Se estabilizaron previamente sequencing TM, layering engine/resolver, synthetic names, scanner y separación implementación/tests.

## Revisiones 3–4

Resultado: SIN CAMBIOS / SIN CAMBIOS.

Par limpio del plan anterior. Quedó invalidado como par final cuando la Revisión arquitectónica 6 cambió la política cromática de la surface quoted.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Se reconcilió el plan con la arquitectura reabierta/reestabilizada:

- la parte semántica Fase 2 permanece completada;
- se reabre únicamente la paleta quoted source;
- la familia pública `--code-*` relevante debe remapearse a `--syntax-common-*` heredable + literal dark-safe;
- se fijaron valores concretos y no decisiones pendientes:
  - comment `#6a9955`;
  - callable/function `#dcdcaa`;
  - regex/important `#d16969`;
  - keyword/meta/tag `#c586c0`;
  - string `#ce9178`;
  - number/value `#b5cea8`;
  - operator/punctuation/normal/caret `#d4d4d4`;
  - property `#9cdcfe`;
  - type propio `#4ec9b0`;
  - invalid `#f44747`;
  - line numbers `#858c99`.
- `--code-tag` se asigna de forma canónica a meta; `syntax-common-type` conserva su color propio;
- tests nuevos siguen bloqueados hasta dos revisiones limpias de implementación.

No cuenta como revisión limpia. Las antiguas Revisiones 3–4 ya no son el par final vigente.
