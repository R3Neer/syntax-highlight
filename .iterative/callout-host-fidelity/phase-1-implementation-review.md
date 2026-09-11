# Revisión TM temporal · implementación Fase 1

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se revisó el diff funcional completo contra el plan arquitectónico estabilizado, con especial atención a la frontera oficial Obsidian/CodeMirror, ownership del DOM, themes y contraste.

### Cambios

- surface source: `background-color` en vez de shorthand `background`;
- color base de source y variables comunes no categorizadas caen a `--text-normal`, sin dependencia frágil de un `--code-normal` inválido;
- `CommonContrastManager` consulta y modifica únicamente tokens dentro de `.syntax-highlight-frame`.

No cuenta como revisión limpia.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Se revisó la frontera entre el artifact Obsidian y el contrato npm del adapter.

### Cambio

El artifact deja imports externos reales a CodeMirror/Lezer además de `obsidian`, mientras el paquete npm declaraba solo `obsidian` como peer.

Se añadieron como `peerDependencies` los módulos externos realmente requeridos por `dist/main.js`:

- `@codemirror/autocomplete`, `commands`, `language`, `search`, `state`, `view` con `^6.0.0`;
- `@lezer/common`, `highlight`, `lr` con `^1.0.0`;
- `obsidian` conserva `^1.7.2`.

`electron`, `collab`, `lint` y built-ins siguen siendo frontera preventiva del bundle, no peers fantasma. `npm ci`, check y `pack:all` pasan.

No cuenta como revisión limpia.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

Se revisó la semántica de settings tras retirar `LivePreviewRenderedBlockBridge`.

### Hallazgo

`registerMarkdownCodeBlockProcessor` es la ruta oficial compartida por Reading y rendered Live Preview. El handler conservaba una decisión interna basada solo en `settings.markdownReading`, mientras la ruta privada eliminada estaba gobernada por `markdownEditor`.

Eso podía producir una incoherencia: `markdownEditor=false` desactivaba las decorations source, pero un widget rendered dentro de un `MarkdownView` source podía seguir recibiendo resaltado por el processor oficial.

### Corrección

- `renderReadingFence()` acepta ahora un `highlightEnabled` explícito;
- `main.ts` decide el setting aplicable usando APIs públicas de Obsidian;
- `MarkdownView.getMode() === "source"` -> `markdownEditor`;
- preview/Reading/no owner -> `markdownReading`;
- el generic fallback recibe el PRE original observado para poder resolver el mismo contexto si Obsidian lo invoca incidentalmente fuera de Reading;
- no se reintroduce ninguna dependencia de clases privadas ni scanning del EditorView.

No cuenta como revisión limpia.

## Revisión 4

Resultado: CAMBIOS NECESARIOS.

La revisión de embeds/transclusiones detectó que el primer resolver de modo filtraba primero los `MarkdownView` por `view.file.path === context.sourcePath` y solo después buscaba containment del elemento.

En una transclusión, `context.sourcePath` puede identificar la nota embebida mientras el DOM pertenece al `MarkdownView` de la nota host. Esa prioridad podía seleccionar el setting equivocado.

### Corrección

- identificar primero el `MarkdownView` cuyo `containerEl` contiene realmente el elemento procesado;
- solo si no existe owner por containment usar `context.sourcePath` como fallback, y únicamente cuando produce una vista inequívoca;
- ausencia/ambigüedad cae conservadoramente a `markdownReading`.

La misma revisión detectó que el plan de implementación, definido como fuente de verdad del progreso, mantenía Fases 0–7 sin marcar pese a estar implementadas y validadas. Se sincronizaron los checkboxes; Fase 8 sigue abierta.

No cuenta como revisión limpia.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Se revisó el ledger de garantías retiradas al eliminar el bridge privado.

### Hallazgo

La garantía antigua `markdownEditor=false no activa el bridge` se había descrito de forma narrativa pero no tenía un destino de prueba concreto para la nueva arquitectura mode-aware.

### Corrección

El ledger exige ahora en Fase 9 una matriz explícita que cubra:

- source `MarkdownView` -> `markdownEditor`;
- preview/Reading -> `markdownReading`;
- owner por `containerEl` prevalece sobre `context.sourcePath`;
- caso de transclusión con `sourcePath` distinto del archivo host;
- ausencia/ambigüedad de owner cae a `markdownReading`.

No se modifica el diseño production en esta revisión; se cierra la trazabilidad de una garantía nacida durante la propia revisión de implementación.

No cuenta como revisión limpia.
