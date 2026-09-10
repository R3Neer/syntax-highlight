# Plan temporal: integración real de bloques anidados

Estado: temporal. Debe borrarse al cerrar este ciclo iterativo.

## Plan v1
- [x] Requisitos.
- [x] Análisis con búsqueda explícita de piezas prescindibles.
- [x] Revisión previa al borrado.
- [x] Eliminar el supuesto inválido `pre.children.length === 1` y el test que lo protegía.
- [ ] Extraer un resolver/renderizador reutilizable de fence que no dependa de `MarkdownPostProcessorContext`.
- [ ] Mantener un wrapper de Reading View que añada click-to-edit y el atributo de procesado.
- [ ] Añadir un bridge de Live Preview asociado a cada `EditorView` que observe solo `view.dom`, procese candidatos dentro de `.cm-embed-block` y reaccione a widgets insertados/recreados.
- [ ] Reutilizar el mismo detector estructural en Reading y Live Preview.
- [ ] Evitar procesar output propio, unknown fences y estructuras con más de un `<code>` directo.
- [ ] Aislar fallos por bloque en ambos hosts.
- [ ] Añadir tests adversariales con DOM realista de Reading y Live Preview, inserción tardía, recreación, varios hermanos, copy button, ambigüedad y fallos.
- [ ] Verificar que los tests anteriores de offsets quote-aware siguen pasando para edición directa.
- [ ] Documentar la doble estrategia: decorations para source visible + DOM bridge para widgets Live Preview.
- [ ] Ejecutar `npm run check` y `npm run pack:all`.
- [ ] Revisar diff completo y repetir implementación si aparece cualquier supuesto host-inexacto.
- [ ] Borrar todos los temporales del ciclo.
- [ ] Abrir PR, esperar CI verde, squash merge y comprobar CI de `main`.

## Revisión del plan v1
- El bridge no debe observar `document.body`; debe vivir y morir con el `EditorView` para respetar virtualización y evitar trabajo global.
- No debe sustituir `buildSyntaxDecorations`: ambos caminos cubren representaciones distintas del mismo documento.
- El selector de Live Preview debe estar limitado a `.cm-embed-block` para no competir con los codeblocks normales que ya controla CodeMirror mediante decorations.
- El renderer compartido debe poder ejecutarse sin activar click-to-edit, ya que Live Preview ya es el editor.

Plan revisado: sin cambios adicionales necesarios antes de implementar.
