# Revisión iterativa extra de candidatos a eliminación

Estado: TEMPORAL. Eliminar al terminar implementación + tests.

## Candidatos revisados

### `packages/obsidian/tests/reading-real-dom.test.ts`

Iteración 1: NO ELIMINAR TODAVÍA.

Aunque el nombre “real DOM” es engañoso y el fixture es inventado, el archivo conserva dos garantías que no están completamente duplicadas en Reading: identidad del copy node después del rescate y rechazo del PRE con dos CODE directos. Borrarlo ahora reduciría cobertura antes de existir la suite de fixture capturado.

Acción futura: migrar esas aserciones a la nueva suite host y eliminar entonces el archivo.

### `packages/obsidian/tests/live-preview-extension-integration.test.ts`

Iteración 1: NO ELIMINAR TODAVÍA.

El fixture también es supuesto, pero el archivo aporta una garantía distinta a los tests directos del bridge: comprueba que `createMarkdownEditorExtensions` instala realmente la extensión y que un `EditorView` la ejecuta. Eliminarlo antes de la prueba sustituta permitiría romper wiring con CI verde.

Acción futura: sustituirlo por integración extensión + fixture capturado y eliminar entonces el archivo viejo.

### Source files

Iteración 1: NO ELIMINAR.

`reading-host.ts`, `live-preview-host.ts` y `contrast-manager.ts` siguen teniendo responsabilidades vivas. El plan mueve lógica compartida y simplifica adapters, pero borrar cualquiera antes de la sustitución rompería el producto o forzaría una big-bang refactor innecesaria.

## Iteración 2

Resultado: SIN CAMBIOS.

Se volvió a comprobar cada candidato preguntando: “¿puede eliminarse ahora sin perder una garantía observable o romper imports/lifecycle?”. La respuesta sigue siendo no para todos los archivos permanentes.

Por tanto, en esta fase de planificación **no se elimina ningún archivo permanente**. La eliminación queda condicionada a migración de cobertura dentro de la futura implementación. Sí se eliminó ya el test experimental `_tmp-callout-host-hypothesis.test.ts` de la rama de análisis después de obtener su resultado, porque era instrumental y deliberadamente fallaba.
