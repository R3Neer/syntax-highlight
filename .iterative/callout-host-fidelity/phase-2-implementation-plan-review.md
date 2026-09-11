# Revisión TM temporal · plan de implementación Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisiones 1–2

Resultado: CAMBIOS NECESARIOS.

Se estabilizaron sequencing TM, layering engine/resolver, synthetic names, scanner y separación implementación/tests.

## Revisiones 3–4

Resultado: SIN CAMBIOS / SIN CAMBIOS.

Par limpio del plan anterior, invalidado como par final por el cambio cromático de Revisión arquitectónica 6.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Se reconcilió el plan con la arquitectura reabierta/reestabilizada: semántica ya completada, paleta quoted reabierta, familia `--code-*` remapeada conceptualmente a `--syntax-common-*` + literal dark-safe y valores finales fijados.

## Revisión 6

Resultado: SIN CAMBIOS.

Primera revisión limpia del plan reconciliado. Orden/rollback y separación tests/implementación quedan determinados.

## Revisión 7

Resultado: SIN CAMBIOS.

Segunda revisión limpia, centrada en failure modes CSS:

- theme con variables públicas oscuras no puede volver a contaminar la surface negra porque esas variables se remapean dentro del scope propio;
- un snippet/theme puede definir `--syntax-common-*` o `--syntax-editor-code-*` en un ancestro y conservar control explícito;
- ausencia total de variables theme cae a literales dark-safe;
- furniture host que use variables públicas consume la misma paleta que nuestros spans;
- no hace falta seleccionar descendants privados, usar `!important` ni medir DOM source con JS;
- mobile y desktop comparten la misma frontera CM6/CSS;
- tests nuevos siguen bloqueados hasta estabilizar código.

No se encontró modificación necesaria.

Revisiones **6 y 7 son consecutivas sin cambios**: el plan de implementación Fase 2 vuelve a quedar estabilizado según TM y se autoriza completar únicamente el tramo 5.2 antes de reanudar el TM de implementación.
