# Plan arquitectónico temporal · Fase 3

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Objetivo

Corregir quoted Live Preview source respetando la semántica oficial de CodeMirror/Obsidian:

- `viewport` describe el tramo del documento cuyo DOM está materializado;
- `visibleRanges` describe contenido realmente visible, excluyendo partes ocultas/replaced;
- una `Decoration.line` modifica la `.cm-line` y debe colocarse en el inicio físico de la línea;
- marks/widgets inline pertenecen a posiciones de contenido.

La arquitectura debe permitir que una quoted line reciba surface/presentation aunque su prefijo `>` esté oculto por Live Preview, sin decorar source que Obsidian haya sustituido completamente por un widget rendered.

## Invariantes

1. **Mismo EditorView**: quoted source pertenece al EditorView exterior. No introducir editor bridge ni DOM ownership alternativo.
2. **ViewPlugin sigue siendo la integración oficial**: no StateField nuevo en producción, no MutationObserver, no manipulación DOM.
3. **Dos políticas de visibilidad explícitas**:
   - line semantics → extent físico en `viewport` + visibility probe contra `visibleRanges`;
   - content semantics/widgets → `visibleRanges`.
4. **La placement position de `Decoration.line` sigue siendo `line.from`**, aunque ese punto concreto esté oculto.
5. **No decorar source completamente replaced**: una línea necesita evidencia de source materializado además de intersectar viewport.
6. **Semántica de Fase 2 intacta**: `commonSemanticRanges`, cache, parser engines y CSS dark-safe no cambian.
7. **Top-level intacto**: solo bloques `quoteDepth > 0` tienen `syntax-editor-code-source` en el modelo actual; no se crea surface top-level propia.
8. **Sin clases privadas del host en producción**.

## Modelo de línea

### Cambio

Extender `EditorLineSemantic` separando placement/extent físico de la evidencia de contenido source:

```ts
export interface EditorLineSemantic {
  from: number;
  to: number;
  visibilityFrom: number;
  visibilityTo: number;
  classes: readonly string[];
}
```

### Autoridad de límites

No calcular límites a partir del DOM. Usar únicamente el modelo Markdown ya existente.

#### Opening

- placement/extent: `openingLineFrom` / `openingLineTo`;
- visibility probe: `openingLineFrom` / `openingLineTo`.

Aunque el prefijo quoted pueda ocultarse, el fence/info string deja contenido source dentro del rango físico.

#### Body

- placement/extent: `bodyLines[].lineFrom` / `lineTo`;
- visibility probe: `bodyLines[].sourceFrom` / `sourceTo`.

Esto es esencial para líneas lógicamente vacías. Una línea Markdown `> ` puede tener extent físico no vacío, pero `sourceFrom === sourceTo`; ese punto representa la posición source tras retirar el prefijo quoted.

#### Closing

- placement/extent: `closingLineFrom` / `closingLineTo`;
- visibility probe: mismo rango físico.

Presentation classes se fusionan en la misma entrada de body line, como hoy.

## Política de materialización

### A. Line decorations

Introducir un helper puro:

```ts
lineSemanticIsMaterialized(line, viewport, visibleRanges)
```

Contrato:

```text
physical extent intersects viewport
AND
visibility probe intersects/exists inside visibleRanges
```

Si devuelve true:

```ts
Decoration.line({ attributes: { class: ... } }).range(line.from)
```

No exigir `positionIsVisible(line.from, visibleRanges)`.

### Semántica de intersección

Para un rango no vacío `[from, to)` y un rango CodeMirror `[range.from, range.to)` existe overlap real solo si:

```text
from < range.to && to > range.from
```

Para un probe vacío (`from === to`) usar point containment explícito:

```text
point >= range.from && point <= range.to
```

Esto permite surface sobre blank quoted source cuando el prefijo físico está oculto, siempre que el punto lógico siga dentro de un `visibleRange`.

La misma semántica half-open/point se usa para comprobar el extent físico contra `viewport`.

### B. Semantic marks

Sin cambio:

- solo si `blockBodyIntersectsVisible(..., visibleRanges)`;
- cada span solo si intersecta `visibleRanges`;
- mapping lógico→físico permanece igual.

La semántica de contenido existente conserva sus helpers actuales para no ampliar scope de esta fase.

### C. Line-number widgets

Sin cambio arquitectónico:

- widget inline en `sourceFrom`;
- solo si `positionIsVisible(sourceFrom, visibleRanges)`.

El número pertenece al contenido editable visible, no al `.cm-line` como surface.

### D. Block-level fast path

Conservar el fast path físico existente de `editor.ts`:

```text
openingLineFrom -> closingLineTo/bodyTo
```

contra `visibleRanges`.

Ese rango ya cubre opening/body/closing y basta como descarte grueso: si un visibility probe válido pertenece a source materializado, el rango físico del bloque intersecta algún `visibleRange`.

