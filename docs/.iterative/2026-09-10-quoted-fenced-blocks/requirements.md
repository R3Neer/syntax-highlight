# Requisitos temporales — bloques fenced dentro de blockquotes/callouts

> Documento temporal del Método Iterativo de Samuel. Debe eliminarse al finalizar este proceso.

## Funcionales

- [ ] Aplicar Syntax Highlight a fences reconocidos dentro de blockquotes Markdown (`> ```lang`) igual que a fences top-level.
- [ ] Cubrir callouts de Obsidian (`> [!tipo]` seguidos de `> ```lang`) sin tratamiento especial por tipo de callout: deben funcionar por ser contenedores blockquote.
- [ ] Soportar profundidad de cita mayor que uno (`> > ```lang`) sin convertir marcadores de quote del contenedor en código.
- [ ] En Editing View, quitar el prefijo de blockquote únicamente para tokenizar el contenido lógico y mapear después los rangos de tokens a sus offsets reales del documento.
- [ ] Los marcadores `>` del contenedor no deben recibir clases de sintaxis del lenguaje contenido.
- [ ] Mantener resaltado, tema activo, normalización de contraste, badges y números de línea para lenguajes de código según las mismas reglas que top-level.
- [ ] Mantener Text/Markdown sin badge ni números de línea, incluida su alineación/flujo y variantes con guiones, también dentro de blockquotes/callouts.
- [ ] Los números de línea de código dentro de un blockquote deben anclarse al comienzo del contenido del código, no antes del marcador `>`.
- [ ] La detección y reescritura de variantes presentacionales al cambiar defaults debe incluir bloques Text/Markdown citados y modificar solo la etiqueta del fence de apertura.
- [ ] Mantener la protección contra falsos positivos: un `> ```text` literal escrito dentro de otro fence no debe tratarse como bloque real.
- [ ] Mantener soporte para backticks y tildes, info strings adicionales, CRLF y bloques sin quote.
- [ ] No introducir lógica específica para nombres de callout (`note`, `warning`, etc.).

## Interacción

- [ ] El clic en Reading View debe seguir conservando la línea fuente funcional de los bloques renderizados; no debe regresionar el arreglo `data-source-line`.
- [ ] Smart editing debe detectar la pertenencia a un bloque quoted cuando el cursor está dentro del contenido y no confundir el prefijo `>` con contenido del lenguaje para la detección del bloque.

## No funcionales

- [ ] Centralizar en `blocks.ts` el reconocimiento del prefijo de blockquote y el mapeo entre contenido lógico y offsets físicos.
- [ ] Evitar duplicar parsers de blockquote/callout en editor, presentación y reescritura.
- [ ] Mantener compatibilidad de APIs existentes cuando sea razonable; los consumidores top-level deben seguir funcionando sin cambios semánticos.
- [ ] Añadir tests para scanner, mapping, editor common, Text/Markdown y configured/MUD donde proceda.
- [ ] Ejecutar `npm ci`, `npm run check` y `npm run pack:all` con resultado verde.
- [ ] Eliminar requisitos/análisis/plan y cualquier script/workflow temporal antes del merge.

## Revisión de requisitos

- R1: se modela el problema como soporte genérico de blockquotes, de modo que los callouts queden cubiertos sin acoplamiento a sintaxis `[!tipo]`.
- R2: se añadió explícitamente el requisito de mapear tokenización lógica a offsets físicos; reconocer solo el fence no basta porque `> ` contaminaría el parser del lenguaje.
- R3: sin cambios. Requisitos estables para análisis.
