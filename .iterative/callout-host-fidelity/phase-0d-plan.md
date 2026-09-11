# Plan temporal · Fase 0D · diagnóstico post-frame de Live Preview

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

## Objetivo único

Obtener evidencia reproducible del DOM **después** de que Obsidian/CodeMirror haya reconciliado el frame de Live Preview, sin modificar el comportamiento funcional del plugin.

No se intenta corregir todavía superficie, presentation ni colores.

## Restricciones

- La instrumentación permanece inerte por defecto.
- No modifica documento, selección, settings, DOM ni DecorationSet.
- No introduce branches por Nier ni colores hardcodeados.
- No cambia `CommonContrastManager`.
- No cambia todavía `addQuotedCodeSurfaceRanges()` ni el bridge PowerShell.
- La captura se inicia manualmente desde DevTools para evitar atribuir a producción una carrera de timing.
- La captura no incluye rutas del vault ni nombres de archivos.
- Los datos crudos siguen siendo temporales; solo fixtures sanitizados podrán sobrevivir al ciclo.
- La instrumentación se integra en el ViewPlugin existente de Live Preview; no se crea un segundo lifecycle paralelo.

## Diseño

### 1. Controlador global temporal y recargas

Extender `HostDiagnosticsController` de `_tmp-host-diagnostics.ts` con:

- `version` de esquema temporal;
- `postFrameCaptures`: capturas estructuradas recientes;
- `captureLivePreview(): Promise<LivePreviewPostFrameCapture[]>`;
- `dumpLivePreview(): string`.

`clear()` vaciará eventos existentes y capturas post-frame.

`captureLivePreview()` solo actuará cuando `enabled === true`.

**Requisito de recarga:** una nueva carga del bundle debe instalar un controller nuevo de la versión actual y sustituir cualquier objeto global de una build diagnóstica anterior. No debe conservar callbacks a EditorView de una carga previa. Las funciones del módulo actual usan siempre el controller instalado por esa misma carga.

Esto evita el caso en que `window.SyntaxHighlightHostDiagnostics` sobreviva a una recarga de Obsidian con una interfaz antigua.

### 2. Registro de EditorView activos

Añadir una API interna temporal:

`registerLivePreviewDiagnosticView(view, acceptedFences): () => void`

- cada `EditorView` obtiene un id efímero perteneciente a la carga actual del bundle;
- se registra dentro del ViewPlugin ya creado por `createLivePreviewEmbeddedBlockExtension()`;
- se desregistra en `destroy()`;
- `acceptedFences` será callback, no snapshot, para reflejar registry/settings vigentes;
- no se expone el `EditorView` en el objeto global;
- un callback desregistrado o un view destruido no participa en capturas posteriores.

### 3. Momento de captura

Al ejecutar `captureLivePreview()`:

1. esperar un `requestAnimationFrame` completo;
2. esperar un segundo `requestAnimationFrame` para quedar después de reconciliaciones programadas durante el primero;
3. capturar sin mutaciones todos los EditorView actualmente registrados.

Se usan dos frames porque la operación es manual/diagnóstica y prima evidencia estable sobre latencia.

### 4. Snapshot del view

Cada `LivePreviewPostFrameCapture` incluirá:

- timestamp;
- view id efímero;
- `hasFocus`;
- selection anchor/head;
- viewport `from/to`;
- longitud del documento, sin ruta/nombre de archivo;
- fences lógicos reconocidos por `findCodeBlocks()` con:
  - language;
  - quoteDepth;
  - openingLine/openingLineFrom;
  - closingLineFrom opcional;
  - body lineFrom/sourceFrom/sourceTo.

### 5. Snapshot de `.cm-line` materializadas

Para cada `.cm-line` descendiente de `view.dom`:

- intentar `view.posAtDOM(line, 0)`;
- si funciona, derivar línea/offset documental desde `view.state.doc`;
- si falla, registrar `mappingError` sin inventar posición;
- tag, clases y **atributos filtrados**;
- texto visible truncado a límite diagnóstico;
- estilos computados:
  - display;
  - position;
  - color;
  - backgroundColor;
  - backgroundImage;
  - textAlign;
  - whiteSpace;
  - borderRadius;
  - paddingLeft/right;
  - left/right;
- ancestors hasta `view.dom`, con tag/clases/atributos filtrados y estilos de color/background/display;
- descendants relevantes de la línea (`span`, `code`, `pre`, widgets o elementos con clases `syntax-*`, `cm-*`, `token`) con texto corto, clases, atributos filtrados y estilos computados de color/background/display/borderRadius.

