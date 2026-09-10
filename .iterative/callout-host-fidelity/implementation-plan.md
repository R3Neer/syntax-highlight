# Plan de implementación temporal

Estado: TEMPORAL. EJECUCIÓN EN CURSO. Eliminar al terminar implementación + tests.

## Regla de ejecución

Cada bloque de trabajo se ejecutará test-first/adversarial. Si la captura real contradice la hipótesis arquitectónica, NO adaptar el test para hacerla cierta: volver a análisis/plan. Los helpers de diagnóstico y las capturas sin sanitizar son temporales. Cada fase termina con regresión explícita top-level + nested antes de avanzar.

## Fase 0: contrato real con Obsidian

- [x] Añadir instrumentación temporal activable solo en desarrollo para registrar qué path reclama cada fence: specialized processor, Reading fallback, LP rendered bridge o source decorations.

### Fase 0A: prerrequisito descubierto por captura real

La primera captura expuso un crash de PowerShell anterior al problema de callouts: el bridge común llama `support.language.parser.parse(...)` directamente sobre un `StreamLanguage` y el CodeMirror expuesto por Obsidian puede requerir `ParseContext` activo. Se corrige este bloqueador antes de repetir la matriz para no contaminar la evidencia de Fase 0.

- [ ] Añadir regresión que demuestre que un common language basado en `StreamLanguage` no depende de `parser.parse(...)` directo.
- [ ] Introducir un único helper de parse de common languages que use el lifecycle de `EditorState` para `StreamLanguage` y mantenga el camino directo para parsers Lezer ordinarios.
- [ ] Reutilizar ese helper en Reading y en decorations de Markdown editor.
- [ ] Ejecutar CI completa y revisión TM hasta dos revisiones consecutivas sin cambios.
- [ ] Reinstalar el build y comprobar que PowerShell top-level/nested deja de provocar el `viewport` null antes de continuar capturas.

### Captura host

- [ ] Capturar DOM/clases/atributos para `text` top-level Reading y callout Reading.
- [ ] Capturar top-level LP y callout LP con cursor fuera/dentro.
- [ ] Repetir al menos con PowerShell para no deducir la arquitectura solo del parserless Text.
- [ ] Registrar source/resultado con body quoted completo, una línea sin `>`, varias sin `>`, blank lines, nested quoteDepth y cierre variado.
- [ ] Registrar clases de opening/body/closing lines top-level y nested cuando están visibles en source.
- [ ] Eliminar datos específicos del vault y convertir solo estructura mínima en fixtures sanitizados.
- [ ] Crear tests RED que reproduzcan exactamente las divergencias observadas antes de tocar producción.
- [ ] Si la captura contradice H4/H6, detener esta ejecución y volver a análisis arquitectónico.

Helper temporal implementado: `packages/obsidian/src/_tmp-host-diagnostics.ts`. Está inerte por defecto y expone `window.SyntaxHighlightHostDiagnostics` para habilitar, limpiar y exportar la captura desde DevTools. Los fixtures sanitizados pueden ser permanentes; el helper, su test temporal y las capturas crudas se eliminan antes de merge.

## Fase 1: semántica de fuente Obsidian

- [ ] Extender `blocks.test.ts` con la matriz capturada: quoteDepth 1/2+, missing/partial/full quote prefixes, blank lines, CRLF/LF, backticks/tildes, fences largos y contenido exterior.
- [ ] Modificar `blocks.ts` para implementar exactamente la continuidad/cierre observados en Obsidian.
- [ ] Extender el modelo de code block con rangos físicos de opening/body/closing y la información de container necesaria para surface + Smart Editing.
- [ ] Verificar `mapCodeBlockRange`, `isCodeBlockContentPosition`, `findCodeBlockBodyStartLine` y rewrite de presentation fences.
- [ ] Añadir adversariales contra absorción accidental de unrelated/unknown fences.
- [ ] Ejecutar regresión top-level de todos los tipos de fence ya soportados.

## Fase 2: Smart Editing canónico

- [ ] Extender `EditingContext` con información estructural de quote sin acoplar `smart-edit.ts` al modelo completo.
- [ ] Añadir RED tests de Enter en quoted fence depth 1/2 y cursor en inicio/mitad/final de línea.
- [ ] Añadir RED tests de paste multilinea: sin prefijos, parcialmente prefijado, ya prefijado, blank lines, CRLF, selección simple/múltiple.
- [ ] Implementar Enter canónico preservando indentación, selección y line ending.
- [ ] Implementar normalización de paste solo dentro del body; nunca opening/closing ni contenido exterior.
- [ ] No duplicar prefijos que ya satisfacen la profundidad requerida.
- [ ] Verificar que Smart Editing MUD/top-level existente no cambia y que `nativeIndentation` no entra en conflicto.

Archivos principales: `smart-edit.ts`, `editor.ts`, `smart-edit.test.ts`, `smart-edit-integration.test.ts`.

## Fase 3: probe compartido de host renderizado

- [ ] Crear `rendered-code-host.ts` con candidate/probe independiente de Reading/LP.
- [ ] Migrar la extracción actual desde `reading-host.ts` sin alterar todavía lifecycle.
- [ ] Resolver fence desde PRE/CODE según fixtures: PRE-only, CODE-only, ambos equivalentes y conflicto.
- [ ] No exigir nesting/direct-child adicional que los fixtures no justifiquen.
- [ ] Mantener fail-closed para múltiples candidates/metadata ambigua.
- [ ] Definir claim/render preservando auxiliary nodes, node identity necesaria y listeners.
- [ ] Probar idempotencia, source exacto y DOM ajeno intacto.

