# Plan de implementación temporal · Fase 1

Estado: TEMPORAL. Eliminar tras implementación, tests, validación real y limpieza final.

Este plan ejecuta el plan arquitectónico estabilizado. Los checkboxes son la fuente de verdad del progreso. No marcar una tarea hasta que el cambio correspondiente exista y haya pasado las comprobaciones aplicables.

## 0. Baseline y guardrails

- [x] Confirmar head de `plan/obsidian-callout-host-fidelity` y CI verde antes de producción.
- [x] Confirmar que ningún archivo temporal anterior se elimina todavía: diagnostics y planes siguen siendo necesarios hasta el gate real.
- [x] Registrar cualquier cambio de alcance en este plan antes de implementarlo.
- [x] Mantener un pequeño ledger dentro de este plan de tests/garantías antiguas retiradas durante la refactorización, indicando en qué tarea de la Fase 9 se sustituyen.

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
- [x] Añadir/ajustar peerDependencies explícitas del paquete Obsidian únicamente para los módulos host que el paquete publicado deja como runtime imports y los módulos Lezer cuya identidad debe compartirse, con rangos compatibles con `obsidian`.
- [x] Mantener lockfile coherente; el cambio de peer metadata no requirió reescritura y `npm ci` lo valida.
- [x] Ejecutar CI existente; no añadir todavía tests nuevos de Fase 1.

### Resultado esperado

- El artifact conserva imports externos de la frontera host oficial.
- Ninguna copia privada de CodeMirror core/Lezer host queda embebida.
- Los language packages sí siguen dentro del artifact.

## 2. Fallback estructural de Markdown rendered desacoplado

### Producción

- [x] Crear `rendered-code-candidate.ts` (nombre final sujeto a código) sin dependencias de Live Preview.
- [x] Mover allí detección de PRE/CODE, processed guard y preservación de furniture.
- [x] Resolver `language-*` desde PRE y CODE:
  - [x] PRE-only válido;
  - [x] CODE-only válido;
  - [x] ambos iguales válido;
  - [x] conflicto/varios valores -> fail closed.
- [x] Mantener un único CODE directo como requisito.
- [x] Adaptar `reading-host.ts` al detector nuevo.
- [x] Mantener `registerMarkdownPostProcessor` como fallback cuya **garantía contractual es Reading View**.
- [x] No añadir lógica para impedir que un renderer Markdown interno lo invoque en otro contexto; garantizar idempotencia/fail-closed si ocurre.
- [x] No usar ese postprocessor como requisito para la corrección de Live Preview.
- [x] Ejecutar CI existente.

## 3. Eliminar bridge DOM de rendered Live Preview

### Producción

- [x] Inventariar tests existentes que cubren `LivePreviewRenderedBlockBridge` y anotar en el ledger qué garantía útil conserva cada uno antes de borrarlo/adaptarlo.
- [x] Retirar `LivePreviewRenderedBlockBridge` y sus helpers de scanning/replacement del EditorView.
- [x] Retirar cualquier producción que dependa de `.cm-embed-block` o `.cm-callout`.
- [x] Retirar `LIVE_PREVIEW_HOST_ATTRIBUTE` si deja de tener consumidores legítimos.
- [x] Dejar la **garantía** de rendered Live Preview exclusivamente en `registerMarkdownCodeBlockProcessor`.
- [x] No depender del generic Markdown postprocessor para Live Preview, aunque pueda ejecutarse incidentalmente en un subtree rendered.
- [x] Reubicar temporalmente `registerLivePreviewDiagnosticView()` dentro de la extensión source existente para no perder el gate 0D.
- [x] Eliminar `live-preview-host.ts` al no conservar responsabilidad production.
- [x] Ajustar/eliminar tests antiguos únicamente cuando su contrato production haya desaparecido; cada garantía útil retirada queda enlazada en el ledger a Fase 9 o gate real.
- [x] Ejecutar CI existente; la nueva cobertura arquitectónica se reserva para la fase de tests.

## 4. Modelo source y caché por viewport

### Producción · modelo

- [x] Crear `editor-block-model.ts` sin DOM/CodeMirror View ownership.
- [x] Definir modelo estructural/resuelto de bloque.
- [x] Resolver configured/common una sola vez por reconstrucción del modelo.
- [x] Definir helper de intersección bloque <-> `visibleRanges`.
- [x] Definir clave de caché semántica por bloque + runtime revision.
- [x] Usar invalidación conservadora durante esta refactorización:
  - [x] cualquier `docChanged` limpia la caché semántica completa del view;
  - [x] cualquier cambio de runtime/registry revision relevante limpia la caché;
  - [x] viewport/selection sin cambio documental reutiliza entradas válidas.
