# Revisión TM temporal · plan de implementación Fase 1

Estado: TEMPORAL. Eliminar al cerrar el ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

La primera revisión se centró en si el orden operativo podía ejecutar la arquitectura sin introducir garantías implícitas o perder cobertura durante la migración.

Cambios incorporados:

1. **Invalidación de caché conservadora.** El borrador dejaba abierta una reutilización sofisticada de semántica entre documentos editados. Para esta refactorización, cualquier `docChanged` o cambio de runtime/revision invalida la caché semántica completa del view. Viewport/selection sin cambio documental sí reutilizan. Esto reduce riesgo de offsets/tokens obsoletos y deja optimizaciones incrementales para un ciclo posterior.
2. **Ledger de garantías retiradas.** Al eliminar `LivePreviewRenderedBlockBridge` habrá tests cuyo API deja de existir. Se permite adaptarlos/eliminarlos durante implementación solo después de registrar qué garantía útil cubrían y qué tarea de Fase 9 la sustituye. Así no se confunde “test obsoleto” con “garantía prescindible”.
3. **Excepción temporal explícita para diagnostics.** La futura prohibición de `.cm-embed-block`, `.cm-callout` y `HyperMD-codeblock` aplica a funcionalidad production, pero `_tmp-host-diagnostics.ts` puede seguir mencionándolos hasta el gate real. Tras limpieza final no queda ninguna excepción.
4. **Gate manual reforzado.** Se añade verificación específica de que nested rendered sigue entrando por el processor oficial después de retirar el bridge DOM privado.

No se modificó la arquitectura estabilizada; se precisó su ejecución y trazabilidad.
