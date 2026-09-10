# Revisión temporal adversarial

Estado: temporal. Debe borrarse al cerrar este ciclo iterativo.

## Revisión contra requisitos
- Reading View ya no exige que `<code>` sea el único hijo del `<pre>`; exige exactamente un `<code>` directo y tolera mobiliario auxiliar.
- Los controles auxiliares se mueven como los mismos nodos al nuevo `<pre>`, por lo que se conservan identidad y listeners.
- Live Preview añade un ViewPlugin ligado a `EditorView.dom`; no usa un observer global.
- Solo se inspeccionan subárboles `.cm-embed-block`, evitando competir con bloques top-level representados directamente por CodeMirror.
- El bridge usa el mismo detector estructural y `renderResolvedFence` que Reading View.
- Text/Markdown, PowerShell, TOML y MUD han sido probados por el camino de widget renderizado.
- Unknown fences y DOM ambiguo se conservan sin cambios.
- Un handler que lanza no bloquea hermanos sanos.
- Inserción tardía, eliminación/recreación y clasificación tardía mediante cambio de clase están cubiertas.
- `markdownEditor=false` deja el widget nativo intacto.

## Ataques realizados al diseño
1. `<pre>` con botón de copia y controles arbitrarios con listeners.
2. Dos `<code>` directos para provocar ambigüedad real.
3. Elemento idéntico fuera de `.cm-embed-block` para comprobar scope.
4. Unknown fence para comprobar no apropiación.
5. Procesamiento repetido para comprobar idempotencia.
6. Excepción intencional en un bloque con hermano sano.
7. Widget insertado después de arrancar el bridge.
8. Widget retirado y recreado como haría la virtualización del editor.
9. Clase `language-*` añadida después del montaje.
10. Integración a través de un `EditorView` real con `createMarkdownEditorExtensions`, no solo invocación directa de helpers.

## Hallazgo durante revisión
La primera implementación llamaba `scheduleScan()` desde cada `ViewPlugin.update()`. Era correcto pero innecesariamente caro. Se eliminó: el escaneo inicial cubre widgets existentes y el `MutationObserver` cubre cambios DOM. Después se amplió el observer a mutaciones de `class` para no depender de que Obsidian asigne `language-*` en el mismo instante en que crea el nodo.

## Resultado
No aparece otro supuesto host-inexacto que justifique una nueva vuelta de implementación. La CI final de implementación pasa lint, typecheck, 30 archivos de tests / 225 tests antes del último caso de clasificación tardía, build, pack y artefactos; el commit posterior que añade ese caso también pasa la CI completa.
