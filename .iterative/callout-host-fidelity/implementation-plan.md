# Plan de implementación temporal

Estado: TEMPORAL. NO implementar todavía. Eliminar al terminar implementación + tests.

## Regla de ejecución

Cada bloque de trabajo se ejecutará test-first/adversarial. Si la captura real contradice la hipótesis arquitectónica, NO adaptar el test para hacerla cierta: volver a análisis/plan. Los helpers de diagnóstico y los fixtures sin sanitizar son temporales.

## Fase 0: contrato real con Obsidian

- [ ] Añadir instrumentación temporal activable solo en desarrollo para registrar qué path reclama cada fence: specialized processor, Reading fallback, LP rendered bridge o source decorations.
- [ ] Capturar DOM/clases/atributos para `text` top-level Reading.
- [ ] Capturar `text` dentro de `[!task]` Reading.
- [ ] Capturar top-level LP con cursor fuera/dentro.
- [ ] Capturar callout LP con cursor fuera/dentro.
- [ ] Repetir al menos con PowerShell para no deducir la arquitectura solo del parserless Text.
- [ ] Registrar el comportamiento de source con body quoted completo y body con líneas sin `>`.
- [ ] Eliminar logs/datos específicos del vault y convertir solo la estructura mínima en fixtures sanitizados.
- [ ] Crear tests RED que reproduzcan exactamente las divergencias observadas antes de tocar producción.

Archivos temporales posibles: `packages/obsidian/src/_tmp-host-diagnostics.ts`, `packages/obsidian/tests/fixtures/obsidian-host/*`. El helper `_tmp-*` se elimina antes de merge; los fixtures sanitizados pasan a permanentes si no contienen datos del usuario.

## Fase 1: semántica de fuente Obsidian

- [ ] Extender tests de `blocks.test.ts` con la matriz capturada: quoteDepth 1/2+, missing/partial/full quote prefixes, blank lines, CRLF/LF, backticks/tildes, fences largos y contenido exterior.
- [ ] Modificar `blocks.ts` para implementar exactamente la continuidad/cierre observados en Obsidian.
- [ ] Extender `MudCodeBlock`/modelo común con rangos físicos de opening/closing y la información de container necesaria para surface + Smart Editing.
- [ ] Verificar que `mapCodeBlockRange`, `isCodeBlockContentPosition`, `findCodeBlockBodyStartLine` y rewrite de presentation fences siguen mapeando correctamente.
- [ ] Añadir adversariales que garanticen que unrelated fences y unknown containers no se absorben accidentalmente.

## Fase 2: Smart Editing canónico

- [ ] Extender `EditingContext` con información estructural de quote sin acoplar `smart-edit.ts` a `MudCodeBlock` completo.
- [ ] Añadir RED tests de Enter dentro de quoted fence depth 1 y 2.
- [ ] Añadir RED tests de paste multilinea: sin prefijos, parcialmente prefijado, ya prefijado, CRLF, selección múltiple y pegado que contiene blank lines.
- [ ] Implementar Enter canónico conservando indentación y selección.
- [ ] Implementar normalización de paste solo dentro del body del fenced block; nunca fuera ni en opening/closing fence.
- [ ] Verificar que Smart Editing MUD existente no cambia en top-level y que `nativeIndentation` no entra en conflicto con quote prefixing.

Archivos principales: `smart-edit.ts`, `editor.ts`, `smart-edit.test.ts`, `smart-edit-integration.test.ts`.

## Fase 3: probe compartido de host renderizado

- [ ] Crear `rendered-code-host.ts` con tipos de candidate/probe independientes de Reading/LP.
- [ ] Migrar la extracción actual de candidate desde `reading-host.ts` sin cambiar todavía lifecycle.
- [ ] Implementar resolución de fence desde PRE/CODE conforme a fixtures: PRE-only, CODE-only, ambos equivalentes y conflicto.
- [ ] Mantener fail-closed para múltiples code nodes/metadata ambigua según estructura real.
- [ ] Definir operación de claim/render que preserve auxiliary nodes y listeners; comprobar identidad con tests.
- [ ] Probar idempotencia y source byte-for-byte.

## Fase 4: Reading View

