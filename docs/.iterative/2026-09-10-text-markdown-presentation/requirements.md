# Requisitos temporales — presentación de bloques Text/Markdown

> Documento temporal del Método Iterativo de Samuel. Debe eliminarse al finalizar este proceso.

## Funcionales

- [ ] Añadir configuración independiente para bloques **Text** y **Markdown**.
- [ ] Cada tipo permite elegir alineación `left`, `center` o `right`.
- [ ] Cada tipo permite elegir flujo tipográfico `ragged` o `justified`; `ragged` es el valor inicial del plugin.
- [ ] Los defaults iniciales de alineación son `left` para Text y Markdown, para mantener un comportamiento generalista y no alterar silenciosamente vaults existentes al migrar.
- [ ] `text`, `plaintext` y `txt` siguen sin badge ni números de línea.
- [ ] `md` y `markdown` pasan a compartir esa política de mobiliario: sin badge ni números de línea, manteniendo su resaltado Markdown.
- [ ] La presentación se aplica tanto en Reading View como durante la edición Markdown.
- [ ] Los modificadores locales de fence usan guiones y sobrescriben solo las dimensiones que explicitan.
- [ ] Gramática aceptada: `<base>[-<alignment>][-<flow>]`, con `alignment = left|center|right`, `flow = ragged|justified`, y orden canónico alineación antes de flujo.
- [ ] Deben ser válidos, entre otros: `text-right-justified`, `text-center`, `text-ragged`, `markdown-center-ragged`, `md-right-justified` y equivalentes sobre aliases de Text.
- [ ] Un bloque sin modificadores hereda ambos defaults de su tipo; un bloque con un modificador parcial hereda la dimensión omitida.
- [ ] `justified` usa justificación para líneas envueltas y la alineación elegida como alineación de la última línea; `ragged` usa directamente la alineación elegida.
- [ ] Al cambiar cualquier default de Text o Markdown, preguntar si se quiere **mantener la apariencia actual** de los bloques que dependían del valor cambiado o **aplicar el nuevo default**.
- [ ] Si se mantiene la apariencia, reescribir únicamente los bloques cuyo aspecto cambiaría, convirtiéndolos a una variante canónica con alineación y flujo completamente explícitos según su presentación resuelta anterior.
- [ ] Si se aplica el nuevo default, no reescribir notas; los bloques que heredaban adoptan el nuevo valor.
- [ ] Antes de confirmar una reescritura, el diálogo debe indicar cuántos bloques y archivos Markdown se verán afectados.
- [ ] La reescritura debe modificar solo la etiqueta del fence de apertura, preservando fence char/longitud, indentación, contenido, cierre y resto de la nota.
- [ ] Las variantes explícitas deben resolverse en Reading View y editor Markdown sin registrarse como lenguajes conceptualmente independientes.
- [ ] `.txt` no se reclama como extensión de archivo. `.md` sigue usando el editor nativo de Obsidian.
- [ ] PowerShell y el resto de lenguajes comunes no cambian de comportamiento.

## Interfaz

- [ ] Añadir un bloque de configuración de presentación con exactamente dos grupos visibles: `Text blocks` y `Markdown blocks`.
- [ ] Cada grupo muestra `Alignment: [ Left | Center | Right ]` como control segmentado.
- [ ] Cada grupo muestra `Flow: [ Ragged | Justified ]` como control segmentado de dos estados.
- [ ] Añadir un bloque informativo que explique herencia, modificadores con guiones, `ragged`/`justified`, el orden canónico y ejemplos.
- [ ] El popup de cambio de default debe ofrecer acciones claras: mantener apariencia actual, aplicar nuevo default y cancelar.

## No funcionales

- [ ] Mantener una sola fuente de verdad para parseo/resolución/canonicalización de modificadores de presentación.
- [ ] Evitar `if` dispersos por strings concretos de fence; modelar la capacidad de presentación por familia/lenguaje.
- [ ] Mantener compatibilidad con configuraciones schema 7 y anteriores mediante defaults seguros.
- [ ] Añadir tests unitarios e integración suficientes para parser de modifiers, resolución, renderer, editor, reescritura y settings.
- [ ] `npm ci`, lint, typecheck, tests, build y `pack:all` deben quedar verdes.
- [ ] Actualizar documentación persistente y changelog solo con comportamiento final.
- [ ] Eliminar este documento y cualquier `analysis.md` / `plan.md` temporal creado para este proceso antes del merge final.
