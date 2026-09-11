# Plan de implementación temporal · Fase 1

Estado: TEMPORAL. Eliminar tras implementación, tests, validación real y limpieza final.

Este plan ejecuta el plan arquitectónico estabilizado. Los checkboxes son la fuente de verdad del progreso. No marcar una tarea hasta que el cambio correspondiente exista y haya pasado las comprobaciones aplicables.

## 0. Baseline y guardrails

- [x] Confirmar head de `plan/obsidian-callout-host-fidelity` y CI verde antes de producción.
- [x] Confirmar que ningún archivo temporal anterior se elimina todavía: diagnostics y planes siguen siendo necesarios hasta el gate real.
- [x] Registrar cualquier cambio de alcance en este plan antes de implementarlo.
- [x] Mantener un ledger temporal de tests/garantías antiguas retiradas durante la refactorización, indicando su sustituto en Fase 9 o gate real.

## 1. Frontera oficial de runtime

### Producción

- [x] Crear helper de build con la frontera completa del sample oficial actual:
  - [x] `obsidian`;
  - [x] `electron`;
  - [x] `@codemirror/autocomplete`, `collab`, `commands`, `language`, `lint`, `search`, `state`, `view`;
  - [x] `@lezer/common`, `highlight`, `lr`;
  - [x] `builtinModules` de Node.
- [x] Hacer que `packages/obsidian/esbuild.config.mjs` consuma esa lista centralizada.
- [x] Mantener `electron`/built-ins como externals de bundle sin convertirlos en peers npm si no existe import runtime que lo justifique.
- [x] Activar `metafile` en el build y añadir una aserción que falle si un paquete host prohibido se empaqueta como input en vez de quedar external.
- [x] Mantener empaquetados los language packages no proporcionados por Obsidian.
- [x] Añadir/ajustar peerDependencies explícitas únicamente para los módulos host que el paquete publicado deja como runtime imports.
- [x] Mantener lockfile coherente; `npm ci` valida el cambio de peer metadata.
- [x] Ejecutar CI existente.

### Resultado esperado

- El artifact conserva imports externos de la frontera host oficial.
- Ninguna copia privada de CodeMirror core/Lezer host queda embebida.
- Los language packages sí siguen dentro del artifact.

## 2. Fallback estructural de Markdown rendered desacoplado

- [x] Crear `rendered-code-candidate.ts` sin dependencias de Live Preview.
- [x] Mover allí detección de PRE/CODE, processed guard y preservación de furniture.
- [x] Resolver `language-*` desde PRE y CODE:
  - [x] PRE-only válido;
  - [x] CODE-only válido;
  - [x] ambos iguales válido;
  - [x] conflicto/varios valores -> fail closed.
- [x] Mantener un único CODE directo como requisito.
- [x] Adaptar `reading-host.ts` al detector nuevo.
- [x] Mantener `registerMarkdownPostProcessor` como fallback cuya garantía contractual es Reading View.
- [x] Tolerar ejecución incidental en otro renderer Markdown sin depender de ella para LP.
- [x] Ejecutar CI existente.

## 3. Eliminar bridge DOM de rendered Live Preview

- [x] Inventariar tests del `LivePreviewRenderedBlockBridge` y registrar garantías en el ledger.
- [x] Retirar `LivePreviewRenderedBlockBridge` y scanning/replacement del EditorView.
- [x] Retirar producción dependiente de `.cm-embed-block`/`.cm-callout`.
- [x] Retirar `LIVE_PREVIEW_HOST_ATTRIBUTE` al quedar sin consumidores legítimos.
- [x] Dejar la garantía de rendered LP exclusivamente en `registerMarkdownCodeBlockProcessor`.
- [x] No depender del generic Markdown postprocessor para LP.
- [x] Reubicar temporalmente `registerLivePreviewDiagnosticView()` dentro de la extensión source.
- [x] Eliminar `live-preview-host.ts`.
- [x] Retirar/adaptar tests antiguos solo tras registrar sus garantías.
- [x] Ejecutar CI existente.

## 4. Modelo source y caché por viewport

### Producción · modelo

- [x] Crear `editor-block-model.ts` sin ownership de DOM/EditorView.
- [x] Definir modelo estructural/resuelto de bloque.
- [x] Resolver configured/common una vez por reconstrucción del modelo.
- [x] Definir helper bloque <-> `visibleRanges`.
- [x] Definir clave de caché semántica por bloque + runtime revision.
- [x] Invalidación conservadora:
  - [x] `docChanged` limpia toda la caché semántica del view;
  - [x] cambio de runtime/registry revision limpia caché;
  - [x] viewport/selection reutiliza entradas válidas.
- [x] No introducir reutilización posicional sofisticada entre documentos.
- [x] No tokenizar bloques no visibles.

