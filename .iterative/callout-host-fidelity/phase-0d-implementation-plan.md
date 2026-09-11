# Plan de implementación temporal · Fase 0D

Estado: TEMPORAL. No iniciar implementación hasta estabilizar este plan por TM.

Objetivo de esta unidad: instrumentar el DOM post-frame real de Live Preview sin aplicar todavía ningún fix visual.

## 1. Controlador diagnóstico temporal

- [ ] Extender `HostDiagnosticPath` con `live-preview-post-frame` sin cambiar semántica de paths existentes.
- [ ] Añadir tipos separados para snapshot post-frame: bloque, línea, ancestry, descendientes/token y estilos computados.
- [ ] Añadir allowlist de atributos y límites de texto/descendientes/eventos; no serializar `outerHTML` completo.
- [ ] Añadir `hostDiagnosticsEnabled()` como consulta barata.
- [ ] Añadir suscripción a enabled/disabled con función de unsubscribe.
- [ ] Añadir registro/desregistro de capture targets sin importar CodeMirror en `_tmp-host-diagnostics.ts`.
- [ ] Añadir `capture()` al controller global para solicitar captura a todos los targets vivos.
- [ ] `enable()` debe notificar solo en transición false→true; `disable()` solo true→false.
- [ ] Mantener compatibilidad de `enable/disable/clear/dump/events` usada en capturas anteriores.

Archivo principal: `packages/obsidian/src/_tmp-host-diagnostics.ts`.

## 2. Probe post-frame puro

Crear `packages/obsidian/src/_tmp-live-preview-post-frame-diagnostics.ts`.

- [ ] Separar una función pura/de lectura que reciba `EditorView`, registry/accepted fences y devuelva snapshots sin publicarlos.
- [ ] Obtener bloques con `findCodeBlocks()`; no crear un segundo parser Markdown.
- [ ] Filtrar a bloques que intersecten `view.visibleRanges` o contengan la selección; aplicar cap duro de bloques.
- [ ] Derivar `selectionRegion`: `outside | opening | body | closing`.
- [ ] Resolver cada posición de línea mediante `view.domAtPos()` y ascender exclusivamente dentro de `view.dom` hasta `.cm-line`.
- [ ] Si la línea no está materializada, devolver snapshot explícito `materialized: false`.
- [ ] Para línea materializada capturar tag/clases, allowlist de atributos, estilos computados seleccionados y ancestry limitado.
- [ ] Capturar descendientes relevantes de la línea con límites estrictos; incluir clases, texto truncado, color/background y estado de contraste.
- [ ] Identificar tokens objetivo por offsets documentales derivados del body lógico→físico, no por búsqueda DOM global.
- [ ] Registrar representación `source-line | rendered-widget | not-materialized` solo cuando sea demostrable localmente; en caso dudoso usar `not-materialized/unknown` en vez de heurística global.
- [ ] El probe no muta DOM ni controller.

## 3. Lifecycle ViewPlugin temporal

- [ ] Exportar `createLivePreviewPostFrameDiagnosticsExtension(...)` desde el nuevo módulo.
- [ ] En constructor registrar listener enabled y capture target.
- [ ] Si diagnostics ya está enabled al construir, conectar observer y schedule inicial.
- [ ] Al enable posterior: conectar `MutationObserver` scoped a `view.dom` y schedule.
- [ ] Al disable: desconectar observer y cancelar rAF pendiente.
- [ ] Observer: `childList + subtree + attributes(class/style)` exclusivamente en `view.dom`.
- [ ] `update()` agenda captura ante `docChanged`, `selectionSet`, `viewportChanged`, `geometryChanged` o `focusChanged`.
- [ ] Scheduler idempotente: máximo un rAF pendiente.
- [ ] Si aparecen mutaciones durante/después del frame, permitir otro frame posterior sin polling.
- [ ] Publicar snapshots como eventos `live-preview-post-frame` solo tras el rAF.
- [ ] Deduplicar snapshots consecutivos idénticos ignorando timestamp, pero no deduplicar cambios de selectionRegion/representation.
- [ ] `destroy()` cancela rAF, desconecta observer y desregistra listener/target.

