# Análisis temporal: integración real de bloques anidados

Estado: temporal. Debe borrarse al cerrar este ciclo iterativo.

## Evidencia actual
1. El fallback de Reading View exige `pre.children.length === 1`. El DOM real de Obsidian puede añadir UI auxiliar, especialmente `button.copy-code-button`, por lo que un bloque válido queda rechazado antes de llegar al renderer.
2. Los tests existentes codifican ese supuesto incorrecto al exigir que un `<pre>` con hijos auxiliares sea rechazado.
3. El camino de edición actual solo construye `Decoration.mark`/`Decoration.line` sobre offsets Markdown. En Live Preview, callouts y otros bloques renderizados pueden vivir dentro de widgets `.cm-embed-block`; las líneas fuente decoradas no son necesariamente el DOM visible.
4. Obsidian expone el DOM resultante de bloques renderizados desde `EditorView`, por lo que un bridge asociado al propio `EditorView` es un punto de integración más fiel que fingir que todos los callouts siguen siendo líneas normales.
5. El tema Nier usa reglas `HyperMD-codeblock*` y `!important`. Si el renderer del plugin no llega a ejecutarse, el contraste/theme bridge tampoco tiene oportunidad de corregir el aspecto.

## Qué se conserva
- `findCodeBlocks` y el modelo quote-aware.
- Mapeo lógico ↔ físico de cuerpos citados.
- Presentación Text/Markdown y grammar de modificadores.
- Renderers `renderCommonCode` / `renderSyntaxCode`.
- Processor especializado por fence.
- Fallback estructural de Reading View como concepto.
- Contrast manager general una vez el contenido entra realmente en nuestro DOM semántico.

## Candidatos a tirar o reemplazar
### A. `directCodeChild` estricto por número de hijos
Candidato fuerte a reemplazo. La unicidad de `<code>` directo importa; la unicidad de todos los hijos no. La función debe aceptar UI auxiliar y rechazar solo estructuras realmente ambiguas (cero o más de un `<code>` directo).

### B. Test que exige rechazar `<pre>` con botón auxiliar
Debe reemplazarse. Protege un comportamiento contrario al host real.

### C. Idea de que `buildSyntaxDecorations` basta para Live Preview anidado
No se debe borrar el highlighter de offsets, porque sigue siendo correcto y necesario para source/edición directa. Sí debe descartarse como única estrategia de integración para widgets renderizados.

### D. Fallback de Reading View completo
No se debe borrar. La estrategia es válida si el detector refleja el DOM real y sigue siendo idempotente/seguro.

### E. Contrast manager
No se debe tirar en este ciclo. Primero hay que garantizar que el renderer se ejecuta en ambos modos. Si tras eso quedan fallos de contraste con fondos no ancestrales, se abrirá una corrección específica apoyada en evidencia DOM real, no otra conjetura.

## Riesgos
- Mutar DOM dentro de CodeMirror puede provocar recreaciones; el bridge debe ser idempotente, scoped al `EditorView`, batched y capaz de reprocesar widgets recreados sin bucles.
- No debe procesar el propio DOM que genera Syntax Highlight.
- No debe destruir unknown fences ni UI fuera del bloque reconocido.
- Los tests deben verificar comportamiento tras inserción tardía y recreación, no solo un DOM estático construido antes del processor.
