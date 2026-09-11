# Plan de implementación temporal · Fase 3

Estado: TEMPORAL. Eliminar tras gate satisfactorio y limpieza final.

Checklist operativo. La arquitectura estable vive en `phase-3-architecture-plan.md`.

## 0. Baseline y scope

- [ ] Confirmar CI + `pack:all` verdes en el head previo a producción.
- [ ] Mantener diagnostics temporales activos hasta gate real.
- [ ] No tocar CSS, routing rendered, settings gating, semantic engine, Smart Editing ni configured profiles.
- [ ] No introducir private selectors, DOM mutation, `HyperMD-*` ni `!important`.

## 1. Modelo de line semantics

En `editor-block-model.ts`:

- [ ] Extender `EditorLineSemantic` con `to`, `visibilityFrom`, `visibilityTo`.
- [ ] Opening: extent/probe = opening physical line.
- [ ] Body: extent = physical line; probe = `sourceFrom/sourceTo`.
- [ ] Closing: extent/probe = closing physical line.
- [ ] Presentation continúa fusionándose en la misma body semantic.
- [ ] Añadir helper puro para overlap half-open y point containment de probe vacío.
- [ ] Añadir `lineSemanticIsMaterialized(line, viewport, visibleRanges)`.
- [ ] No importar `EditorView` en el modelo.

## 2. Adapter CodeMirror

En `editor.ts`:

- [ ] Mantener `visibleRanges(view)` para marks/widgets.
- [ ] Añadir helper `viewportRange(view)` que lea `view.viewport`.
- [ ] Para fixtures/headless que no expongan `viewport`, fallback conservador a `{ from: 0, to: doc.length }` únicamente en el adapter, igual que el fallback actual de `visibleRanges`.
- [ ] Pasar `viewport` + `visibleRanges` a `lineSemanticIsMaterialized`.
- [ ] Sustituir solo este filtro:
  - antiguo: `positionIsVisible(line.from, visibleRanges)`;
  - nuevo: `lineSemanticIsMaterialized(line, viewport, visibleRanges)`.
- [ ] Mantener placement `Decoration.line(...).range(line.from)`.
- [ ] Mantener semantic marks exactamente sobre `visibleRanges`.
- [ ] Mantener line-number widgets en `sourceFrom` + `visibleRanges`.
- [ ] Mantener block-level fast path físico existente.
- [ ] Mantener update triggers y semantic cache sin cambios.

## 3. Compatibilidad de suite existente

Antes de TM de implementación:

- [ ] `npm run lint`.
- [ ] `npm run typecheck`.
- [ ] suite existente verde sin crear todavía los tests adversariales nuevos de Fase 3.
- [ ] `npm run build`.
- [ ] `npm run pack:all`.
- [ ] Si una expectation antigua falla únicamente por el shape ampliado de `EditorLineSemantic`, adaptar solo esa expectativa y registrar el cambio; no añadir aún nueva cobertura conductual.

## 4. TM de implementación

Revisar producción completa, no solo CI:

- [ ] Revisión de layering/API pública/ownership.
- [ ] Revisión de viewport vs visibleRanges y boundaries half-open.
- [ ] Revisión de blank quoted body y fully replaced source.
- [ ] Revisión de performance/cache/lifecycle.
- [ ] Revisión de scope: ningún cambio funcional fuera de Fase 3.
- [ ] Primera revisión completa SIN CAMBIOS.
- [ ] Segunda revisión consecutiva SIN CAMBIOS.
- [ ] Solo entonces empezar tests nuevos.

## 5. Tests nuevos de Fase 3

### 5.1 Helper puro

- [ ] line extent fuera de viewport → false.
- [ ] placement `from` fuera de visibleRanges pero non-empty visibility probe dentro → true.
- [ ] physical line solo toca el borde de visibleRange sin overlap → false.
- [ ] visibility probe vacío dentro de visibleRange → true.
- [ ] visibility probe vacío fuera → false.

### 5.2 Composición CodeMirror adversarial

Crear una suite nueva con un `StateField<DecorationSet>` directo que provea replacements.

- [ ] Ocultar `> ` en quoted opening/body/closing sin ocultar contenido.
- [ ] Demostrar primero que `line.from` queda fuera de `view.visibleRanges` mientras body source permanece visible.
- [ ] `createEditorHighlighter` materializa `syntax-editor-code-source` en `.cm-line`.
- [ ] PowerShell/Bash semantic marks siguen presentes y nunca cubren `>`.
- [ ] line numbers siguen presentes.
- [ ] Text quoted conserva simultáneamente `syntax-editor-code-source` + `syntax-presentational` + alignment/flow.

### 5.3 Negative / blank

- [ ] Una quoted line completamente replaced no recibe source surface.
- [ ] Una quoted body line lógica vacía (`> `) recibe surface mediante probe puntual cuando sigue materializada.
- [ ] Top-level no recibe surface propia.

### 5.4 Regresiones

- [ ] `live-preview-source-surface.test.ts` verde.
- [ ] `editor-block-model.test.ts` verde.
- [ ] semantic suites Fase 2 verdes.
- [ ] architecture-boundaries Fase 1 verde.
- [ ] diagnostics temporales verdes.
- [ ] build + `pack:all` verdes.

## 6. TM de tests

- [ ] Revisar cobertura contra arquitectura/checklist.
- [ ] Revisar fragilidad: no llamar “Obsidian real” a happy-dom/EditorView test.
- [ ] Revisar que el replacement adversarial sea directo y realmente altere `visibleRanges`.
- [ ] Primera revisión completa SIN CAMBIOS.
- [ ] Segunda revisión consecutiva SIN CAMBIOS.
- [ ] CI + `pack:all` verdes.

## 7. Gate Obsidian real

No limpiar diagnostics antes de este punto.

### Quoted source

- [ ] PowerShell quoted con foco: surface negra opening/body/closing + semantic colors + line numbers.
- [ ] Bash quoted: surface + semantic roles.
- [ ] Text quoted: surface + presentation.
- [ ] Blank quoted body, si se añade al fixture, mantiene continuidad visual.

### Rendered

- [ ] Cursor fuera devuelve los bloques a rendered sin cambio/regresión.
- [ ] Reading View no cambia.

### Post-frame enfocado

- [ ] `hasFocus === true`.
- [ ] quoted PowerShell sigue en el mismo `EditorView`.
- [ ] `.cm-line.syntax-editor-code-source` existe para quoted source.
- [ ] opening/body/closing tienen las clases propias esperadas.

## 8. Decisión posterior

- [ ] Si gate Fase 3 pasa: volver al checklist combinado y ejecutar después un gate aislado de settings si sigue siendo necesario.
- [ ] Si gate Fase 3 falla pese a clases ausentes: volver a análisis TM, no añadir CSS/DOM hacks.
- [ ] Diagnostics y documentos temporales solo se eliminan en la limpieza final conjunta cuando todos los gates pendientes estén cerrados.