- [x] No introducir reutilización posicional sofisticada entre documentos distintos en este ciclo.
- [x] No tokenizar bloques no visibles.

### Producción · semántica

- [x] Para bloque visible configurado, tokenizar cuerpo lógico completo y mapear a offsets físicos.
- [x] Para common parser-backed, parsear cuerpo lógico completo y mapear highlights físicos.
- [x] Para Text parserless, producir plain spans sin parser.
- [x] Construir line semantics propias por opening/body/closing.
- [x] Fusionar surface + presentation en una sola especificación de línea por posición.
- [x] Mantener line-number policy separada.

### Producción · adapter CodeMirror

- [x] Refactorizar `createEditorHighlighter` para conservar:
  - [x] modelo estructural cacheado;
  - [x] caché semántica visible;
  - [x] DecorationSet materializado.
- [x] Reconstruir modelo solo en doc/revision/fence-resolution change.
- [x] Aplicar las invalidaciones conservadoras definidas arriba antes de materializar.
- [x] Reconstruir materialización en model change / `viewportChanged` / `selectionSet` / settings visuales relevantes.
- [x] Generar marks/lines/widgets solo donde intersecten visible ranges.
- [x] Mantener suscripción del registry y cleanup de `destroy()`.
- [x] Mantener Smart Editing usando `findCodeBlocks()`/modelo sin acoplarlo a DOM.
- [x] Ejecutar CI existente.

## 5. Surface/presentation source con clases propias

### Producción

- [x] Eliminar `QUOTED_CODE_SOURCE_CLASS` y toda emisión `HyperMD-codeblock*`.
- [x] Emitir únicamente clases `syntax-editor-code-source*` y presentation propias.
- [x] Añadir en `styles.css` surface source basada en `--syntax-editor-code-background` -> `--code-background`.
- [x] Añadir color base source `--syntax-editor-code-color` -> `--text-normal`; las categorías semánticas específicas conservan sus fallbacks `--code-*`.
- [x] No usar selector `.cm-embed-block`, `.cm-callout` o `HyperMD-*` como dependencia funcional nueva.
- [x] No introducir margins verticales; usar únicamente propiedades seguras de línea/surface.
- [x] Mantener alignment/flow en body presentacional.
- [x] Confirmar que top-level no recibe una segunda surface propia si Obsidian ya lo representa nativamente.
- [x] Ejecutar CI existente.

## 6. Contraste respetando ownership

### Producción

- [x] Cambiar `CommonContrastManager` para considerar normalizables solo tokens dentro de `.syntax-highlight-frame` plugin-owned.
- [x] Impedir que source CodeMirror reciba `style.color` o `data-syntax-contrast-adjusted` del manager.
- [x] Mantener exclusión de settings preview.
- [x] Mantener configured profile semantics fuera del manager común.
- [x] Reducir pending roots/normalización al subtree plugin-owned sin reescribir el algoritmo perceptual.
- [x] Confirmar restore/dispose correcto únicamente sobre nodos que el manager pudo modificar.
- [x] Ejecutar CI existente.

## 7. Common highlighting tras unificar runtime

### Producción

- [x] Revisar `parseCommonLanguageTree()` y mantener `EditorState + ensureSyntaxTree` para StreamLanguage; no hay evidencia para retirar el workaround seguro.
- [x] No añadir ramas específicas PowerShell al renderer.
- [x] Mantener `createCommonHighlightStyle()` como taxonomía única.
- [x] Mantener `source-view.ts` usando `common.support()` + `syntaxHighlighting(COMMON_EDITOR_HIGHLIGHT_STYLE)`.
- [x] Ejecutar build/CI existente con el runtime externo.

## 8. Revisión TM de implementación

- [ ] Revisar diff completo contra plan arquitectónico.
- [ ] Revisar especialmente que no quede mutación DOM de CodeMirror.
- [ ] Revisar imports/bundle runtime contra el sample oficial completo.
- [ ] Revisar que no queden selectores privados como dependencia funcional.
- [ ] Revisar que LP rendered no dependa del generic postprocessor.
- [ ] Revisar ownership de contraste.
- [ ] Revisar performance/invalidation del ViewPlugin.
- [ ] Revisar el ledger de garantías retiradas y comprobar que todas tienen sustituto planificado en Fase 9.
- [ ] Aplicar correcciones encontradas.
- [ ] Repetir hasta obtener dos revisiones consecutivas sin cambios.
- [ ] Solo entonces pasar a la fase de tests nuevos.

