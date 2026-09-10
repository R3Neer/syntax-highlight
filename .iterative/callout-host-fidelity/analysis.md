# Análisis temporal: bloques anidados en Obsidian

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

## Evidencia observada

- Top-level `text` funciona en Reading y edición.
- Dentro de `[!task]`, añadir `>` a la línea de contenido solo recupera la alineación en edición. Reading sigue mostrando el PRE nativo negro de Nier y edición no recupera la superficie de code block top-level.
- Por tanto, el prefijo `>` ausente era un defecto de fuente, pero no la causa principal del fallo de integración.
- Nier explica el síntoma negro: estiliza `pre[class*=language-]` con fondo negro y `color: var(--text-normal)`. Si nuestro renderer hubiera reclamado el bloque, el PRE generado sería `syntax-highlight-block`, no `language-*`.

## Hipótesis y estado

### H1: instalación/plugin viejo
DESCARTADA. El mismo plugin procesa Text top-level y, tras añadir `>`, sus decorations de presentación centran la línea anidada. Código nuevo está activo.

### H2: el `>` ausente es la causa raíz
DESCARTADA como causa raíz. Es un problema de compatibilidad de entrada y Smart Editing, pero el caso canónico con `>` sigue fallando en Reading y parcialmente en edición.

### H3: Nier es la causa raíz
DESCARTADA. Nier amplifica el fallo y permite reconocer que el bloque sigue nativo. Top-level funciona con el mismo tema. No se debe parchear Nier.

### H4: Reading View no entra en nuestro renderer para el bloque anidado
CONFIRMADA por salida visual y estructura de nuestro renderer. Un Text procesado tendría frame presentacional, no badge/números y PRE sin clase `language-*`; la captura conserva el aspecto nativo que activa las reglas negras de Nier.

Subhipótesis H4a: el detector fallback es demasiado estrecho. CONFIRMADA como defecto real. Solo extrae `language-*` desde `CODE`. Experimento temporal en CI: control con clase en CODE pasó; PRE-only falló en Reading y Live Preview. Resultado: 227 tests pasaron y las 2 aserciones diseñadas para exponer este blind spot fallaron. El test temporal ya fue eliminado.

Subhipótesis H4b: el fallback de Reading puede perder clasificación tardía. ABIERTA pero plausible. Es un postprocessor one-shot, a diferencia del bridge de Live Preview que observa mutaciones. El plan no debe depender de que la clase exista en un único instante.

### H5: el bridge de widget de Live Preview arregla el estado de edición mostrado
DESCARTADA. Cuando el cursor activa el callout/code block, Obsidian muestra líneas fuente, no necesariamente un `.cm-embed-block` procesable. El bridge solo observa widgets renderizados.

### H6: las decorations de fuente anidadas son incompletas
CONFIRMADA. `addPresentationLineRanges()` añade únicamente clases `syntax-presentational/...`; los spans reciben syntax classes, pero no hay una capa que restituya la superficie visual de code block que el tema aplica a líneas top-level. La captura con `>` es el experimento real: centrado sí, superficie de bloque no.

### H7: nuestros tests llamados “realistic/real DOM” representan el host real
DESCARTADA. Construyen manualmente `.cm-embed-block.cm-callout` y asignan `language-*` tanto a PRE como a CODE. Verifican nuestro modelo supuesto, no un DOM capturado de Obsidian.

## Hipótesis de trabajo consolidada

No hay un único bug. Hay tres fronteras desacopladas que deben corregirse:

1. **Semántica de fuente del adaptador**: aceptar el dialecto efectivo de Obsidian para fenced blocks dentro de blockquotes/callouts, conservando mapeo físico/lógico, mientras Smart Editing escribe la forma canónica con `>`.
2. **Host renderizado**: el detector/lifecycle de Reading y widgets LP está basado en una forma DOM adivinada. Debe resolver metadata desde PRE y/o CODE, fallar ante conflictos y tolerar clasificación/recreación tardía sin duplicar procesamiento.
3. **Host fuente visible**: cuando Obsidian enseña las líneas Markdown del block quoted, necesitamos una decoration de superficie de code block además de tokens/presentación, de modo que el tema activo trate esas líneas como trata un code block top-level.

## Experimentos pendientes antes de fijar selectores de producción

La conexión al PC no está disponible ahora, así que no se puede capturar DOM vivo desde DevTools en esta fase. El primer paso de implementación deberá capturar una matriz real A/B/C/D: Text top-level y Text en callout, en Reading y Live Preview con cursor dentro/fuera. Hasta esa captura, ningún selector nuevo se considerará definitivo.

La evidencia pública sí respalda que `registerMarkdownCodeBlockProcessor` puede ejecutarse dentro de callouts y que Live Preview alterna entre fuente y contenido procesado. Por ello no se elimina el processor oficial ni se sustituye por un parser DOM global.

## Candidatos a eliminación detectados

- `reading-real-dom.test.ts`: nombre engañoso y fixture inventado; candidato a consolidación/eliminación solo si sus aserciones de copy-node/presentación se migran primero a una suite basada en fixture capturado.
- `live-preview-extension-integration.test.ts`: no es integración con Obsidian, sino un EditorView al que el test inserta manualmente un widget supuesto. Candidato a reemplazo, no eliminación inmediata, porque verifica que la extensión queda realmente registrada.
- `live-preview-host.ts` y `reading-host.ts`: NO sobran. Pueden converger parcialmente en un bridge común, pero hoy contienen responsabilidades necesarias. No deben borrarse antes de moverlas.
- `contrast-manager.ts`: NO es la causa raíz; conservar. Solo revisar si la superficie fuente real demuestra un fondo no ancestral.
