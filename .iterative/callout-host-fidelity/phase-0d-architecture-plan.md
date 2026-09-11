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
2. registrarse como target de diagnóstico en el controlador temporal global;
3. cuando diagnostics pase a enabled, conectar su observer scoped y programar inmediatamente una captura;
4. cuando diagnostics pase a disabled, desconectar observer y cancelar cualquier frame pendiente;
5. reaccionar a cualquier `ViewUpdate` relevante y también a mutaciones DOM scoped a `view.dom` que puedan ocurrir sin transacción de editor;
6. batir todos esos triggers en una sola captura post-frame;
7. reconstruir los fenced blocks reconocidos desde `view.state.doc` usando la fuente de verdad actual `findCodeBlocks()`;
8. usar `view.viewport` como filtro grueso de bloques en pantalla, incluyendo ranges que puedan estar reemplazados por widgets; usar `view.visibleRanges` después solo para describir qué source ranges tienen representación directa, y conservar además cualquier bloque que contenga la selección;
9. aplicar un cap duro adicional de bloques;
10. localizar opening/body/closing en DOM por posición documental con `view.domAtPos()` y ascenso controlado hasta `.cm-line`;
11. capturar únicamente estructura/clases/estilos necesarios;
12. publicar eventos en `window.SyntaxHighlightHostDiagnostics` mediante el helper temporal existente;
13. no añadir/quitar clases, estilos, atributos ni listeners al DOM observado, salvo el propio `MutationObserver` scoped que no muta el subtree.

## Controlador y registro de targets

El helper `_tmp-host-diagnostics.ts` sigue siendo dueño del estado global de diagnostics. Se ampliará con una interfaz temporal de lifecycle, sin que el helper conozca CodeMirror:

- `enabled` sigue siendo la fuente de verdad;
- `subscribeEnabled(listener)` o API equivalente notifica transiciones enabled/disabled;
- `registerCaptureTarget(capture)` registra una callback por cada diagnostic ViewPlugin vivo y devuelve `unregister`;
- `capture()` invoca los targets registrados para programar, no ejecutar sincrónicamente, una captura post-frame;
- `enable()` cambia estado, notifica a listeners y provoca que cada ViewPlugin conecte observer + schedule;
- `disable()` notifica a listeners y cada ViewPlugin desconecta/cancela;
- `destroy()` del ViewPlugin desregistra listener y capture target.

No habrá referencias a `EditorView` dentro del controlador global. Así se evita acoplar la utilidad de exportación a CodeMirror y se simplifica su eliminación al final del ciclo.

## Triggers y settling

La captura NO se realiza dentro de `buildSyntaxDecorations()`.

Triggers:

- transición `disabled → enabled` del controlador;
- `capture()` explícito desde DevTools;
- `ViewUpdate` con `docChanged`, `selectionSet`, `viewportChanged`, `geometryChanged` o `focusChanged` cuando exista;
- `MutationObserver` scoped a `view.dom` para `childList`, `subtree` y atributos `class`/`style`.

Todos los triggers llaman a un único scheduler idempotente.

Secuencia mínima:

`trigger` → `requestAnimationFrame` → resolver posiciones → inspeccionar DOM final.

Si el observer recibe otra mutación antes/durante la captura, se agenda un nuevo frame posterior. No se encadenan timers arbitrarios ni polling.

El propio diagnóstico no muta el DOM, de modo que `getComputedStyle`, lectura de clases y publicación de eventos no retroalimentan el observer. Mutaciones `style` originadas por otros componentes, incluido el normalizador de contraste, sí disparan una nueva captura y son deseables porque permiten observar el estado final posterior.

`view.domAtPos()` puede mapear una posición de source reemplazada a un boundary DOM que no pertenece a una `.cm-line` representativa del source. El probe debe tratar esa situación como evidencia, no como error: captura el boundary local seguro y marca la línea/source como `materialized: false`. También debe capturar excepciones de resolución como estado no materializado, nunca abortar el resto de bloques.

## Filtro viewport vs materialización

Esta distinción es obligatoria:

- `view.viewport` responde «¿está el rango documental en la región actualmente renderizada del editor?» y se usa para decidir qué bloques merece la pena inspeccionar;
- `view.visibleRanges` responde «¿qué rangos de source están directamente visibles y no ocultos/reemplazados?» y se usa como señal de representación;
- un bloque que intersecta `view.viewport` pero no `view.visibleRanges` **no se descarta**: es precisamente candidato a estar reemplazado por un widget y debe poder producir `not-materialized`/`rendered-widget`;
- cualquier bloque que contenga la selección se conserva aunque esté en el borde de estos filtros.

Esto permite que el estado «cursor fuera de ambos», donde los fenced blocks pueden estar materializados como widgets, siga formando parte de la captura.

## Unidad de observación

Por cada fenced block reconocido relevante según viewport/selección:

