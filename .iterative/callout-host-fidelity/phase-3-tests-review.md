# Revisión TM temporal · tests Fase 3

Estado: TEMPORAL. Eliminar tras resolución definitiva, gate satisfactorio y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

La suite adversarial no llegó a ejecutarse porque contenía un helper `registry()` sin uso.

Acción: retirar el helper. Producción no cambió.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

TypeScript rechazó el tipo derivado `Parameters<typeof EditorState.create>[0]["extensions"]` porque la configuración de `EditorState.create` es opcional.

Acción: tipar el helper de montaje explícitamente como `readonly Extension[]`. Producción no cambió.

## Revisión 3

Resultado: ARQUITECTURA FALSADA · DETENER FASE.

La suite llegó a ejecutarse y produjo dos resultados incompatibles con la hipótesis arquitectónica de Fase 3:

1. tras ocultar directamente el prefijo `> ` mediante un `StateField<DecorationSet>` + `Decoration.replace`, `body.lineFrom` seguía perteneciendo a `view.visibleRanges`;
2. tras reemplazar una quoted body line corta completa, la line decoration de Syntax Highlight seguía materializándose.

La implementación nueva no es el problema de estas aserciones: las premisas del test eran incorrectas.

La lectura del source oficial de CodeMirror explica el resultado:

- `ViewState.computeVisibleRanges()` calcula rangos usando únicamente decorations directas/estáticas (`stateDeco`), pero llama `RangeSet.spans(..., 20)`;
- `RangeSet.spans` documenta que con `minPointSize > -1` solo toma en cuenta point ranges de al menos ese tamaño;
- `Decoration.replace` es un point decoration cuyo tamaño es la longitud del rango reemplazado.

Consecuencia:

- un replacement de 1–2 caracteres para `> ` no altera `visibleRanges`;
- una línea corta completamente reemplazada tampoco tiene por qué alterarlos si su longitud es menor de 20;
- por tanto, la hipótesis “el `lineFrom` quoted está fuera de visibleRanges por ocultación del prefijo” no está respaldada por CodeMirror y queda falsada por la suite.

Decisión TM:

- no ajustar el test para usar artificialmente un replacement >=20 solo para forzar `visibleRanges`;
- detener Fase 3 antes de buscar revisiones limpias;
- reabrir análisis/arquitectura;
- retirar/revertir la implementación y tests específicos basados en esta premisa antes de la siguiente propuesta;
- conservar diagnostics temporales y evidencia real.

No existe ninguna revisión limpia de tests de Fase 3. El TM de esta fase queda ABORTADO por falsación arquitectónica.