Si el nodo queda desconectado o `posAtDOM`/`getComputedStyle` falla durante la reconciliación, se registra el error local y se continúa con el resto de la captura.

### 6. Política de atributos

La captura profunda no reutilizará ciegamente el `snapshotElement()` amplio existente.

Para post-frame se conservarán solo atributos estructurales necesarios, por ejemplo:

- `class`, `style`;
- `data-syntax-*`;
- `data-callout`, `data-callout-metadata`, `data-callout-fold`;
- `contenteditable`, `role`, `tabindex`, `spellcheck`;
- `aria-*`;
- otros atributos estructurales sin URL/ruta que la implementación necesite explícitamente.

Se excluyen `href`, `src` y atributos que puedan introducir rutas o URLs ajenas al diagnóstico.

### 7. Snapshot de hosts embedded/callout

Como M2 contempla que el source visible pueda vivir dentro de un host no representado por `.cm-line`, capturar también cada `.cm-embed-block`, esté o no visualmente visible en ese instante:

- snapshot del root y ancestry;
- estilos computados, incluido `display`/`visibility`;
- descendants relevantes limitados en número;
- marcar si contiene `.cm-callout`, `pre`, `code`, `.cm-line`, `syntax-*`, `cm-inline-code`, `HyperMD-codeblock*`.

No se presupone que un nodo con `display:none` sea irrelevante: se registra ese dato y se deja la interpretación al análisis.

### 8. Anotación contra fences lógicos

Cuando una `.cm-line` tenga posición documental válida, anotar su papel relativo a un fence reconocido:

- `opening`;
- `body`;
- `closing`;
- `outside`.

Para body, conservar índice lógico de línea.

No inferir un papel para líneas sin mapping.

### 9. Tolerancia a DOM mutable

Cada operación potencialmente frágil se aísla:

- `view.posAtDOM`;
- `getComputedStyle`;
- recorrido de ancestors/descendants;
- lectura de atributos/texto sobre nodos que puedan quedar desconectados.

Una excepción local genera `mappingError`, `styleError` o `snapshotError` y no aborta la captura del view ni la de otros views.

### 10. Límites

- máximo 120 `.cm-line` por view;
- máximo 160 descendants relevantes por embedded host;
- máximo 80 descendants relevantes por línea;
- texto por elemento truncado a 240 caracteres;
- máximo 20 capturas post-frame retenidas.

Si se alcanza un límite, marcar `truncated: true`.

## Integración mínima

Modificar solo:

- `packages/obsidian/src/_tmp-host-diagnostics.ts`;
- `packages/obsidian/src/live-preview-host.ts` para registrar/desregistrar el view en el ViewPlugin ya existente;
- tests temporales del helper después de implementar, según el orden solicitado para este ciclo.

No tocar todavía:

- `styles.css`;
- `common-languages.ts`;
- `editor.ts` salvo necesidad demostrada;
- `blocks.ts`;
- `contrast-manager.ts`;
- `reading-host.ts`.

## Comando de uso previsto

Tras instalar el build diagnóstico:

```js
SyntaxHighlightHostDiagnostics.clear()
SyntaxHighlightHostDiagnostics.enable()
await SyntaxHighlightHostDiagnostics.captureLivePreview()
copy(SyntaxHighlightHostDiagnostics.dumpLivePreview())
```

Se repetirá `clear → capture → dump` en estados separados.

## Matriz mínima de captura real posterior

### PowerShell

1. cursor dentro de top-level;
2. cursor dentro de quoted/callout;
3. cursor fuera de ambos.

### Text presentation

4. `text-center-justified` quoted con cursor dentro.

Para cada estado se obtiene un JSON separado y una captura visual.

## Decisión posterior basada en evidencia

- Si nuestras line classes no aparecen en `.cm-line` real: investigar precedencia/materialización (M3) o host alternativo (M2).
- Si aparecen pero el estilo computado no cambia: inspeccionar ancestry/selectores y decidir entre clases host o superficie semántica propia.
- Si token marks no aparecen: investigar composición de mark decorations antes de tocar tema/contraste.
- Si token marks aparecen con color temático correcto pero luego `data-syntax-contrast-adjusted` modifica el resultado: aislar P2 en `CommonContrastManager`.
- Si quoted source está dentro de un embedded host no mapeable: rediseñar Fase 6 para ese host real, no para `.cm-line` hipotéticas.

## Gate

No se implementará un nuevo fix funcional hasta disponer de las cuatro capturas post-frame y actualizar el análisis con una conclusión demostrada sobre M1/M2/M3 y P1/P2.
