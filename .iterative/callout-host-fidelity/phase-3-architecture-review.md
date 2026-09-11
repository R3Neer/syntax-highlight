# Revisión TM temporal · arquitectura Fase 3

Estado: TEMPORAL. Eliminar tras gate satisfactorio y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se detectaron dos precisiones necesarias en la política de materialización de línea:

1. no reutilizar sin más el predicado inclusivo histórico `rangeIntersectsVisible()` para decidir si una line decoration tiene contenido materializado;
2. no introducir un segundo fast path de bloque si el rango físico existente ya cubre opening/body/closing.

Cambios incorporados al plan:

- overlap half-open para líneas no vacías;
- point containment explícito para líneas físicas vacías;
- evitar falsos positivos por simple contacto con el borde de un `visibleRange`;
- conservar el fast path físico actual de bloque y cambiar solo la decisión por línea.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Al contrastar el plan con el lifecycle oficial de CodeMirror se detectó que el test adversarial no puede depender de una segunda decoration indirecta de ViewPlugin para construir el escenario de `visibleRanges` colapsados.

CodeMirror calcula viewport/visible ranges antes de recuperar decorations indirectas del ViewPlugin. Por tanto, un replacement de prueba indirecto podría no alterar `visibleRanges` y producir una falsa validación.

Cambio requerido:

- el test adversarial debe ocultar el prefijo quoted mediante una decoration **directa**, preferiblemente un `StateField<DecorationSet>` que provea `EditorView.decorations.from(field)`;
- la decoration de producto sigue siendo indirecta desde `createEditorHighlighter`, que es precisamente el comportamiento a validar;
- el test debe afirmar primero que el replacement directo ha provocado la separación esperada entre `viewport` y `visibleRanges` antes de comprobar la surface de Syntax Highlight.

Aún no existe una revisión limpia para el plan actual.
