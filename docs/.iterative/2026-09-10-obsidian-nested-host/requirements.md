# Requisitos temporales: integración real de bloques anidados en Obsidian

Estado: temporal. Debe borrarse al cerrar este ciclo iterativo.

## Objetivo
Corregir de forma verificable el comportamiento de fences dentro de blockquotes y callouts de Obsidian tanto en Reading View como en Live Preview, sin romper el comportamiento top-level.

## Requisitos funcionales
- Reading View debe procesar bloques reconocidos aunque el `<pre>` contenga UI auxiliar de Obsidian, por ejemplo botón de copia.
- Live Preview debe procesar el DOM renderizado de bloques dentro de `.cm-embed-block`, no limitarse a decorar offsets de líneas fuente que pueden no ser el DOM visible.
- Text y Markdown deben conservar su política presentacional: sin badge ni números, con alignment/flow por defaults y overrides.
- PowerShell, lenguajes comunes y perfiles configurados deben conservar resaltado y números según su política.
- MUD debe seguir aislado por perfil de bóveda.
- Lenguajes desconocidos deben permanecer intactos.
- El source visible no debe alterarse ni perder whitespace/saltos de línea.
- El procesamiento debe ser idempotente y tolerar recreación/virtualización de widgets de CodeMirror.
- Un fallo al procesar un bloque no debe impedir procesar otros bloques.
- No se debe depender de nombres concretos de callout.

## Requisitos de compatibilidad
- Mantener el scanner quote-aware y el mapeo lógico/físico salvo evidencia concreta para retirarlos.
- Mantener el camino especializado `registerMarkdownCodeBlockProcessor` para bloques que Obsidian sí entrega por esa API.
- El fallback de Reading y el bridge de Live Preview deben reutilizar un único resolver/renderizador de fence.
- Evitar MutationObserver globales sobre todo el documento para Live Preview; observar exclusivamente el DOM del `EditorView` correspondiente.

## Requisitos adversariales
Los tests deben cubrir DOM realista de Obsidian: `<pre>` con `<code class="language-* is-loaded">` más `button.copy-code-button`, `.cm-embed-block.cm-callout`, widgets que aparecen después de crear el ViewPlugin, eliminación y recreación del widget, varios bloques hermanos, clases engañosas/ambiguas, múltiples botones/elementos auxiliares, ejecución repetida, unknown fences y un handler que lanza.

## Criterio de terminado
- CI verde en rama.
- CI verde en PR.
- Merge squash a `main`.
- CI verde posterior al merge.
- Sin documentos/helpers/workflows temporales del ciclo.
