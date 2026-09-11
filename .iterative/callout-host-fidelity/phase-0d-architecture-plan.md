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
2. programar captura inicial cuando diagnostics esté habilitado;
3. reaccionar a cualquier `ViewUpdate` relevante y también a mutaciones DOM scoped a `view.dom` que puedan ocurrir sin transacción de editor;
4. batir todos esos triggers en una sola captura post-frame;
5. reconstruir los fenced blocks reconocidos desde `view.state.doc` usando la fuente de verdad actual `findCodeBlocks()`;
6. limitar la inspección a bloques materializados en/near `view.visibleRanges` o que contengan la selección, con un cap duro adicional;
7. localizar opening/body/closing en DOM por posición documental con `view.domAtPos()` y ascenso controlado hasta `.cm-line`;
8. capturar únicamente estructura/clases/estilos necesarios;
9. publicar eventos en `window.SyntaxHighlightHostDiagnostics` mediante el helper temporal existente;
10. no añadir/quitar clases, estilos, atributos ni listeners al DOM observado, salvo el propio `MutationObserver` scoped que no muta el subtree.

## Triggers y settling

La captura NO se realiza dentro de `buildSyntaxDecorations()`.

Triggers:

- constructor/start del diagnostic ViewPlugin si diagnostics ya está habilitado;
- `ViewUpdate` con `docChanged`, `selectionSet`, `viewportChanged`, `geometryChanged` o `focusChanged` cuando exista;
- `MutationObserver` scoped a `view.dom` para `childList`, `subtree` y atributos `class`/`style`.

Todos los triggers llaman a un único scheduler idempotente.

Secuencia mínima:

`trigger` → `requestAnimationFrame` → resolver posiciones → inspeccionar DOM final.

Si el observer recibe otra mutación antes/durante la captura, se agenda un nuevo frame posterior. No se encadenan timers arbitrarios ni polling.

Si durante el frame una posición pertenece a un widget/replaced range y no existe `.cm-line`, se registra explícitamente como `materialized: false` en vez de inventar una estructura.

## Unidad de observación

Por cada fenced block reconocido visible/relevante:

- fence normalizado;
- `quoteDepth`;
- posiciones físicas de opening/body/closing;
- estado de selección respecto del bloque (`outside`, `opening`, `body`, `closing`);
- representación (`source-line`, `rendered-widget`, `not-materialized`) cuando pueda determinarse sin búsqueda global.

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

Extender `_tmp-host-diagnostics.ts` con un tipo/evento separado `live-preview-post-frame`, en lugar de sobrecargar semánticamente `live-preview-source`.

Añadir una consulta barata `hostDiagnosticsEnabled()` para que el ViewPlugin pueda evitar observer/scans cuando diagnostics esté deshabilitado. Al pasar de disabled → enabled, el primer `ViewUpdate` o una llamada explícita de captura debe poder iniciar el diagnóstico sin reiniciar Obsidian.

El API global mantiene:

- `enable()`;
- `disable()`;
- `clear()`;
- `dump()`;
- `events`.

Puede añadirse `capture()` si resulta necesario para disparar una captura inmediata de todos los diagnostic ViewPlugins registrados; si se añade, será temporal y no persistente.

## Lifecycle y coste

- cero scans y observer desconectado mientras diagnostics esté deshabilitado;
- como máximo un `requestAnimationFrame` pendiente por `EditorView`;
- `MutationObserver` únicamente scoped a `view.dom`, nunca `document.body`;
- no escanear el DOM global;
- filtrar por `view.visibleRanges`/selección y cap de bloques;
- `destroy()` desconecta observer y cancela frame pendiente;
- eventos deduplicados o limitados para que una ráfaga de mutaciones no llene el dump con snapshots idénticos;
- límites de líneas, descendientes, atributos y longitud de texto.

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

- scheduling batched post-frame desde ViewUpdate;
- scheduling desde mutaciones DOM scoped;
- observer desconectado cuando diagnostics está off y al `destroy()`;
- resolución por posición documental a `.cm-line`;
- `materialized: false` cuando una posición está reemplazada/no visible;
- captura de clases/estilos/tokens sin mutación;
- selección outside/body;
- filtros visibleRanges/selección y cap de bloques;
- diagnostics disabled = cero scans/cero eventos;
- límite, deduplicación y sanitización de texto/atributos.

Un test con `EditorView` genérico sigue siendo válido para el **probe**, pero no se usará para afirmar fidelidad de Obsidian.

## Gate

No se diseña ni implementa el siguiente fix de surface/color hasta obtener una captura real post-frame en Obsidian de:

1. PowerShell top-level con cursor dentro;
2. PowerShell quoted con cursor dentro;
3. cursor fuera de ambos.

Idealmente repetir Text presentacional quoted después, pero PowerShell basta para clasificar primero la frontera de materialización.
