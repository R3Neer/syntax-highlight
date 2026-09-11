# Revisión TM · plan de implementación Fase 0D

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS + RETORNO A ARQUITECTURA.

El plan usaba `visibleRanges` como filtro de candidatos. Eso podía excluir rangos reemplazados por widgets y perder el estado cursor-fuera. Se reabrió el plan arquitectónico, que cambió a `view.viewport` como filtro grueso y `visibleRanges` como señal de source materializado. Tras estabilizar de nuevo arquitectura, el plan de implementación se actualizó.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

La verificación previa al TM de implementación exigía solo lint/typecheck. Se añadió ejecución de la suite de tests ya existente y build antes de declarar estable la implementación. Los tests **nuevos** de Fase 0D siguen perteneciendo a la fase posterior solicitada por el usuario.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

El módulo diagnóstico iba a recibir `LanguageRegistry`/settings pese a no necesitar política de lenguajes. Se redujo el contrato a `getAcceptedFences(): ReadonlySet<string>`, proporcionado desde `editor.ts` por la misma fuente usada por el highlighter. El probe queda independiente de registry/settings.

## Revisión 4

Resultado: CAMBIOS NECESARIOS + RETORNO A ARQUITECTURA.

La deduplicación podía conservar su baseline después de `controller.clear()`, haciendo que `clear(); capture()` suprimiera un snapshot idéntico ya capturado automáticamente. Se reabrió arquitectura y se añadió lifecycle `cleared`: vacía events e invalida dedup en targets, sin capturar por sí solo. Arquitectura volvió a estabilizarse antes de continuar.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Se precisó que viewport, selección y representación deben evaluarse sobre el rango físico completo del fence, no únicamente `block.from/to` del body. Se usa `openingLineFrom → closingLineTo ?? block.to`, y opening/body/closing mantienen sus rangos propios para `selectionRegion` y resolución DOM.

## Revisión 6

Resultado: SIN CAMBIOS.

Se contrastó el plan con el modelo real de `MudCodeBlock`. Los campos `openingLineFrom`, `openingLineTo`, `closingLineFrom?`, `closingLineTo?` existen y permiten implementar el rango completo sin modificar `blocks.ts`. No se encontró otra corrección.

## Revisión 7

Resultado: SIN CAMBIOS.

Revisión independiente del orden de dependencias y fases: controller → probe → lifecycle → wiring → regresiones existentes → TM de implementación → tests nuevos → TM de tests → gate Obsidian. No hay dependencia circular ni una fase que dependa de una conclusión visual aún no observada.

**ESTABLE según TM:** revisiones 6 y 7 consecutivas sin cambios.
