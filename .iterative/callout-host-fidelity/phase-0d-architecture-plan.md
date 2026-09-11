# Plan arquitectónico temporal · Fase 0D post-frame host diagnostics

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

Este plan focalizado gobierna la siguiente unidad de trabajo. No sustituye el plan arquitectónico global salvo donde exista conflicto sobre la Fase 0D.

## Objetivo

Obtener evidencia del **DOM final materializado por Obsidian real** para source visible de fenced blocks top-level y quoted, después de la reconciliación de CodeMirror, sin modificar el DOM observado.

La salida debe permitir decidir el siguiente fix por evidencia, no por equivalencia asumida entre `DecorationSet`, un `EditorView` aislado y el host Obsidian.

## Restricción dura

Fase 0D es diagnóstica. No corregirá todavía surface, inline-code ni colores.

Las decorations de Fase 0C (`syntax-quoted-code-source`, `HyperMD-codeblock*`, `cm-builtin`) se conservan temporalmente porque forman parte del estímulo: necesitamos saber si Obsidian las materializa, las mueve, las sustituye o las ignora.

## Componente temporal

Crear un componente temporal, conceptualmente `LivePreviewPostFrameDiagnostics`, integrado como `ViewPlugin` dentro del mismo `EditorView` que usa el plugin.

Responsabilidades:

1. recibir el `EditorView` real;
2. detectar cambios relevantes de lifecycle (`docChanged`, `selectionSet`, `viewportChanged` y actualizaciones que puedan recrear widgets/source);
3. programar una única captura batched mediante `requestAnimationFrame`;
4. reconstruir los fenced blocks reconocidos desde `view.state.doc` usando la fuente de verdad actual `findCodeBlocks()`;
5. localizar opening/body/closing en DOM por posición documental con `view.domAtPos()` y ascenso controlado hasta `.cm-line`;
6. capturar únicamente estructura/clases/estilos necesarios;
7. publicar eventos en `window.SyntaxHighlightHostDiagnostics` mediante el helper temporal existente;
8. no añadir/quitar clases, estilos, atributos ni listeners al DOM observado.

## Momento de captura

La captura NO se realiza dentro de `buildSyntaxDecorations()`.

Secuencia:

`ViewUpdate` → `requestAnimationFrame` → resolver posiciones → inspeccionar DOM final.

Si durante el frame una posición pertenece a un widget/replaced range y no existe `.cm-line`, se registra explícitamente como `materialized: false` en vez de inventar una estructura.

## Unidad de observación

Por cada fenced block reconocido visible/relevante:

- fence normalizado;
- `quoteDepth`;
- posiciones físicas de opening/body/closing;
- estado de selección respecto del bloque (`outside`, `opening`, `body`, `closing`);
- representación (`source-line`, `rendered-widget`, `not-materialized`) cuando pueda determinarse sin heurística global.

Por cada línea materializada:

- tag y clases del `.cm-line` final;
- atributos seguros relevantes;
- estilos computados mínimos: `backgroundColor`, `color`, `display`, `position`, `padding*`, `border*`, `fontFamily`, `fontSize`, `textAlign`, `whiteSpace`;
- ancestry resumido hasta `.cm-s-obsidian` / `.cm-editor`;
- descendientes relevantes con tag, clases, texto truncado y color/background computados;
- presencia de `data-syntax-contrast-adjusted` e inline `color`/prioridad.

## Tokens objetivo

Para PowerShell de la nota de prueba, el probe intentará identificar por texto y posición lógica/física:

- `$foo`;
- `=`;
- `42`;
- `Write-Host`.

No dependerá de que estén en un único span: registrará los descendientes que cubran sus posiciones documentales y su ancestry inmediato.

## Sanitización

La salida no incluirá rutas de vault, nombres de archivos, contenido exterior al bloque ni HTML arbitrario completo.

Texto de líneas/tokens se limita a fragmentos del propio bloque y se trunca. Atributos sensibles o irrelevantes se omiten.

## Integración con el helper diagnóstico

Extender `_tmp-host-diagnostics.ts` con un tipo/evento separado, por ejemplo `live-preview-post-frame`, en lugar de sobrecargar semánticamente `live-preview-source`.

El API global mantiene:

- `enable()`;
- `clear()`;
- `dump()`;
- `events`.

No se añade persistencia ni configuración permanente.

## Lifecycle y coste

- inerte cuando diagnostics está deshabilitado;
- como máximo un `requestAnimationFrame` pendiente por `EditorView`;
- sin `MutationObserver` global;
- no escanear `document.body`;
- trabajar desde posiciones de bloques reconocidos del documento;
- `destroy()` cancela el frame pendiente;
- limitar número de bloques/líneas/eventos para evitar dumps explosivos.

## Decisión posterior basada en evidencia

La captura debe permitir clasificar el fallo en una o varias ramas:

### A · `Decoration.line` ausente del `.cm-line` final

Investigar lifecycle/precedencia/composición de extensiones. No tocar CSS hasta demostrar que la clase llega al DOM.

### B · `Decoration.line` presente pero estilos de surface no coinciden

Investigar selector/ancestry/cascade. Considerar clase propia o bridge de estilo computado; no cambiar el scanner.

### C · `Decoration.mark` `syntax-common-*` / `cm-*` ausente

Investigar materialización de marks y conflictos con marks nativos/replaced ranges.

### D · marks presentes y color temático correcto antes del normalizador, pero color final alterado

Investigar `CommonContrastManager` con background real capturado.

### E · marks presentes pero el tema no los alcanza por ancestry

Considerar una capa temática propia basada en variables/estilos computados del host, sin branch por nombre de tema.

## Tests de esta fase

Los tests de Fase 0D verifican la instrumentación, no el fix visual:

- scheduling batched post-frame;
- resolución por posición documental a `.cm-line`;
- `materialized: false` cuando una posición está reemplazada/no visible;
- captura de clases/estilos/tokens sin mutación;
- selección outside/body;
- cancelación en `destroy()`;
- diagnostics disabled = cero trabajo/cero eventos;
- límite/sanitización de texto y atributos.

Un test con `EditorView` genérico sigue siendo válido para el **probe**, pero no se usará para afirmar fidelidad de Obsidian.

## Gate

No se diseña ni implementa el siguiente fix de surface/color hasta obtener una captura real post-frame en Obsidian de:

1. PowerShell top-level con cursor dentro;
2. PowerShell quoted con cursor dentro;
3. cursor fuera de ambos.

Idealmente repetir Text presentacional quoted después, pero PowerShell basta para clasificar primero la frontera de materialización.
