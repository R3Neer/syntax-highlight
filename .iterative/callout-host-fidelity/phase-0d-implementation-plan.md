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

## 2. Probe post-frame de solo lectura

Crear `packages/obsidian/src/_tmp-live-preview-post-frame-diagnostics.ts`.

- [ ] El módulo NO importa ni conoce `LanguageRegistry` ni settings.
- [ ] Recibir `EditorView` y `getAcceptedFences(): ReadonlySet<string>`; `editor.ts` será quien proporcione esa política desde la misma fuente de verdad que el highlighter existente.
- [ ] Separar una función de solo lectura que devuelva snapshots sin publicarlos ni mutar controller/DOM.
- [ ] Obtener bloques con `findCodeBlocks()`; no crear un segundo parser Markdown.
- [ ] Filtrar primero por intersección con `view.viewport` y conservar además bloques que contengan la selección; aplicar cap duro de bloques.
- [ ] Registrar por bloque si intersecta uno o varios `view.visibleRanges`; usarlo como señal de source directo, nunca como filtro excluyente.
- [ ] Derivar `selectionRegion`: `outside | opening | body | closing`.
- [ ] Resolver cada posición de línea mediante `view.domAtPos()` y ascender exclusivamente dentro de `view.dom` hasta `.cm-line`.
- [ ] Validar que la `.cm-line` resuelta representa realmente la posición/range esperado; un boundary vecino de un replaced range no cuenta como materialización del source.
- [ ] Si `domAtPos()` falla o no produce línea representativa, devolver snapshot explícito `materialized: false` y conservar un resumen seguro del boundary local cuando exista.
- [ ] Para línea materializada capturar tag/clases, allowlist de atributos, estilos computados seleccionados y ancestry limitado.
- [ ] Capturar descendientes relevantes de la línea con límites estrictos; incluir clases, texto truncado, color/background y estado de contraste.
- [ ] Identificar tokens objetivo por offsets documentales derivados del body lógico→físico, no por búsqueda DOM global.
- [ ] Cuando un token aparece varias veces, conservar cada ocurrencia por posición documental; el texto es solo etiqueta/verificación.
- [ ] Registrar representación `source-line | rendered-widget | not-materialized | unknown` solo cuando sea demostrable localmente; no inferir widget solo por ausencia de source.
- [ ] El probe no muta DOM ni controller.

## 3. Lifecycle ViewPlugin temporal

- [ ] Exportar `createLivePreviewPostFrameDiagnosticsExtension(getAcceptedFences)` desde el nuevo módulo.
- [ ] En constructor registrar listener enabled y capture target.
- [ ] Si diagnostics ya está enabled al construir, conectar observer y schedule inicial.
- [ ] Al enable posterior: conectar `MutationObserver` scoped a `view.dom` y schedule.
- [ ] Al disable: desconectar observer y cancelar rAF pendiente.
- [ ] Observer: `childList + subtree + attributes(class/style)` exclusivamente en `view.dom`.
- [ ] `update()` agenda captura ante `docChanged`, `selectionSet`, `viewportChanged`, `geometryChanged` o `focusChanged`, usando solo flags realmente disponibles en la versión TypeScript instalada.
- [ ] Scheduler idempotente: máximo un rAF pendiente.
- [ ] Si aparecen mutaciones durante/después del frame, permitir otro frame posterior sin polling.
- [ ] Publicar snapshots como eventos `live-preview-post-frame` solo tras el rAF.
- [ ] Deduplicar snapshots consecutivos idénticos ignorando timestamp, pero no deduplicar cambios de selectionRegion/representation.
- [ ] `destroy()` cancela rAF, desconecta observer y desregistra listener/target.

## 4. Integración temporal

- [ ] Añadir la extensión post-frame a `createMarkdownEditorExtensions()` junto a las extensiones existentes.
- [ ] Reutilizar el closure `accepted()` o extraer un único helper local equivalente para proporcionar `getAcceptedFences`; no duplicar listas de fences ni pasar registry/settings al módulo diagnóstico.
- [ ] La extensión debe existir en builds normales de esta rama pero hacer cero scans/observer mientras diagnostics esté off.
- [ ] No modificar `live-preview-host.ts`, surface CSS, `CommonContrastManager`, renderer Reading ni semántica de blocks como parte de Fase 0D.
- [ ] Conservar temporalmente la implementación Fase 0C como estímulo observable.

Archivo de integración: `packages/obsidian/src/editor.ts`.

## 5. Verificación de implementación antes de tests formales nuevos

No se escriben todavía los tests nuevos de Fase 0D, pero la implementación no puede considerarse estable si rompe garantías que el repositorio ya tenía.

- [ ] `npm run lint`.
- [ ] `npm run typecheck`.
- [ ] Ejecutar la suite de tests **preexistente** como regresión; cualquier fallo exige corregir implementación antes del TM.
- [ ] `npm run build`.
- [ ] Inspección de diff: solo código diagnóstico temporal + wiring mínimo; no fix visual accidental.
- [ ] Comprobar por inspección/lifecycle que diagnostics off no mantiene observer activo ni agenda frames.
- [ ] Revisión TM de implementación hasta dos revisiones consecutivas sin cambios.

Los tests específicos nuevos de esta instrumentación pertenecen a la fase 6 y no se usan para adaptar retrospectivamente una implementación ya declarada correcta: si exponen un defecto, se reabre la fase de implementación y su TM.

## 6. Tests de Fase 0D

Los tests se desarrollarán **después de estabilizar la implementación**, siguiendo el orden solicitado para este ciclo.

- [ ] Controller: enable/disable transitions, unsubscribe, capture-target register/unregister y fan-out.
- [ ] Controller: compatibilidad con API anterior y límites/sanitización.
- [ ] Probe: `view.viewport` conserva candidatos replaced aunque no estén en `visibleRanges`.
- [ ] Probe: `visibleRanges` se registra como señal de source directo y no excluye candidatos.
- [ ] Probe: selección conserva bloque pertinente en borde/fuera del filtro normal y cap sigue aplicándose.
- [ ] Probe: domAtPos→cm-line, ancestry y estilos computados.
- [ ] Probe: boundary vecino/replaced y excepción de `domAtPos()` producen `materialized:false` sin abortar otros bloques.
- [ ] Probe: offsets repetidos (`$foo`) resueltos por posición, no por primer texto coincidente.
- [ ] Probe: `getAcceptedFences()` se evalúa en captura y puede reflejar cambios posteriores sin recrear el ViewPlugin.
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
- [ ] `SyntaxHighlightHostDiagnostics.clear(); SyntaxHighlightHostDiagnostics.enable(); SyntaxHighlightHostDiagnostics.capture();`.
- [ ] Capturar PowerShell top-level con cursor dentro.
- [ ] Cambiar cursor al quoted, esperar reconciliación, `clear(); capture();` y capturar PowerShell quoted con cursor dentro.
- [ ] Mover cursor fuera de ambos, esperar reconciliación, `clear(); capture();` y capturar cursor fuera de ambos.
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