## 4. Integración temporal

- [ ] Añadir la extensión post-frame a `createMarkdownEditorExtensions()` junto a las extensiones existentes.
- [ ] Pasarle únicamente registry/accepted fences/getSettings necesarios; no duplicar política de lenguajes.
- [ ] La extensión debe existir en builds normales de esta rama pero hacer cero scans/observer mientras diagnostics esté off.
- [ ] No modificar `live-preview-host.ts`, surface CSS, `CommonContrastManager`, renderer Reading ni semántica de blocks como parte de Fase 0D.
- [ ] Conservar temporalmente la implementación Fase 0C como estímulo observable.

Archivo de integración: `packages/obsidian/src/editor.ts`.

## 5. Verificación de implementación antes de tests formales

- [ ] `npm run typecheck`.
- [ ] `npm run lint`.
- [ ] Inspección de diff: solo código diagnóstico temporal + wiring mínimo; no fix visual accidental.
- [ ] Comprobar que diagnostics off no instala observer activo ni agenda frames.
- [ ] Revisión TM de implementación hasta dos revisiones consecutivas sin cambios.

## 6. Tests de Fase 0D

Los tests se desarrollarán **después de estabilizar la implementación**, siguiendo el orden solicitado para este ciclo.

- [ ] Controller: enable/disable transitions, unsubscribe, capture-target register/unregister y fan-out.
- [ ] Controller: compatibilidad con API anterior y límites/sanitización.
- [ ] Probe: filtros visibleRanges/selección/cap.
- [ ] Probe: domAtPos→cm-line, ancestry y estilos computados.
- [ ] Probe: `materialized:false` cuando la posición no tiene línea visible/replaced.
- [ ] Probe: offsets repetidos (`$foo`) resueltos por posición, no por primer texto coincidente.
- [ ] Lifecycle: enable conecta observer + agenda sin ViewUpdate.
- [ ] Lifecycle: disable/destroy desconectan observer y cancelan frames.
- [ ] Lifecycle: ViewUpdate y MutationObserver comparten batching rAF.
- [ ] Lifecycle: style mutation externa puede producir segundo estado; el diagnóstico no se auto-dispara por sus propias lecturas/eventos.
- [ ] Dedup: elimina snapshots idénticos pero conserva cambios de selección/representación.
- [ ] Integración `EditorView`: extensión realmente instalada por `createMarkdownEditorExtensions()` y controller `capture()` produce evento post-frame.
- [ ] Verificar que tests de Fase 0C siguen pasando sin reinterpretarlos como fidelidad de host real.
- [ ] CI completa (`npm run check`, `pack:all`, artifact).
- [ ] Revisión TM de tests hasta dos revisiones consecutivas sin cambios.

## 7. Gate Obsidian real

No implementar ningún nuevo fix de surface/color antes de completar estas capturas.

- [ ] Instalar build común en vault de clases.
- [ ] `SyntaxHighlightHostDiagnostics.clear(); enable(); capture();`.
- [ ] Capturar PowerShell top-level con cursor dentro.
- [ ] `clear(); capture();` y capturar PowerShell quoted con cursor dentro.
- [ ] `clear(); capture();` y capturar cursor fuera de ambos.
- [ ] Exportar JSON post-frame sanitizado.
- [ ] Clasificar evidencia contra ramas A/B/C/D/E del plan arquitectónico.
- [ ] Solo después crear análisis/plan del fix real que corresponda.

## 8. Criterio de cierre de Fase 0D

Fase 0D queda cerrada únicamente si:

1. implementación estable por TM;
2. tests estables por TM y CI verde;
3. captura post-frame real obtenida;
4. la captura permite decidir qué hipótesis de materialización sigue viva sin inferir desde un `EditorView` artificial.

Los artefactos diagnósticos y documentos `.iterative` siguen siendo temporales y NO se eliminan todavía: son necesarios hasta completar el ciclo global y migrar solo fixtures/evidencia mínima útil.
