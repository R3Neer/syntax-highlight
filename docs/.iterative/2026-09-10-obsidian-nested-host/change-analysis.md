# Análisis temporal de lo que ha cambiado

Estado: temporal. Debe borrarse al cerrar este ciclo iterativo.

## Cambio conceptual
Antes se trataban blockquotes/callouts principalmente como una propiedad del Markdown fuente. Ahora la integración reconoce que Obsidian tiene dos representaciones relevantes:
- source directamente visible, cubierto por el scanner quote-aware y las decoraciones CodeMirror;
- DOM renderizado de widgets Live Preview, cubierto por un bridge scoped al `EditorView`.

Reading View mantiene también dos entradas: processor especializado y fallback estructural tardío. Todas las entradas convergen en los mismos renderers.

## Cosas eliminadas o descartadas
- Se eliminó el requisito falso de que un `<pre>` válido tenga exactamente un hijo total.
- Se eliminó el test que consideraba un botón auxiliar motivo para rechazar el bloque.
- Se descartó la idea de que las decoraciones de offsets fueran suficientes para todo Live Preview.
- Durante revisión se descartó el escaneo en cada `ViewUpdate` por redundante.

## Cosas conservadas deliberadamente
El parser quote-aware, mapeo de offsets, presentación Text/Markdown, perfiles, renderers, processor especializado y contrast manager siguen teniendo responsabilidades válidas. No hubo evidencia para borrarlos.

## Efectos
- Reading View puede procesar DOM realista con copy button y preservarlo.
- Live Preview puede procesar fences reconocidos materializados dentro de `.cm-embed-block`, incluso si aparecen, se recrean o reciben la clase de lenguaje después.
- Se preservan unknowns, estructuras ambiguas y comportamiento cuando el highlighter de editor está desactivado.
- El coste se mantiene acotado al DOM de cada `EditorView` y a mutaciones de hijos/clases, con batching por animation frame.

## Decisión de cierre
No se inicia otra vuelta exterior. La revisión adversarial no ha encontrado un defecto adicional de arquitectura en este alcance. El siguiente paso es borrar todo el material temporal del ciclo, ejecutar CI final sobre ese estado limpio, abrir PR y validar PR + `main` después del squash merge.
