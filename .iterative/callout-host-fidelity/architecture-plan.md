# Plan arquitectónico temporal: fidelidad de callouts/blockquotes

Estado: TEMPORAL. Eliminar al terminar implementación + tests.

## Objetivo arquitectónico

Separar cuatro responsabilidades que hoy se solapan: parsing de fuente Obsidian, resolución de fence, adaptación de DOM renderizado y decoración de fuente visible. Ninguna capa deberá conocer temas concretos ni asumir que una maqueta DOM hecha por nosotros representa al host.

## 0. Contrato con el host antes de cambiar producción

La implementación empezará con instrumentación temporal, no con un fix. Se capturará para un mismo bloque `text` y al menos un lenguaje parser-backed la ruta que realmente lo reclama y el DOM relevante en:

- top-level Reading;
- callout Reading;
- top-level Live Preview con cursor fuera y dentro;
- callout Live Preview con cursor fuera y dentro.

La captura registrará PRE/CODE classes/attributes, ancestros hasta la raíz de render, controles auxiliares, clases de las `.cm-line` fuente y si se invocó el `registerMarkdownCodeBlockProcessor` o el fallback. Los fixtures sanitizados de esa captura serán la fuente de verdad de los tests. Ningún selector o lifecycle nuevo se fija antes de esta fase.

## 1. Fuente Obsidian: parser compatible, mapper estable

`blocks.ts` seguirá siendo la fuente de verdad para localizar fenced blocks en Markdown del adaptador Obsidian. Antes de cambiar su algoritmo se construirá una tabla de comportamiento real con: una o varias líneas interiores sin `>`, blank lines, quoteDepth 1/2+, backticks/tildes, cierre con/sin prefijo, contenido posterior y un fence no relacionado. Se implementará la regla observada por Obsidian, no una aproximación “permisiva”.

El cuerpo lógico quitará el prefijo de quote cuando esté presente y conservará la línea completa cuando Obsidian la considere interior sin dicho prefijo. El modelo físico/lógico se ampliará solo con posiciones necesarias para opening/body/closing lines, para que `editor.ts` no vuelva a inferir límites.

## 2. Escritura canónica: Smart Editing

La compatibilidad host será de entrada; la escritura será canónica. Smart Editing recibirá contexto estructural suficiente (`quoteDepth` y/o prefijo canónico) para:

- Enter dentro de fenced block quoted: insertar la siguiente línea con el prefijo canónico de quote;
- Paste multilínea dentro del bloque: prefijar líneas nuevas que no lo traigan y no duplicar las ya correctamente prefijadas;
- conservar selecciones, CRLF/LF e indentación;
- no reescribir silenciosamente documentos antiguos al abrirlos.

## 3. Resolución semántica única

`renderResolvedFence()` seguirá siendo el único punto que decide common/configured/MUD y aplica presentación/badge/números. Reading, widget Live Preview y cualquier rescate DOM delegarán ahí. No duplicar política por modo.

## 4. Probe de code block renderizado, independiente del modo

Extraer de `reading-host.ts` un componente compartido, conceptualmente `rendered-code-host.ts`. Su contrato se derivará de los fixtures reales y deberá:

- localizar inequívocamente el PRE/CODE que representa un code block aunque la metadata de lenguaje viva en PRE, CODE o ambos;
- aceptar metadata equivalente y rechazar conflictos/múltiples lenguajes;
- preservar source exacto antes de mutar;
- ser idempotente;
- preservar controles auxiliares, identidad y listeners;
- fallar cerrado ante DOM ambiguo o unknown fences.

El experimento adversarial ya confirmó un blind spot actual: CODE-only se detecta, PRE-only no. Esto obliga a eliminar la dependencia exclusiva de `code.classList`, pero no autoriza todavía a asumir que PRE-only es exactamente el DOM del caso real.

## 5. Reading View: processor oficial + rescate lifecycle-aware solo si hace falta

Conservar `registerMarkdownCodeBlockProcessor` como camino oficial. La evidencia pública demuestra que Obsidian puede invocarlo dentro de callouts, por lo que no se sustituirá por un parser DOM paralelo sin necesidad.

La instrumentación de fase 0 determinará por qué el caso real no llega al renderer. El fallback seguirá siendo secundario y usará el probe compartido. Si el DOM ya está completo durante el postprocessor, seguirá one-shot. Si la captura muestra clasificación/render tardío, el fallback ganará un observer limitado al render child/context y ligado al lifecycle de Obsidian. No habrá observer global de `document.body` para descubrir code blocks.