- [ ] Instrumentar test que demuestre si `registerMarkdownCodeBlockProcessor` reclama nested Text/PowerShell en el host capturado.
- [ ] Conservar processor especializado donde funcione.
- [ ] Reescribir `reading-host.ts` para delegar probe/claim al módulo compartido.
- [ ] Si fixture demuestra metadata completa al ejecutar postprocessor: mantener fallback one-shot y añadir cobertura.
- [ ] Si fixture demuestra clasificación tardía: añadir lifecycle child/observer scoped y test de dispose + late class.
- [ ] Verificar que un bloque reclamado por processor primario no vuelve a ser reclamado por fallback.
- [ ] Verificar Text/Markdown sin furniture, PowerShell/configured con furniture correspondiente y click-to-edit con sectionInfo defectuoso de callouts.

Archivos probables: `reading-host.ts`, `main.ts`, `reading-fallback.test.ts`; nuevo test de fixture Reading.

## Fase 5: Live Preview renderizado

- [ ] Reducir `live-preview-host.ts` a lifecycle/scope/batching, delegando detección y claim al módulo compartido.
- [ ] Derivar el scope de widget de fixture real; conservar `.cm-embed-block` solo si se confirma.
- [ ] Tests de inserción tardía, class tardía, removal/recreation, dispose, unknown y conflictos.
- [ ] Test de transición cursor fuera → dentro → fuera sin dejar DOM procesado huérfano ni duplicado.

## Fase 6: Live Preview fuente visible y surface parity

- [ ] Capturar las clases de opening/body/closing de un code block top-level real y compararlas con nested activo.
- [ ] Añadir RED test que exija surface parity sin exigir un color específico.
- [ ] Extender `blocks.ts`/modelo solo si faltan rangos de opening/closing.
- [ ] Añadir en `editor.ts` decorations de surface separadas de syntax/presentation.
- [ ] Si se reutilizan clases host, añadir test adversarial que verifique ausencia de efectos sobre selección, edición, indentación y parsing.
- [ ] Si clases host tienen efectos laterales, usar clase propia con variables semánticas de Obsidian y comparar visualmente con top-level en tema Default + Nier.
- [ ] Confirmar que Text/Markdown siguen sin badge/números y que sus modifiers de alignment/flow siguen funcionando.

## Fase 7: contraste y tema

- [ ] Ejecutar contraste sobre nested Reading y LP source con fixture/superficie final.
- [ ] Confirmar que no existe branch por nombre de tema.
- [ ] Si el background final es ancestral: no tocar `contrast-manager.ts`.
- [ ] Solo si un test real falla por fondo no ancestral, introducir API explícita de `effective host surface`; testear alpha/composition y CodeMirror node reuse.

## Fase 8: consolidación de tests

- [ ] Migrar aserciones útiles de `reading-real-dom.test.ts` a la suite basada en fixture capturado.
- [ ] Reemplazar la falsa “integración Obsidian” de `live-preview-extension-integration.test.ts` por una prueba que combine extensión real + fixture real, manteniendo la garantía de registro.
- [ ] Reescribir helpers de `live-preview-host.test.ts` y `live-preview-adversarial.test.ts` para usar fixtures compartidos.
- [ ] Ejecutar mutation/adversarial matrix: quitar clases, duplicarlas, conflictarlas, mover copy button, insertar wrappers, repetir scans, destruir view a mitad de schedule.
- [ ] No eliminar una prueba por resultar incómoda; solo consolidar después de demostrar cobertura equivalente o superior.

## Fase 9: documentación permanente y limpieza temporal

- [ ] Corregir `docs/theme-integration.md`, `packages/obsidian/README.md` y `CHANGELOG.md` con la arquitectura realmente implementada.
- [ ] Eliminar instrumentación `_tmp-*`, capturas sin sanitizar y todos los documentos de `.iterative/callout-host-fidelity/`.
- [ ] Verificar árbol completo: ningún requirements/analysis/plan/review temporal restante.

## Fase 10: validación final

- [ ] `npm ci` desde limpio.
- [ ] lint + typecheck + todos los tests.
- [ ] build + `pack:all` + artifact.
- [ ] instalar perfil `common` en `D:\Universidad\Clases` y probar matriz A/B/C/D con Nier.
- [ ] instalar perfil `mud` en `D:\Mud` y comprobar aislamiento/perfil.
- [ ] probar también tema Default para demostrar que la solución no es un parche Nier.
- [ ] PR CI verde, revisión adversarial final, squash merge y CI verde sobre `main`.

## Candidatos a eliminar durante la implementación

- `packages/obsidian/tests/reading-real-dom.test.ts`, después de migrar sus aserciones.
- `packages/obsidian/tests/live-preview-extension-integration.test.ts`, después de sustituir su garantía de wiring.

No se planea eliminar por completo `reading-host.ts`, `live-preview-host.ts` ni `contrast-manager.ts`.
