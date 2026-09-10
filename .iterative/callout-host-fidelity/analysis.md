# Análisis temporal: bloques anidados en Obsidian

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

## Evidencia observada

- Top-level `text` funciona en Reading y edición.
- Dentro de `[!task]`, añadir `>` a la línea de contenido solo recupera la alineación en edición. Reading sigue mostrando el PRE nativo negro de Nier y edición no recupera la superficie de code block top-level.
- Por tanto, el prefijo `>` ausente era un defecto de fuente, pero no la causa principal del fallo de integración.
- Nier explica el síntoma negro cuando un `PRE` recibe una clase `language-*`: estiliza `pre[class*=language-]` con fondo negro y `color: var(--text-normal)`.

## Hipótesis y estado

### H1: instalación/plugin viejo
DESCARTADA. El mismo plugin procesa Text top-level y, tras añadir `>`, sus decorations de presentación centran la línea anidada. Código nuevo está activo.

### H2: el `>` ausente es la causa raíz
DESCARTADA como causa raíz. Es un problema de compatibilidad de entrada y Smart Editing, pero el caso canónico con `>` sigue fallando en Reading y parcialmente en edición.

### H3: Nier es la causa raíz
DESCARTADA. Nier amplifica el fallo y permite reconocer la clase tardía en PRE. Top-level funciona con el mismo tema. No se debe parchear Nier.

### H4: Reading/LP rendered no entra en nuestro renderer para el bloque anidado
DESCARTADA por captura real instrumentada. El processor especializado reclama y termina de renderizar PowerShell dentro de `.cm-embed-block.cm-callout`.

La captura real demuestra la secuencia exacta:

1. `reading-specialized / claimed` sobre `DIV.block-language-powershell` dentro de `callout-content`.
2. `reading-specialized / rendered` con `PRE.syntax-highlight-block.has-line-numbers` y `CODE.language-powershell`.
3. Inmediatamente después, `reading-fallback / observed` ve el mismo subtree mutado a `PRE.syntax-highlight-block.has-line-numbers.language-powershell` y `CODE.language-powershell.is-loaded`.

Por tanto, la divergencia negra nested ocurre **después** de nuestro render. Obsidian vuelve a ejecutar su highlighter nativo sobre el `CODE.language-*` generado por Syntax Highlight, marca `CODE.is-loaded` y propaga `language-*` al PRE. En Nier esa clase tardía activa la superficie negra. La pérdida visual de separación de líneas aparece en el mismo estado postmutación.

Subhipótesis H4a: el detector fallback es demasiado estrecho. CONFIRMADA como defecto real independiente. Solo extrae `language-*` desde `CODE`. Experimento temporal en CI: control con clase en CODE pasó; PRE-only falló en Reading y Live Preview. El detector compartido sigue siendo necesario para hosts nativos no procesados.

Subhipótesis H4b: el fallback de Reading puede perder clasificación tardía. ABIERTA pero ya no explica el caso canónico capturado: el processor especializado sí reclama ese bloque antes de la mutación tardía.

### H5: el bridge de widget de Live Preview arregla por sí solo el estado de edición mostrado
DESCARTADA. Live Preview alterna entre fuente y widgets renderizados según cursor. Las tres capturas reales muestran top-level y callout alternando de forma independiente: cursor dentro de top-level revela sus líneas fuente mientras el callout queda renderizado; cursor dentro del callout hace lo contrario; cursor fuera deja ambos renderizados.

### H6: las decorations de fuente anidadas son incompletas
CONFIRMADA. Cuando el callout está en estado fuente, conserva quote/fence lines y no obtiene la misma surface de bloque top-level. Este problema es distinto de la mutación post-render.

### H7: nuestros tests llamados “realistic/real DOM” representan el host real
DESCARTADA. Construyen manualmente `.cm-embed-block.cm-callout` y asignan `language-*` tanto a PRE como a CODE. Verifican nuestro modelo supuesto, no un DOM capturado de Obsidian.

## Hipótesis de trabajo consolidada

Hay cuatro fronteras desacopladas:

1. **Semántica de fuente del adaptador**: aceptar el dialecto efectivo de Obsidian para fenced blocks dentro de blockquotes/callouts, conservando mapeo físico/lógico, mientras Smart Editing escribe la forma canónica con `>`.
2. **Host renderizado nativo no reclamado**: el detector/lifecycle de Reading y widgets LP debe resolver metadata desde PRE y/o CODE, fallar ante conflictos y tolerar clasificación/recreación tardía sin duplicar procesamiento.
3. **Host ya reclamado por Syntax Highlight**: el DOM producido por nuestro renderer debe declararse ya procesado al highlighter nativo de Obsidian para impedir el segundo pase que añade `language-*` al PRE.
4. **Host fuente visible**: cuando Obsidian enseña las líneas Markdown quoted, necesitamos una decoration de superficie de code block además de tokens/presentación.

## Captura real inicial: bloqueo PowerShell

La primera captura instrumentada reveló `TypeError: Cannot read properties of null (reading 'viewport')` al procesar PowerShell porque `StreamLanguage` se ejecutaba mediante `parser.parse(...)` directo fuera de un `ParseContext`. Se corrigió con `parseCommonLanguageTree()`, que usa `EditorState`/`ensureSyntaxTree()` para `StreamLanguage` y mantiene el camino directo para parsers Lezer. Reading y editor comparten ahora esa frontera y CI la cubre.

## Captura real posterior: lifecycle de Live Preview nested

La segunda captura, ya sin crash, confirma:

- El processor especializado de Obsidian se ejecuta también dentro del callout renderizado de Live Preview.
- Nuestro renderer termina y produce badge, líneas y tokens.
- El highlighter nativo vuelve a tocar después el subtree nested y añade `is-loaded` al CODE y `language-powershell` al PRE.
- El top-level y el callout cambian entre source/rendered según la posición del cursor, por lo que cualquier solución debe ser idempotente durante recreaciones de widgets.

La siguiente hipótesis mínima a probar es emitir `is-loaded` desde nuestro renderer junto a `language-*`, sin tocar PRE. Si el host usa esa marca para reconocer contenido ya resaltado, evitará el segundo pase sin renunciar a las clases compatibles con temas. Debe validarse con test adversarial y luego en Obsidian real; si el host sigue mutando PRE, se descarta y se vuelve a análisis.

## Candidatos a eliminación detectados

- `reading-real-dom.test.ts`: nombre engañoso y fixture inventado; candidato a consolidación/eliminación solo si sus aserciones de copy-node/presentación se migran primero a una suite basada en fixture capturado.
- `live-preview-extension-integration.test.ts`: no es integración con Obsidian, sino un EditorView al que el test inserta manualmente un widget supuesto. Candidato a reemplazo, no eliminación inmediata, porque verifica que la extensión queda realmente registrada.
- `live-preview-host.ts` y `reading-host.ts`: NO sobran. Pueden converger parcialmente en un bridge común, pero hoy contienen responsabilidades necesarias. No deben borrarse antes de moverlas.
- `contrast-manager.ts`: NO es la causa raíz; conservar. Solo revisar si la superficie fuente real demuestra un fondo no ancestral.
