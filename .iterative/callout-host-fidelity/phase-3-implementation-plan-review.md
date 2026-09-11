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

## Revisión 2

Resultado: SIN CAMBIOS.

Primera revisión limpia del plan actual.

Se revisó el orden operativo y los failure modes:

- el modelo se cambia antes que el adapter;
- `viewportRange()` queda encapsulado en `editor.ts` con fallback únicamente headless;
- marks/widgets permanecen sobre `visibleRanges`;
- no se añaden tests adversariales nuevos antes del TM de implementación;
- suite existente + build + pack validan primero la compatibilidad;
- cualquier expectativa antigua adaptada por el shape ampliado se registra y no cuenta como cobertura nueva.

No se identificó ninguna fase ausente ni cambio necesario.

## Revisión 3

Resultado: SIN CAMBIOS.

Segunda revisión limpia, centrada en scope y aislamiento:

- parser/semantic engine de Fase 2 quedan congelados;
- CSS y paleta quoted quedan congelados;
- routing rendered/Reading no cambia;
- settings gating no se mezcla con Fase 3;
- Smart Editing, contrast manager y configured profiles no cambian;
- el único cambio funcional autorizado es la decisión de materialización de `Decoration.line` quoted;
- tests adversariales nuevos siguen bloqueados hasta cerrar TM de implementación.

Revisiones 2 y 3 consecutivas sin cambios: el plan de implementación Fase 3 queda ESTABLE según TM.
