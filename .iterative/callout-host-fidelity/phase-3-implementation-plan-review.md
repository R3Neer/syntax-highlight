# Revisión TM temporal · plan de implementación Fase 3

Estado: TEMPORAL. Eliminar tras gate satisfactorio y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

El plan no hacía explícita la migración de la consolidación interna de `lineSemantics()`.

Actualmente el modelo acumula clases por `from` mediante `Map<number, Set<string>>`. Tras introducir `to`, `visibilityFrom` y `visibilityTo`, varias aportaciones a la misma línea (surface quoted + presentation) deben compartir una única estructura completa y no pueden reconstruir/reescribir bounds independientemente.

Cambio requerido:

- la función interna de agregado recibe placement extent + visibility probe + clases;
- la primera aportación crea la estructura de línea completa;
- aportaciones posteriores al mismo `from` solo fusionan clases y deben conservar bounds idénticos;
- la suite nueva comprobará que una body line Text quoted mantiene un solo `EditorLineSemantic` con surface + presentation y un único extent/probe coherente.

Aún no existe ninguna revisión limpia del plan actual.
