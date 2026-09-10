# Requisitos temporales — presentación de bloques Text/Markdown

> Documento temporal del Método Iterativo de Samuel. Debe eliminarse al finalizar este proceso.

## Funcionales

- [x] Añadir configuración independiente para bloques **Text** y **Markdown**.
- [x] Cada tipo permite elegir alineación `left`, `center` o `right`.
- [x] Cada tipo permite elegir flujo tipográfico `ragged` o `justified`; `ragged` es el valor inicial del plugin.
- [x] Los defaults iniciales de alineación son `left` para Text y Markdown, para mantener un comportamiento generalista y no alterar silenciosamente vaults existentes al migrar.
- [x] `text`, `plaintext` y `txt` siguen sin badge ni números de línea.
- [x] `md` y `markdown` pasan a compartir esa política de mobiliario: sin badge ni números de línea, **manteniendo su resaltado de sintaxis Markdown**.
- [x] La presentación se aplica tanto en Reading View como durante la edición Markdown y los cambios de default se reflejan sin exigir reiniciar el plugin.
- [x] Los modificadores locales de fence usan guiones y sobrescriben solo las dimensiones que explicitan.
- [x] Gramática aceptada: `<base>[-<alignment>][-<flow>]`, con `alignment = left|center|right`, `flow = ragged|justified`, y orden canónico alineación antes de flujo.
- [x] Deben ser válidos, entre otros: `text-right-justified`, `text-center`, `text-ragged`, `markdown-center-ragged`, `md-right-justified` y equivalentes sobre aliases de Text.
- [x] Un bloque sin modificadores hereda ambos defaults de su tipo; un bloque con un modificador parcial hereda la dimensión omitida.
- [x] `justified` usa justificación para líneas envueltas y la alineación elegida como alineación de la última línea; `ragged` usa directamente la alineación elegida.
- [x] Los bloques presentacionales permiten wrapping visual para que `justified` tenga efecto, preservando el contenido fuente y los saltos explícitos.
- [x] Al cambiar cualquier default de Text o Markdown, analizar los bloques existentes que dependían del valor cambiado y cuyo aspecto cambiaría.
- [x] Si hay bloques afectados, preguntar si se quiere **mantener la apariencia actual**, **aplicar el nuevo default** o **cancelar**.
- [x] Si no hay bloques afectados, aplicar el nuevo default directamente sin un diálogo inútil.
- [x] Si se mantiene la apariencia, reescribir únicamente los bloques cuyo aspecto cambiaría, convirtiéndolos a una variante canónica con alineación y flujo completamente explícitos según su presentación resuelta anterior.
- [x] La reescritura conserva el alias base usado por cada bloque (`text`, `plaintext`, `txt`, `md` o `markdown`) y añade únicamente la forma canónica `-alignment-flow`.
- [x] Los bloques ya explícitos que no cambiarían de apariencia no se reescriben.
- [x] Si se aplica el nuevo default, no reescribir notas; los bloques que heredaban adoptan el nuevo valor.
- [x] Antes de confirmar una reescritura, el diálogo debe indicar cuántos bloques y archivos Markdown se verán afectados.
- [x] La reescritura debe modificar solo la etiqueta del fence de apertura, preservando fence char/longitud, indentación, contenido, cierre, info adicional y resto de la nota.
- [x] Si el escaneo o la reescritura falla, el nuevo default no se guarda; cualquier reescritura ya completada debe seguir siendo visualmente equivalente bajo la configuración anterior.
- [x] Las variantes explícitas deben resolverse en Reading View y editor Markdown sin modelarse como lenguajes conceptualmente independientes.
- [x] `.txt` no se reclama como extensión de archivo. `.md` sigue usando el editor nativo de Obsidian.
- [x] PowerShell y el resto de lenguajes comunes no cambian de comportamiento.

## Interfaz

- [x] Añadir un bloque de configuración de presentación con exactamente dos grupos visibles: `Text blocks` y `Markdown blocks`.
- [x] Cada grupo muestra `Alignment: [ Left | Center | Right ]` como control segmentado.
- [x] Cada grupo muestra `Flow: [ Ragged | Justified ]` como control segmentado de dos estados.
- [x] Añadir un bloque informativo que explique herencia, modificadores con guiones, `ragged`/`justified`, el orden canónico y ejemplos.
- [x] El popup de cambio de default debe mostrar el alcance y ofrecer acciones claras: mantener apariencia actual, aplicar nuevo default y cancelar.
- [x] Cancelar el popup deja tanto la configuración como las notas intactas.

## No funcionales

- [x] Mantener una sola fuente de verdad para parseo, resolución, enumeración y canonicalización de modificadores de presentación.
- [x] Evitar `if` dispersos por strings concretos de fence; modelar la capacidad de presentación por familia/lenguaje.
- [x] Mantener compatibilidad con configuraciones schema 7 y anteriores mediante defaults seguros y migrar el schema persistido de forma explícita.
- [x] Evitar que la cantidad finita de variantes de fence aparezca como una lista de lenguajes en la UI: siguen siendo overrides de Text/Markdown.
- [x] Añadir tests unitarios e integración suficientes para parser de modifiers, resolución, renderer, editor, reescritura, settings y no regresión del resto de lenguajes.
- [x] `npm ci`, lint, typecheck, tests, build y `pack:all` deben quedar verdes.
- [x] Actualizar documentación persistente y changelog solo con comportamiento final.
- [ ] Eliminar este documento y cualquier `analysis.md` / `plan.md` temporal creado para este proceso antes del merge final.

## Revisión de requisitos

- R1: añadidas garantías sobre Markdown (mantiene resaltado), wrapping, alias-preservation, cancelación, errores, cero bloques afectados y refresco inmediato.
- R2: sin cambios. Los requisitos quedan estables para pasar a análisis.
- R3: auditoría final de implementación satisface todos los requisitos funcionales, de interfaz y no funcionales; queda únicamente la limpieza deliberadamente pospuesta de estos documentos temporales antes de abrir la PR.
