# Revisión iterativa temporal de la implementación

Estado: TEMPORAL. Eliminar al terminar implementación + tests.

## Fase 0 · Instrumentación

### Revisión 1

Resultado: CAMBIOS NECESARIOS.

La primera instrumentación trazaba el fallback solo después de `collectUnprocessedRenderedCodeBlocks()`. Eso sesgaba la evidencia: un host con metadata `language-*` únicamente en `PRE` no llegaría a ser candidato y, por tanto, tampoco aparecería en la captura diagnóstica.

Corrección aplicada: la observación diagnóstica de host renderizado quedó separada del probe de producción. Ahora registra PRE-only, CODE-only, metadata equivalente/conflictiva y wrappers no previstos antes de que el código de producción filtre candidatos. Se añadió además `phase: observed|claimed` para distinguir estructura vista de estructura realmente reclamada.

### Revisión 2

Resultado: SIN CAMBIOS.

Revisión adversarial contra PRE-only, CODE-only, conflicto PRE/CODE, wrappers desconocidos, controles auxiliares, recreación de widgets, source visible y garantía de no mutación. No se encontró un cambio justificable antes de disponer de captura real.

### Revisión 3

Resultado: SIN CAMBIOS.

Se repitió la revisión después de CI completa verde, comprobando además que la instrumentación sigue inerte por defecto, que no cambia el criterio de claim y que los eventos de diagnóstico están limitados. No se encontraron cambios.

La instrumentación de Fase 0 queda ESTABLE por criterio TM: dos revisiones consecutivas sin cambios.

## Gate actual

La siguiente acción del plan requiere ejecutar el build instrumentado dentro de Obsidian real y capturar la matriz Text/PowerShell, Reading/Live Preview, top-level/callout y cursor dentro/fuera. El dispositivo remoto autorizado no estaba conectado durante esta ejecución, por lo que no se avanza a fixtures ni a cambios de producción para no violar el gate arquitectónico.