## 6. Live Preview renderizado: lifecycle adapter fino

`live-preview-host.ts` dejará de poseer reglas de detección semántica. Mantendrá únicamente lifecycle del `EditorView`, delimitación del ámbito renderizado y batching de mutaciones; probe/claim/render serán compartidos con Reading.

`.cm-embed-block` se mantendrá como frontera solo si los fixtures reales confirman que es estable en la versión objetivo. Si el host usa otra envoltura, el scope se formulará por estructura observada y siempre dentro de `view.dom`, nunca como búsqueda global.

## 7. Live Preview con fuente visible: surface adapter

La captura del caso con `>` ya demuestra que tokens/presentation y superficie son responsabilidades distintas: el centrado entra, pero la superficie top-level no.

`editor.ts` conservará tokens/presentation y añadirá una capa independiente de `block surface decoration` para opening/body/closing lines anidadas cuando esas líneas son el DOM visible. Antes de elegir clases se comparará la clase efectiva de una línea top-level equivalente con una anidada.

La primera opción será reutilizar las clases host que el tema ya reconoce solo si un test adversarial demuestra que añadirlas es puramente presentacional y no dispara comportamiento/editor semantics inesperado. Si no es seguro, se usará una clase propia puenteada a variables semánticas de Obsidian. No se copiarán colores ni selectores de Nier.

Text/Markdown conservarán “sin furniture” del plugin: surface no significa badge ni números.

## 8. Contraste

`contrast-manager.ts` no se modifica por anticipación. Primero se hará que nested render/source use la misma superficie efectiva que top-level. Después se probará contraste sobre el fixture/estilo real. Solo si el fondo sigue viviendo fuera de la cadena de ancestros se introducirá una abstracción explícita de background host; no se añadirá una heurística de hermanos a ciegas.

## 9. Tests adversariales

Los nuevos fixtures deberán representar host capturado, y las suites probarán como mínimo:

- PRE-only, CODE-only, ambos equivalentes y conflicto PRE/CODE;
- copy button y controles arbitrarios conservando listeners;
- unknown/ambiguous untouched;
- Text/Markdown modifiers, PowerShell, configured TOML y MUD profile isolation;
- quoteDepth 1/2+, body con prefijo completo/parcial/ausente según matriz Obsidian;
- CRLF/LF, blank lines, tildes y fences largos;
- clasificación tardía, widget recreation y procesamiento repetido;
- transición cursor fuera/dentro del code block;
- source surface parity top-level/anidado;
- theme cascade y contraste sin branch por nombre de tema.

Los tests que pretenden cruzar la frontera Obsidian no se llamarán “real DOM” salvo que su fixture venga de captura real documentada.

## 10. Candidatos de consolidación/eliminación

- `packages/obsidian/tests/reading-real-dom.test.ts`: candidato a eliminación tras migrar sus aserciones únicas (presentación + identidad del copy node) a la suite de fixtures capturados. Su nombre actual sobreafirma lo que prueba.
- `packages/obsidian/tests/live-preview-extension-integration.test.ts`: candidato a reemplazo; no eliminar hasta que otra prueba mantenga la garantía de que `createMarkdownEditorExtensions` instala el lifecycle adapter.
- `packages/obsidian/src/reading-host.ts`: conservar como adapter Reading; mover solo el probe genérico.
- `packages/obsidian/src/live-preview-host.ts`: conservar como adapter lifecycle LP; simplificar después de mover probe.
- `packages/obsidian/tests/live-preview-host.test.ts` y `live-preview-adversarial.test.ts`: conservar; sustituir helpers inventados por shared fixtures y mantener casos adversariales.
- `docs/theme-integration.md`: conservar y corregir afirmaciones sobre “real DOM” tras la implementación.

No hay hoy un source file completo que pueda borrarse sin sustitución simultánea. Una futura fusión de adapters solo se aceptará si reduce responsabilidades sin perder lifecycle específico de Reading/LP.

## 11. Orden futuro de implementación

1. Instrumentación temporal + captura host real + matriz de semántica Obsidian.
2. Convertir capturas en fixtures/test oracles antes de tocar producción.
3. Parser Obsidian-compatible + mapping del bloque completo.
4. Smart Editing canónico.
5. Probe renderizado compartido.
6. Reading fallback/lifecycle según evidencia.
7. LP rendered lifecycle adapter.
8. Source surface adapter.
9. Contraste solo si un test real lo exige.
10. Migración/consolidación de tests y docs permanentes.
11. CI completa + prueba manual A/B en `clases` con Nier/common y `Mud` con perfil mud.
