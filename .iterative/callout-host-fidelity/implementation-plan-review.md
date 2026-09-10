# Revisión iterativa del plan de implementación

Estado: TEMPORAL. Eliminar al terminar implementación + tests.

## Iteración 1

Resultado: CAMBIOS NECESARIOS.

Se detectaron cuatro carencias en v1:
- no había gate duro que impidiera volver a mergear una solución “verde” sin validación en Obsidian real;
- faltaba una regresión top-level explícita al final de cada capa, necesaria para detectar dobles superficies/claims;
- la matriz de Smart Editing no cubría suficientemente cursor, prefijos ya existentes y line endings;
- la fase de surface podía añadir clases host sin probar efectos laterales sobre edición/transición.

La v2 añade esos gates y pruebas, además de exigir el fragmento real de `inbox.md` en forma canónica y permisiva.

## Iteración 2

Resultado: SIN CAMBIOS.

Revisión adversarial contra: orden test-first, rollback a análisis si el host contradice hipótesis, semántica quoted-fence, Smart Enter/paste, PRE/CODE ambiguity, Reading primary/fallback, LP lifecycle, source surface, contrast, theme independence, consolidación de tests, limpieza temporal y gate de merge.

El orden no obliga a implementar una hipótesis antes de verificarla y mantiene puntos de parada claros. El plan de implementación v2 queda ESTABLE.