## 9. Tests de Fase 1

> Esta sección se ejecuta **después** de estabilizar implementación. Tests antiguos pueden ajustarse/eliminarse durante la implementación cuando prueben APIs deliberadamente eliminadas, pero sus garantías útiles deben estar registradas en el ledger y recuperarse aquí.

### Runtime/build

- [ ] Test de la lista completa de externals frente a la frontera oficial adoptada (`obsidian`, `electron`, CM, Lezer, built-ins).
- [ ] Verificación de metafile: host runtime no bundled.
- [ ] Verificar que language packages permanecen bundled.
- [ ] Verificar packaging final.

### Reading/fallback

- [ ] PRE-only.
- [ ] CODE-only.
- [ ] PRE/CODE agreement.
- [ ] PRE/CODE conflict fail-closed.
- [ ] furniture identity/preservation.
- [ ] idempotence/processed marker.
- [ ] El fallback no contiene dependencias de clases de Live Preview.

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

### Theme/contrast

- [ ] no se emiten `HyperMD-codeblock*`.
- [ ] source usa clases propias y variables `--code-*`/`--text-normal`.
- [ ] CommonContrastManager no modifica tokens source de CodeMirror.
- [ ] CommonContrastManager sí puede normalizar rendered DOM propio.
- [ ] restore/dispose preserva color original.

### PowerShell/common

- [ ] Reading manual highlights produce variable/operator/number/builtin/comment/string.
- [ ] editor manual ranges producen las categorías equivalentes.
- [ ] Text sigue parserless.
- [ ] Markdown mantiene parser.

### Prohibiciones arquitectónicas

- [ ] test estático/CI: código production no temporal no contiene `.cm-embed-block`, `.cm-callout` ni `HyperMD-codeblock` como dependencia funcional.
- [ ] mientras exista el gate 0D, la única excepción permitida a esa búsqueda es `_tmp-host-diagnostics.ts` y sus tests temporales.
- [ ] tras limpieza final, la búsqueda no admite ninguna excepción.
- [ ] no existe MutationObserver de bridge rendered Live Preview.
- [ ] no hay test que pretenda simular el contrato de `registerMarkdownCodeBlockProcessor` en LP mediante DOM inventado; esa garantía es gate real.

### Ledger de garantías migradas

- [ ] Cada garantía útil anotada al retirar tests del bridge/host antiguo tiene una nueva prueba equivalente o queda explícitamente cubierta por el gate manual si no puede simularse legítimamente.

## 10. Revisión TM de tests

- [ ] Revisar cobertura frente a cada invariante arquitectónico.
- [ ] Revisar y cerrar el ledger de garantías migradas.
- [ ] Distinguir tests lógicos de host-real; no llamar `real` a fixtures inventados.
- [ ] Corregir tests frágiles que midan incidental DOM de happy-dom.
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
- [ ] Validar específicamente que nested rendered sigue pasando por `registerMarkdownCodeBlockProcessor` tras retirar el bridge DOM.
- [ ] No considerar como requisito que el generic Markdown postprocessor se ejecute en LP.
- [ ] Capturar diagnostics únicamente si existe discrepancia.
- [ ] Si falla, volver a análisis/plan según TM antes de un nuevo fix.

## 12. Limpieza final

Solo tras gate manual satisfactorio:

- [ ] Eliminar `_tmp-host-diagnostics.ts` y tests de diagnostics.
- [ ] Retirar cualquier wiring temporal de diagnostics.
- [ ] Migrar/renombrar tests engañosos (`real DOM`, bridge desaparecido, surface antigua).
- [ ] Actualizar `packages/obsidian/README.md`.
- [ ] Actualizar `docs/theme-integration.md`.
- [ ] Eliminar documentos temporales `.iterative/callout-host-fidelity/*` agotados por este objetivo, incluidos los dos planes de Fase 1.
- [ ] Ejecutar CI final y `pack:all`.
- [ ] Revisar diff final para confirmar que no quedan artefactos temporales ni excepciones a la prohibición de selectores privados.
