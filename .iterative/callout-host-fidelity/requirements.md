# Requisitos temporales: fidelidad de bloques anidados en Obsidian

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

## Objetivo

Hacer que los fenced blocks soportados por Syntax Highlight se comporten dentro de blockquotes y callouts como sus equivalentes top-level en Obsidian, tanto en Reading View como en Live Preview/source-visible, sin introducir excepciones por tema concreto.

## Requisitos funcionales

1. `text`, `plaintext`, `txt`, Markdown, PowerShell, lenguajes comunes, perfiles configurados y MUD deben conservar dentro de callouts/blockquotes la misma política de presentación, syntax highlighting, badge y números que top-level.
2. El adaptador Obsidian aceptará como entrada la semántica que Obsidian realmente renderiza, incluso cuando una línea interior de un fenced block citado no repita `>`.
3. Smart Editing producirá forma canónica: al crear nuevas líneas o pegar contenido multilínea dentro de un fenced block citado, mantendrá el prefijo de quote correspondiente sin duplicarlo si ya existe.
4. Reading View deberá procesar bloques anidados aunque el processor especializado no los reclame o el host coloque la metadata de lenguaje en una variante DOM distinta.
5. Live Preview deberá cubrir dos representaciones: widget renderizado fuera del foco y líneas fuente visibles dentro del foco.
6. Unknown/ambiguous fences deben quedar intactos. Nunca reinterpretar un bloque cuando PRE/CODE expresen lenguajes incompatibles.
7. Controles auxiliares del host, como copy buttons, deben conservar identidad, listeners y comportamiento.
8. La solución debe soportar blockquotes/callouts anidados y recreación/virtualización de widgets.

## Requisitos no funcionales

- Obsidian es la autoridad de semántica del adaptador; el núcleo host-neutral no debe adquirir quirks de Obsidian.
- No detectar nombres de tema ni mantener tablas Nier/Minimal/etc.
- Reutilizar un único resolved-fence renderer/política semántica.
- Preferir integración con clases/estructuras host observadas a DOM inventado en tests.
- Los tests deben ser adversariales y distinguir comportamiento fuente, Reading y widget Live Preview.
- Capturar o registrar fixtures de DOM real de Obsidian antes de fijar selectores definitivos de producción.
- Mantener CI verde y no rebajar cobertura para hacer pasar la solución.

## Restricción de este ciclo

En esta fase solo se permite análisis, experimentación temporal, planes y revisión de candidatos a eliminación. No implementar todavía la corrección de producción.
