# Plan arquitectónico temporal: fidelidad de callouts/blockquotes

Estado: TEMPORAL. Eliminar al terminar implementación + tests.

## Objetivo arquitectónico

Separar cuatro responsabilidades que hoy se solapan: parsing de fuente Obsidian, resolución de fence, adaptación de DOM renderizado y decoración de fuente visible. Ninguna capa deberá conocer temas concretos.

## 1. Fuente Obsidian: parser compatible, mapper estable

`blocks.ts` seguirá siendo la fuente de verdad para localizar fenced blocks en Markdown del adaptador Obsidian. Se cambiará la política de continuidad de un fence abierto dentro de quoteDepth > 0: las líneas interiores podrán omitir parte o todo el prefijo `>` si Obsidian mantiene el bloque dentro del callout. Al construir el cuerpo lógico se quitará el prefijo cuando exista y se conservará la línea completa cuando no exista. El cierre deberá respetar fence char/longitud y el contexto de quote que Obsidian use como cierre.

El modelo físico/lógico se ampliará solo con datos necesarios para decorar el bloque completo, incluidos opening/body/closing lines, evitando volver a parsear posiciones en `editor.ts`.

## 2. Escritura canónica: Smart Editing

La compatibilidad permisiva será solo de entrada. Smart Editing recibirá contexto estructural suficiente (`quoteDepth`/prefijo canónico) para:
- Enter dentro de fenced block quoted: insertar la siguiente línea con el prefijo canónico de quote.
- Paste multilínea dentro del bloque: prefijar líneas nuevas que no lo traigan y no duplicar las ya correctamente prefijadas.
- No reescribir silenciosamente documentos antiguos al abrirlos.

## 3. Resolución semántica única

`renderResolvedFence()` seguirá siendo el único punto que decide common/configured/MUD y aplica presentación/badge/números. Reading, widget Live Preview y cualquier rescate DOM deberán delegar ahí. No duplicar lógica por host path.

## 4. Probe de code block renderizado, independiente del modo

Extraer de `reading-host.ts` un componente compartido de host renderizado, conceptualmente `rendered-code-host.ts`, con:
- localización de un único CODE estructural dentro de PRE;
- extracción de `language-*` desde PRE y CODE;
- aceptación de metadata presente en uno u otro o equivalente en ambos;
- rechazo fail-closed de lenguajes incompatibles/múltiples;
- snapshot de source antes de mutar;
- marca idempotente;
- preservación de controles auxiliares y listeners.

No fijar reglas finales hasta capturar DOM real de Obsidian. Los fixtures de esa captura serán la referencia de los tests de host.

## 5. Reading View: processor oficial + bridge de rescate con lifecycle

Conservar `registerMarkdownCodeBlockProcessor` como camino oficial/primario. El fallback seguirá siendo secundario, pero pasará a usar el probe compartido y deberá soportar metadata/clasificación tardía dentro del subtree de render. Si la captura real demuestra que el postprocessor one-shot basta, no añadir observer. Si demuestra mutaciones tardías, usar un observer scoped al render child/context y disponerlo con lifecycle de Obsidian; nunca observer global permanente por nota.

El fallback no reclamará unknown fences y no deberá reprocesar output del processor primario.

## 6. Live Preview renderizado: bridge fino sobre el mismo probe

`live-preview-host.ts` dejará de poseer reglas de detección propias. Mantendrá únicamente lifecycle del `EditorView`, selección del ámbito de widgets renderizados y scheduling de mutaciones. El probe/claim/render será compartido con Reading.

El scope inicial seguirá siendo el subtree del `EditorView`; `.cm-embed-block` solo se conservará como frontera si la captura real confirma que sigue siendo la señal correcta. No convertir selectores históricos en contrato por fe.

## 7. Live Preview con fuente visible: surface decorations

`editor.ts` seguirá generando tokens/presentation sobre offsets físicos, pero añadirá una capa independiente de `block surface decoration` para las líneas opening/body/closing de fenced blocks anidados que Obsidian deja en modo fuente.

La surface decoration debe hacer que el tema activo las reconozca como un code block top-level. Preferencia arquitectónica: reutilizar las clases semánticas/host de CodeMirror que Obsidian ya aplica a code blocks, solo si la captura real confirma cuáles son y que añadirlas no altera parsing ni comportamiento. Fallback: una clase propia que use variables semánticas de Obsidian, nunca colores Nier hardcoded.

Text/Markdown conservarán su política de “sin furniture” del plugin; surface significa superficie visual/editorial, no badge ni números.

## 8. Contraste

No modificar `contrast-manager.ts` por anticipación. Primero hacer que nested source/rendered entre en la misma estructura/clases que top-level. Añadir test con fondo real capturado. Solo si el fondo efectivo queda en una capa no ancestral después de la integración, extender el cálculo de superficie con una abstracción explícita del host.

## 9. Estrategia de test

Crear una matriz de fixtures capturados, no inventados:
A top-level Reading; B callout Reading; C top-level Live Preview source/rendered; D callout Live Preview source/rendered.

Sobre esa matriz ejecutar tests adversariales de: PRE-only/CODE-only/both, conflictos, copy UI, unknown fence, modifiers Text/Markdown, PowerShell, configured TOML, MUD profile isolation, nested quotes, missing quote body prefixes, delayed classification, widget recreation, cursor/source transition, repeated processing y theme surface/contrast.

## 10. Candidatos de consolidación/eliminación

- `packages/obsidian/tests/reading-real-dom.test.ts`: eliminar después de migrar sus únicas aserciones útiles a la nueva suite de fixtures reales.
- `packages/obsidian/tests/live-preview-extension-integration.test.ts`: reemplazar por integración de extensión con fixture host capturado; eliminar el archivo viejo solo cuando la nueva suite cubra el hecho de que `createMarkdownEditorExtensions` instala el bridge.
- `packages/obsidian/src/reading-host.ts`: conservar como adapter Reading; mover únicamente el probe genérico fuera.
- `packages/obsidian/src/live-preview-host.ts`: conservar como lifecycle adapter LP; simplificar tras mover probe.
- `packages/obsidian/tests/live-preview-host.test.ts` y `live-preview-adversarial.test.ts`: conservar pero sustituir helpers inventados por shared fixtures.

No hay hoy ningún source file completo que pueda borrarse sin sustitución simultánea.

## 11. Orden de implementación futuro

1. Captura host real + fixtures.
2. Parser Obsidian-compatible + mapping del bloque completo.
3. Smart Editing canónico.
4. Probe renderizado compartido.
5. Reading fallback/lifecycle.
6. LP widget bridge.
7. Source surface decorations.
8. Contraste solo si lo exige la evidencia.
9. Migración/consolidación de tests y docs permanentes.
10. CI + prueba manual en `clases` con Nier y perfil common, y en `Mud` con perfil mud.