### Producción · semántica

- [x] Bloque visible configurado: tokenizar cuerpo lógico completo y mapear a offsets físicos.
- [x] Common parser-backed: parsear cuerpo lógico completo y mapear highlights.
- [x] Text parserless: plain spans sin parser.
- [x] Construir line semantics opening/body/closing.
- [x] Fusionar surface + presentation en una única line semantics por posición.
- [x] Mantener line-number policy separada.

### Adapter CodeMirror

- [x] `createEditorHighlighter` conserva modelo, caché semántica y DecorationSet.
- [x] Reconstruir modelo solo en doc/revision/fence-resolution change.
- [x] Aplicar invalidación conservadora antes de materializar.
- [x] Rematerializar en model change / `viewportChanged` / `selectionSet` / settings relevantes.
- [x] Generar marks/lines/widgets solo donde intersecten visible ranges.
- [x] Mantener registry subscription y cleanup.
- [x] Mantener Smart Editing sin acoplarlo al DOM.
- [x] Ejecutar CI existente.

## 5. Surface/presentation source con clases propias

- [x] Eliminar `QUOTED_CODE_SOURCE_CLASS` y toda emisión `HyperMD-codeblock*`.
- [x] Emitir solo `syntax-editor-code-source*` y presentation propias.
- [x] Surface source: `--syntax-editor-code-background` -> `--code-background` mediante `background-color`.
- [x] Color base source: `--syntax-editor-code-color` -> `--text-normal`; categorías específicas conservan `--code-*`.
- [x] No usar `.cm-embed-block`, `.cm-callout` o `HyperMD-*` como dependencia funcional.
- [x] No introducir margins verticales.
- [x] Mantener alignment/flow en body presentacional.
- [x] Top-level no recibe segunda surface propia cuando Obsidian ya lo representa nativamente.
- [x] Ejecutar CI existente.

## 6. Contraste respetando ownership

- [x] `CommonContrastManager` solo normaliza tokens dentro de `.syntax-highlight-frame` propio.
- [x] Source CodeMirror no recibe `style.color` ni `data-syntax-contrast-adjusted` del manager.
- [x] Mantener exclusión de settings preview.
- [x] Mantener configured profiles fuera del manager común.
- [x] Reducir pending roots/queries a DOM propio sin reescribir el algoritmo perceptual.
- [x] Restore/dispose solo sobre nodos que el manager pudo modificar.
- [x] Ejecutar CI existente.

## 7. Common highlighting tras unificar runtime

- [x] Mantener `EditorState + ensureSyntaxTree` para StreamLanguage salvo evidencia contraria.
- [x] No añadir ramas específicas PowerShell.
- [x] Mantener `createCommonHighlightStyle()` como taxonomía única.
- [x] Mantener `source-view.ts` con `common.support()` + `syntaxHighlighting(COMMON_EDITOR_HIGHLIGHT_STYLE)`.
- [x] Ejecutar CI con runtime externo.

## 8. Revisión TM de implementación

- [ ] Revisar diff completo contra plan arquitectónico.
- [ ] Revisar que no quede mutación DOM de CodeMirror.
- [ ] Revisar imports/bundle runtime contra sample oficial.
- [ ] Revisar ausencia de selectores privados como dependencia funcional.
- [ ] Revisar que LP rendered no dependa del generic postprocessor.
- [ ] Revisar ownership de contraste.
- [ ] Revisar performance/invalidation del ViewPlugin.
- [ ] Revisar ledger de garantías retiradas y sus sustitutos.
- [ ] Aplicar correcciones encontradas.
- [ ] Repetir hasta dos revisiones consecutivas sin cambios.
- [ ] Solo entonces pasar a tests nuevos.

## 9. Tests de Fase 1

> Se ejecuta después de estabilizar implementación. Tests antiguos pueden haberse adaptado para mantener CI, pero la cobertura nueva se cierra aquí.

### Runtime/build

- [ ] Test de externals frente a frontera oficial adoptada (`obsidian`, `electron`, CM, Lezer, built-ins).
- [ ] Verificación de metafile: host runtime no bundled.
- [ ] Verificar language packages bundled.
- [ ] Verificar packaging final.
- [ ] Verificar que los runtime imports externos reales del artifact están declarados como peers npm y que externals preventivos no se convierten en peers fantasma.

### Reading/fallback

- [ ] PRE-only.
- [ ] CODE-only.
- [ ] PRE/CODE agreement.
- [ ] PRE/CODE conflict fail-closed.
- [ ] furniture identity/preservation.
- [ ] idempotence/processed marker.
- [ ] aislamiento de excepción por bloque.
- [ ] unknown untouched/fail-closed.
- [ ] fallback sin dependencias de clases de Live Preview.

### Editor model/materialization