No introducir un segundo fast path de bloque ni migrar todo el bloque a `viewport`; el cambio debe ocurrir **solo al decidir cada `Decoration.line`**.

## Helpers de rango

Mantener la lógica host-neutral en `editor-block-model.ts`:

- conservar `rangeIntersectsVisible()` para consumers existentes;
- añadir un helper interno/puro para overlap half-open + point containment;
- añadir `lineSemanticIsMaterialized(line, viewport, visibleRanges)`;
- el helper recibe tipos simples `EditorVisibleRange`, nunca `EditorView`.

El adapter `editor.ts` traduce:

```ts
view.viewport -> EditorVisibleRange
view.visibleRanges -> readonly EditorVisibleRange[]
```

y pasa ambos al helper puro.

## Update lifecycle

`createEditorHighlighter.update()` ya recalcula cuando:

- `docChanged`;
- revisión/settings cambian;
- `viewportChanged`;
- `selectionSet`.

No cambia.

Razón: Live Preview puede cambiar replacements al mover selección aunque el documento no cambie; `selectionSet` ya fuerza rematerialización.

No añadir listeners de DOM ni timers.

## CSS

No cambiar CSS en la primera implementación.

La Fase 2 ya define:

- surface negra plugin-owned;
- paleta dark-safe;
- presentation sobre `.cm-line.syntax-presentational`;
- line numbers scoped;
- sin `!important` ni private selectors.

El gate de Fase 3 debe demostrar si el problema era materialización. Si las clases llegan y CSS falla, eso sería una causa distinta y reabriría análisis.

## Tests arquitectónicos

### Test de composición CodeMirror

Crear una extensión adversarial **directa** de prueba que oculte mediante `Decoration.replace` el prefijo `> ` de quoted lines mientras deja visible el resto del body.

La extensión debe usar, preferiblemente:

```ts
StateField<DecorationSet>
  -> provide: EditorView.decorations.from(field)
```

No usar un segundo ViewPlugin para producir el replacement: las decorations indirectas se consultan después de computar el viewport/visible ranges y no serían una reproducción válida de este boundary.

Montar un `EditorView` real de test con:

1. ese StateField directo de replacement;
2. `createEditorHighlighter()` / extensión equivalente de producto.

Antes de probar Syntax Highlight, demostrar el escenario host:

- `line.from` no pertenece a `view.visibleRanges` para al menos una quoted body line;
- la línea sí intersecta `view.viewport`;
- `visibilityFrom/visibilityTo` sí representa source materializado dentro de `visibleRanges`.

Después verificar:

- `.cm-line` recibe `syntax-editor-code-source`;
- body recibe `syntax-common-*`;
- `>` no recibe semantic mark;
- line number sigue apareciendo;
- Text body conserva `syntax-presentational` y surface.

### Fully replaced negative case

Usar también una decoration directa para ocultar una quoted line completa y verificar que su visibility probe no coincide con `visibleRanges` y esa línea no recibe source surface propia.

### Blank quoted body

Usar una línea `> ` / `>` cuyo logical body sea vacío:

- `lineFrom < lineTo` puede seguir siendo cierto físicamente;
- `visibilityFrom === visibilityTo` debe quedar en un punto visible;
- la `.cm-line` recibe surface para mantener continuidad.

Esto prueba el caso que un simple rango físico no puede distinguir.

### Existing regressions

Mantener verdes:

- `live-preview-source-surface.test.ts`;
- `editor-block-model.test.ts`;
- PowerShell semantic suites de Fase 2;
- architecture boundaries Fase 1;
- diagnostics temporales.

## Gate real

Tras TM de implementación + tests:

1. PowerShell quoted source con cursor dentro:
   - fondo negro continuo;
   - semantic colors;
   - line numbers legibles;
   - opening/body/closing surface.
2. Text quoted source:
   - surface + presentation simultáneas.
3. Bash quoted source:
   - surface + semantic marks.
4. Cursor fuera:
   - rendered no cambia.
5. Post-frame enfocado:
   - `.cm-line.syntax-editor-code-source` existe en las líneas quoted source;
   - el mismo EditorView mantiene foco.

## Fuera de alcance

- settings gating, pendiente de un gate aislado posterior;
- routing rendered ya validado por `reading-specialized`;
- diferencias visuales pixel-perfect entre motores source/rendered;
- cambiar el color negro/paleta dark;
- optimización incremental adicional del block model;
- eliminar diagnostics antes del gate.

## Criterio de rollback

Si el test adversarial demuestra que `Decoration.line` no puede materializarse cuando su placement `from` está fuera de `visibleRanges`, o el gate real sigue sin clases de línea, detener implementación y volver a análisis.

No usar como fallback:

- private selectors;
- DOM mutation;
- synthetic `HyperMD-*`;
- `!important`;
- editor interno inventado.
