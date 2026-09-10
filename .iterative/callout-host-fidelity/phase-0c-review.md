# Revisión temporal · Fase 0C / surface parity

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

## Evidencia real de entrada

La validación manual posterior a Fase 0B confirmó que el workaround `is-loaded` evita la reclasificación tardía del PRE: el nested renderizado conserva `PRE.syntax-highlight-block.has-line-numbers` sin `language-powershell`, mientras CODE conserva `language-powershell is-loaded`. Reading View vuelve a ser estable.

Quedan dos divergencias visibles al activar source en Live Preview:

1. el source de un fence quoted no hereda la superficie de code block top-level; Obsidian lo presenta como fragmentos tipo inline-code dentro del blockquote/callout y no conserva la presentación esperada;
2. PowerShell conserva variable/número/operador, pero `Write-Host` no recibe la semántica builtin/callable que el modo legacy emite.

## RED tests

Se añadieron `powershell-semantic-bridge.test.ts` y `live-preview-source-surface.test.ts` antes de producción.

La primera ejecución demostró que `$foo`, `42` y `=` ya tenían semántica distinta, pero `Write-Host` se degradaba a `syntax-common-variable token variable` y no generaba `cm-builtin`. El test de surface confirmó que quoted source no recibía ninguna decoration de superficie, mientras top-level no tenía duplicación de superficie por parte del plugin.

## Implementación

- `common-languages.ts`: `tags.standard(tags.variableName)` se mapea explícitamente a `syntax-common-callable token builtin / cm-builtin`. Esto conserva la semántica que `StreamLanguage` asigna al token legacy `builtin` y no introduce una excepción por nombre de lenguaje.
- `blocks.ts`: `MudCodeBlock` conserva rangos físicos de opening y closing para poder decorar superficie sin adivinar posiciones ni absorber contenido exterior.
- `editor.ts`: todos los fences reconocidos con `quoteDepth > 0` reciben una capa de superficie separada de syntax/presentation. Se reutiliza el contrato host `HyperMD-codeblock` con `begin-bg`, `bg` y `end-bg`; top-level no recibe estas clases para no duplicar las que ya proporciona Obsidian.
- No se hardcodea fondo negro ni nombre de tema. Nier puede seguir aplicando su fondo negro mediante las clases host; otros temas conservan su propia presentación.

## Revisión TM 1

Resultado: CAMBIOS NECESARIOS.

La primera revisión detectó que los tests comprobaban solo el `DecorationSet` y no demostraban cómo CodeMirror fusionaba varias `Decoration.line` sobre un `EditorView` real. Se añadieron pruebas de integración para PowerShell quoted y Text presentacional quoted.

La primera versión del test de integración buscaba líneas por texto visible y confundió opening/cierre; la siguiente no contemplaba que el widget de número de línea modifica `textContent`. Se corrigió el test para localizar cada línea por posición documental mediante `EditorView.domAtPos()`. Con ello se comprueba la relación fuente↔DOM en vez de furniture incidental.

## Revisión TM 2

Resultado: SIN CAMBIOS.

Revisión adversarial de alcance: surface solo para `quoteDepth > 0`; depth 2+ usa el mismo contrato; un fence sin cierre no inventa `end-bg`; top-level queda sin decorations de surface del plugin; Text/Markdown pueden combinar presentation y surface en la misma línea; MUD configurado pasa por `createMarkdownEditorExtensions`; `$foo` sigue siendo variable y `Write-Host` es builtin/callable. La integración en `EditorView` confirma combinación de clases.

## Revisión TM 3

Resultado: SIN CAMBIOS.

Revisión de independencia temática y responsabilidades: no hay nombres de Nier, colores hardcodeados ni branches por callout. Se reutiliza un contrato de clases del host y se mantienen simultáneamente clases semánticas propias y compatibilidad `cm-*`/`token *`. No se encontró otra corrección justificable antes de validar el resultado en Obsidian real.

La implementación queda ESTABLE por criterio TM: dos revisiones consecutivas sin cambios y CI completa verde (`lint`, `typecheck`, tests, build, `pack:all`, artifact).

## Gate

Debe validarse este build en Obsidian real con la misma nota PowerShell, al menos cursor dentro del nested quoted y cursor fuera. Criterios:

- nested source debe recuperar la superficie de code block que el tema aplica al top-level; en Nier debe ser negra sin hardcode del plugin;
- `Write-Host` debe adquirir color builtin/callable tanto rendered como source;
- `$foo`, `42` y `=` deben seguir diferenciados;
- las clases de presentation de Text/Markdown deben coexistir con la superficie quoted;
- si persisten fondos individuales de inline-code dentro de la superficie recuperada, no ocultarlos globalmente: capturar el DOM real y corregirlos solo bajo `syntax-quoted-code-source`.
