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
2. **ViewPlugin sigue siendo la integración oficial**: no StateField nuevo, no MutationObserver, no manipulación DOM.
3. **Dos políticas de visibilidad explícitas**:
   - line semantics → `viewport` + intersección de contenido con `visibleRanges`;
   - content semantics/widgets → `visibleRanges`.
4. **La placement position de `Decoration.line` sigue siendo `line.from`**, aunque ese punto concreto esté oculto.
5. **No decorar source completamente replaced**: una línea necesita contenido visible además de intersectar viewport.
6. **Semántica de Fase 2 intacta**: `commonSemanticRanges`, cache, parser engines y CSS dark-safe no cambian.
7. **Top-level intacto**: solo bloques `quoteDepth > 0` tienen `syntax-editor-code-source` en el modelo actual; no se crea surface top-level propia.
8. **Sin clases privadas del host en producción**.

## Modelo de línea

### Cambio

Extender `EditorLineSemantic`:

```ts
export interface EditorLineSemantic {
  from: number;
  to: number;
  classes: readonly string[];
}
```

### Autoridad de límites

No calcular límites a partir del DOM. Usar únicamente el modelo Markdown ya existente:

- opening → `openingLineFrom` / `openingLineTo`;
- body → `bodyLines[].lineFrom` / `lineTo`;
- closing → `closingLineFrom` / `closingLineTo`.

Presentation classes se fusionan en la misma entrada de body line, como hoy.

## Política de materialización

### A. Line decorations

Introducir un helper puro, conceptualmente:

```ts
lineSemanticIsMaterialized(line, viewport, visibleRanges)
```

con contrato:

```text
intersects([line.from, line.to], viewport)
AND
intersects([line.from, line.to], any visibleRange)
```

Si devuelve true:

```ts
Decoration.line({ attributes: { class: ... } }).range(line.from)
```

No exigir `positionIsVisible(line.from, visibleRanges)`.

### B. Semantic marks

Sin cambio:

- solo si `blockBodyIntersectsVisible(..., visibleRanges)`;
- cada span solo si intersecta `visibleRanges`;
- mapping lógico→físico permanece igual.

### C. Line-number widgets

Sin cambio arquitectónico:

- widget inline en `sourceFrom`;
- solo si `positionIsVisible(sourceFrom, visibleRanges)`.

El número pertenece al contenido editable visible, no al `.cm-line` como surface.

### D. Block-level fast path

No usar un único early-return basado exclusivamente en `visibleRanges` que pueda impedir line semantics válidas.

Separar la decisión:

- un bloque puede necesitar **line decorations** si su rango físico intersecta viewport y alguna línea tiene contenido visible;
- un bloque necesita **semantic spans/widgets** si su body intersecta `visibleRanges`.

Puede mantenerse un fast path si es la unión de ambas necesidades, no si vuelve a colapsarlas en una sola condición.

## Helpers de rango

Mantener helpers host-neutral en `editor-block-model.ts` o un módulo puro equivalente:

- `rangeIntersectsVisible(from, to, ranges)` existente;
- `rangeIntersectsViewport(from, to, viewport)` o reutilizar el mismo predicado con un rango único;
- `lineSemanticIsMaterialized(...)`.

No introducir dependencia de `EditorView` dentro de `editor-block-model.ts`.

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

Crear una extensión adversarial de prueba que oculte mediante `Decoration.replace` el prefijo `> ` de quoted lines mientras deja visible el resto del body.

Montar un `EditorView` real de test con:

1. esa extensión de replacement;
2. `createEditorHighlighter()` / extensión equivalente de producto.

Verificar:

- `line.from` no pertenece a `view.visibleRanges` para al menos una quoted body line;
- la línea sí intersecta `view.viewport`;
- `.cm-line` recibe `syntax-editor-code-source`;
- body recibe `syntax-common-*`;
- `>` no recibe semantic mark;
- line number sigue apareciendo;
- Text body conserva `syntax-presentational` y surface.

### Fully replaced negative case

Ocultar una quoted line completa con `Decoration.replace` y verificar que esa línea no recibe source surface propia.

Esto impide que la corrección degrade widgets rendered o otros reemplazos del host.

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

Si el test adversarial demuestra que `Decoration.line` no puede materializarse cuando su `from` está fuera de `visibleRanges`, o el gate real sigue sin clases de línea, detener implementación y volver a análisis.

No usar como fallback:

- private selectors;
- DOM mutation;
- synthetic `HyperMD-*`;
- `!important`;
- editor interno inventado.