## Fase 4: Reading View

- [ ] Usar el trace de fase 0 para demostrar qué ocurre con `registerMarkdownCodeBlockProcessor` en nested Text y PowerShell.
- [ ] Conservar processor especializado donde funcione.
- [ ] Reescribir `reading-host.ts` para delegar probe/claim al módulo compartido.
- [ ] Si metadata está completa al postprocesar: mantener fallback one-shot.
- [ ] Si existe clasificación tardía: añadir lifecycle child/observer scoped y tests de late class/dispose; no observer global.
- [ ] Garantizar que primary processor y fallback no reclaman dos veces el mismo bloque.
- [ ] Verificar Text/Markdown sin furniture, PowerShell/configured con furniture, presentation modifiers y click-to-edit pese a `sectionInfo` de callouts.
- [ ] Comparar DOM visual/estructural top-level vs nested después del claim.

Archivos probables: `reading-host.ts`, `main.ts`, `reading-fallback.test.ts` y nueva suite de fixture Reading.

## Fase 5: Live Preview renderizado

- [ ] Reducir `live-preview-host.ts` a lifecycle/scope/batching, delegando detección/claim al módulo compartido.
- [ ] Derivar scope de widget del fixture real; conservar `.cm-embed-block` solo si se confirma.
- [ ] Tests de inserción tardía, class tardía, removal/recreation, dispose, unknown y conflictos.
- [ ] Test de transición cursor fuera → dentro → fuera sin DOM procesado huérfano/duplicado.
- [ ] Confirmar que cada `EditorView` queda aislado y que cerrar una vista desconecta su observer.

## Fase 6: Live Preview fuente visible y surface parity

- [ ] Comparar clases efectivas opening/body/closing top-level vs nested capturadas en fase 0.
- [ ] Añadir RED test de surface parity que no codifique colores concretos.
- [ ] Extender modelo/rangos solo si la captura demuestra que falta información.
- [ ] Añadir decorations de surface en `editor.ts` separadas de syntax/presentation.
- [ ] Si se reutilizan clases host, probar adversarialmente selección, cursor, indentación, parsing, copy behavior y transición source/rendered.
- [ ] Si esas clases tienen efectos laterales, usar clase propia con variables semánticas de Obsidian y comparar Default + Nier.
- [ ] Confirmar Text/Markdown sin badge/números y modifiers alignment/flow intactos.
- [ ] Ejecutar regresión top-level para asegurar que no se duplica superficie donde Obsidian ya la pone.

## Fase 7: contraste y tema

- [ ] Ejecutar contraste sobre nested Reading y LP source con superficie final.
- [ ] Confirmar ausencia de branch por nombre de tema.
- [ ] Si background final es ancestral: NO tocar `contrast-manager.ts`.
- [ ] Solo ante test real fallando por fondo no ancestral: introducir API explícita `effective host surface`; probar alpha/composition y CodeMirror node reuse.

## Fase 8: consolidación de tests

- [ ] Migrar aserciones útiles de `reading-real-dom.test.ts` a suite basada en fixture capturado.
- [ ] Sustituir `live-preview-extension-integration.test.ts` por prueba extensión real + fixture capturado, manteniendo wiring de `createMarkdownEditorExtensions`.
- [ ] Reescribir helpers de `live-preview-host.test.ts` y `live-preview-adversarial.test.ts` para shared fixtures.
- [ ] Matriz mutation/adversarial: quitar/duplicar/conflictar classes, mover copy button, wrappers, scans repetidos, destroy durante schedule, múltiples bloques hermanos.
- [ ] Solo después de demostrar cobertura equivalente/superior, eliminar tests obsoletos candidatos.

## Fase 9: documentación permanente y limpieza temporal

- [ ] Corregir `docs/theme-integration.md`, `packages/obsidian/README.md` y `CHANGELOG.md` con lo realmente implementado.
- [ ] Eliminar helper `_tmp-*`, capturas crudas y todos los docs de `.iterative/callout-host-fidelity/`.
- [ ] Verificar árbol completo sin requirements/analysis/plan/review temporales.

## Fase 10: validación final y gate de merge

- [ ] `npm ci` desde limpio; lint; typecheck; tests; build; `pack:all`; artifact.
- [ ] Instalar perfil `common` en `D:\Universidad\Clases` y ejecutar matriz A/B/C/D con Nier.
- [ ] Instalar perfil `mud` en `D:\Mud` y comprobar aislamiento/perfil.
- [ ] Repetir casos mínimos en tema Default para demostrar independencia del tema.
- [ ] Verificar específicamente el fragmento real de `inbox.md` en forma canónica y en la forma permisiva aceptada por Obsidian.
- [ ] **Gate duro:** no abrir/mergear como solución terminada sin una validación en Obsidian real que demuestre Reading + LP source/rendered. Si no hay acceso remoto, la validación manual del usuario precede al merge.
- [ ] Después del gate: PR CI verde, revisión adversarial final, squash merge y CI verde sobre `main`.

## Candidatos a eliminar durante la implementación

- `packages/obsidian/tests/reading-real-dom.test.ts`, solo después de migrar sus aserciones.
- `packages/obsidian/tests/live-preview-extension-integration.test.ts`, solo después de sustituir su garantía de wiring.

No se planea eliminar por completo `reading-host.ts`, `live-preview-host.ts` ni `contrast-manager.ts`.