- [ ] modelo detecta top-level y quoted sin DOM.
- [ ] bloques fuera del viewport no se tokenizan.
- [ ] bloque visible se tokeniza sobre cuerpo completo aunque viewport corte el bloque.
- [ ] caché se reutiliza en scroll/selection sin cambio documental.
- [ ] caché completa del view se invalida en `docChanged` y runtime revision.
- [ ] máximo una line decoration propia por línea.
- [ ] presentation y surface conviven en la misma line semantics.
- [ ] marks conservan mapping tras `>`/quote depth.
- [ ] line numbers se anclan tras quote prefix.
- [ ] wiring/lifecycle del EditorView conserva diagnostics temporales y limpia subscriptions al destruirse.

### Mode/settings de rendered Markdown

- [ ] `MarkdownView.getMode() === "source"` usa `markdownEditor` para el processor rendered.
- [ ] `MarkdownView.getMode() === "preview"` usa `markdownReading`.
- [ ] owner identificado por `containerEl` prevalece sobre `context.sourcePath`.
- [ ] transclusión: `context.sourcePath` distinto del archivo host conserva el setting del `MarkdownView` propietario.
- [ ] ausencia o ambigüedad de owner cae conservadoramente a `markdownReading`.
- [ ] desactivar el setting aplicable evita el renderer semántico sin reintroducir scanning DOM privado.

### Theme/contrast

- [ ] no se emiten `HyperMD-codeblock*`.
- [ ] source usa clases propias y variables `--code-*`/`--text-normal`.
- [ ] CommonContrastManager no modifica tokens source de CodeMirror.
- [ ] CommonContrastManager sí puede normalizar rendered DOM propio.
- [ ] restore/dispose preserva color original.

### PowerShell/common

- [ ] Reading manual highlights: variable/operator/number/builtin/comment/string.
- [ ] editor manual ranges: categorías equivalentes.
- [ ] Text sigue parserless.
- [ ] Markdown mantiene parser.

### Prohibiciones arquitectónicas

- [ ] producción no temporal no contiene `.cm-embed-block`, `.cm-callout` ni `HyperMD-codeblock` como dependencia funcional.
- [ ] mientras exista gate 0D, única excepción permitida: `_tmp-host-diagnostics.ts` y tests temporales.
- [ ] tras limpieza final no hay excepciones.
- [ ] no existe MutationObserver de bridge rendered LP.
- [ ] ningún test finge el contrato de `registerMarkdownCodeBlockProcessor` en LP mediante DOM inventado; esa garantía queda en gate real.

### Ledger de garantías migradas

- [ ] Cada garantía Fase 9 tiene prueba equivalente o referencia explícita a prueba existente revisada.
- [ ] Cada garantía GATE REAL permanece fuera de simulaciones happy-dom.

## 10. Revisión TM de tests

- [ ] Revisar cobertura frente a cada invariante arquitectónico.
- [ ] Revisar y cerrar ledger.
- [ ] Distinguir tests lógicos de host-real; no llamar `real` a fixtures inventados.
- [ ] Corregir tests frágiles que midan DOM incidental de happy-dom.
- [ ] Repetir hasta dos revisiones consecutivas sin cambios.
- [ ] CI completa (`lint`, `typecheck`, tests, build, `pack:all`) verde.

## 11. Gate manual Obsidian real

No limpiar diagnostics todavía.

- [ ] Instalar artifact exacto del head validado.
- [ ] Validar PowerShell top-level source/rendered.
- [ ] Validar PowerShell quoted source/rendered.
- [ ] Validar Text presentacional quoted source/rendered.
- [ ] Validar cambio de cursor source <-> rendered.
- [ ] Validar tema activo y ausencia de crash.
- [ ] Validar que nested rendered sigue pasando por `registerMarkdownCodeBlockProcessor` tras retirar bridge DOM.
- [ ] No exigir ejecución del generic postprocessor en LP.
- [ ] Capturar diagnostics solo si existe discrepancia.
- [ ] Si falla, volver a análisis/plan según TM antes de nuevo fix.

## 12. Limpieza final

Solo tras gate manual satisfactorio:

- [ ] Eliminar `_tmp-host-diagnostics.ts` y tests diagnostics.
- [ ] Retirar wiring temporal diagnostics.
- [ ] Migrar/renombrar tests engañosos (`real DOM`, bridge desaparecido, surface antigua).
- [ ] Actualizar `packages/obsidian/README.md`.
- [ ] Actualizar `docs/theme-integration.md`.
- [ ] Eliminar documentos temporales `.iterative/callout-host-fidelity/*` agotados, incluidos planes Fase 1.
- [ ] Ejecutar CI final y `pack:all`.
- [ ] Revisar diff final para confirmar que no quedan artefactos temporales ni excepciones a selectores privados.