- fence normalizado;
- `quoteDepth`;
- posiciones físicas de opening/body/closing;
- intersección con `viewport` y con `visibleRanges`;
- estado de selección respecto del bloque (`outside`, `opening`, `body`, `closing`);
- representación (`source-line`, `rendered-widget`, `not-materialized`, `unknown`) cuando pueda determinarse localmente sin búsqueda global.

Por cada línea materializada:

- tag y clases del `.cm-line` final;
- atributos seguros relevantes;
- estilos computados mínimos: `backgroundColor`, `color`, `display`, `position`, `padding*`, `border*`, `fontFamily`, `fontSize`, `textAlign`, `whiteSpace`;
- ancestry resumido hasta `.cm-s-obsidian` / `.cm-editor`;
- descendientes relevantes con tag, clases, texto truncado y color/background computados;
- presencia de `data-syntax-contrast-adjusted` e inline `color`/prioridad.

Cuando source no esté materializado, el snapshot conserva los metadatos documentales y el boundary DOM local seguro devuelto por `domAtPos()` si existe, pero no lo rebautiza falsamente como `.cm-line`.

## Tokens objetivo

Para PowerShell de la nota de prueba, el probe intentará identificar por texto y posición lógica/física:

- `$foo`;
- `=`;
- `42`;
- `Write-Host`.

No dependerá de que estén en un único span: registrará los descendientes que cubran sus posiciones documentales y su ancestry inmediato.

El mecanismo primario será por posición documental, no por búsqueda de texto global. El texto objetivo sirve para etiquetar el snapshot y verificar el fragmento encontrado, evitando ambigüedad cuando `$foo` aparece varias veces.

## Sanitización

La salida no incluirá rutas de vault, nombres de archivos, contenido exterior al bloque ni HTML arbitrario completo.

Texto de líneas/tokens se limita a fragmentos del propio bloque y se trunca. Atributos sensibles o irrelevantes se omiten mediante allowlist; no se serializa `outerHTML` completo.

## Integración con el helper diagnóstico

Extender `_tmp-host-diagnostics.ts` con un tipo/evento separado `live-preview-post-frame`, en lugar de sobrecargar semánticamente `live-preview-source`.

Añadir una consulta barata `hostDiagnosticsEnabled()` para que cualquier trigger pueda cortar antes de inspeccionar. El lifecycle enabled/disabled se propaga mediante la suscripción descrita arriba, por lo que activar diagnostics desde DevTools no depende de que ocurra después un `ViewUpdate`.

El API global queda temporalmente:

- `enable()`;
- `disable()`;
- `clear()`;
- `capture()`;
- `dump()`;
- `events`.

`capture()` solicita una captura a todos los diagnostic ViewPlugins vivos y vuelve inmediatamente; cada target mantiene su batching por rAF.

## Lifecycle y coste

- cero scans y observer desconectado mientras diagnostics esté deshabilitado;
- como máximo un `requestAnimationFrame` pendiente por `EditorView`;
- `MutationObserver` únicamente scoped a `view.dom`, nunca `document.body`;
- no escanear el DOM global;
- filtrar primero por `view.viewport`, conservar selección y usar `visibleRanges` solo como señal de source materializado; aplicar cap de bloques;
- `destroy()` desconecta observer, cancela frame pendiente y desregistra callbacks;
- eventos deduplicados por snapshot estructural/estilos, ignorando `timestamp`, para que una ráfaga de mutaciones no llene el dump con estados idénticos;
- una transición de selección/representación sí debe producir evento aunque el DOM sea idéntico si cambia el estado `selectionRegion`;
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

- `enable()` conecta observer y agenda captura sin requerir `ViewUpdate` posterior;
- `disable()` desconecta observer y cancela frame;
- `capture()` fan-out a todos los ViewPlugins vivos sin capturar sincrónicamente;
- scheduling batched post-frame desde ViewUpdate;
- scheduling desde mutaciones DOM scoped;
- filtro por `view.viewport` conserva ranges reemplazados aunque no estén en `visibleRanges`;
- `visibleRanges` se registra como señal de source materializado, no como filtro excluyente;
- resolución por posición documental a `.cm-line`;
- `materialized: false` cuando `domAtPos()` devuelve boundary no representativo o falla la resolución;
- captura de clases/estilos/tokens sin mutación;
- selección outside/body;
- cap de bloques;
- diagnostics disabled = cero scans/cero eventos;
- deduplicación conserva cambios de selección/representación;
- límite y sanitización de texto/atributos;
- `destroy()` deja cero listeners/targets/observer/frame pendientes.

Un test con `EditorView` genérico sigue siendo válido para el **probe**, pero no se usará para afirmar fidelidad de Obsidian.

## Gate

No se diseña ni implementa el siguiente fix de surface/color hasta obtener una captura real post-frame en Obsidian de:

1. PowerShell top-level con cursor dentro;
2. PowerShell quoted con cursor dentro;
3. cursor fuera de ambos.

Idealmente repetir Text presentacional quoted después, pero PowerShell basta para clasificar primero la frontera de materialización.
