# Análisis temporal · Fase 3 · hipótesis `visibleRanges`

Estado: **ABORTADO / FALSADO**. TEMPORAL. Conservar hasta la resolución definitiva y limpieza final.

## Evidencia real previa

La captura diferida con foco dentro del PowerShell quoted demostró:

- `hasFocus: true` en el `EditorView` exterior ya registrado;
- selección dentro del mismo documento;
- opening/body/closing quoted presentes como líneas documentales reales;
- el quoted editado desaparece de `embeddedHosts` mientras otros bloques rendered permanecen allí.

Conclusión firme: **quoted source pertenece al mismo EditorView exterior**. No existe un editor interno alternativo que explique el fallo.

También se observa visualmente:

- marks `syntax-common-*` sí aparecen y colorean PowerShell/Bash;
- line numbers sí aparecen;
- la surface negra continua y la presentation de línea no aparecen como deberían.

## Hipótesis de Fase 3

Se propuso que `lineFrom` quedaba fuera de `view.visibleRanges` porque Live Preview ocultaba/reemplazaba el prefijo Markdown `> `, mientras `sourceFrom` seguía visible.

Eso habría explicado:

- semantic marks presentes después del `>`;
- line-number widgets presentes en `sourceFrom`;
- `Decoration.line` omitida por el filtro histórico `positionIsVisible(line.from, visibleRanges)`.

La implementación experimental separó `viewport` y `visibleRanges` y añadió un modelo de visibility probe por línea.

## Falsación mediante CodeMirror real de test

Se creó una extensión adversarial **directa** con `StateField<DecorationSet>` + `Decoration.replace`, precisamente para que los replacements participasen en el cálculo de visibilidad antes de las decorations indirectas del ViewPlugin.

Resultados:

1. ocultar `> ` (1–2 caracteres) **NO** sacó `lineFrom` de `view.visibleRanges`;
2. reemplazar una quoted body line corta completa tampoco produjo el comportamiento negativo esperado;
3. el test puro del helper pasaba, pero el `EditorView` real de CodeMirror demostraba que la premisa que justificaba ese helper no representaba al host.

## Explicación en CodeMirror

La implementación oficial de CodeMirror calcula los rangos visibles mediante un `RangeSet.spans` con un umbral mínimo de tamaño para point/replacement decorations. Los replacements pequeños no necesariamente alteran `visibleRanges`.

Consecuencia: un prefijo quoted de 1–2 caracteres no puede sostener la hipótesis de que `lineFrom` desaparece de `visibleRanges` solo por ser reemplazado/ocultado.

No se modifica el test para ocultar artificialmente >20 caracteres: eso demostraría un escenario distinto del problema real y produciría una victoria ficticia.

## Decisión TM

Fase 3 queda abortada antes del gate:

- implementación específica revertida;
- tests específicos de la hipótesis retirados;
- documentos temporales conservados como historial de falsación;
- producción vuelve al baseline funcional de Fase 2.

## Pregunta causal siguiente

Con H2 (editor interno) descartada y la hipótesis `visibleRanges` falsada, quedan dos familias principales:

### H4-A · la line decoration SÍ llega al `.cm-line`, pero la cascada/host neutraliza visualmente su surface

Predicción en captura enfocada:

- `line.element.classes` contiene `syntax-editor-code-source` y su rol opening/body/closing;
- `backgroundColor` computado no es negro o viene de una regla más específica/estructura host;
- presentation classes pueden estar presentes aunque `text-align` final no corresponda.

### H4-B · la line decoration NO llega al DOM final aunque el ViewPlugin la calcule

Predicción:

- semantic descendants contienen `syntax-common-*`;
- `.cm-line` enfocada carece de `syntax-editor-code-source` / `syntax-presentational`;
- entonces el problema es composición/precedencia/materialización de line decorations, no CSS.

Estas dos ramas requieren arquitecturas diferentes. No se autoriza un nuevo plan de implementación hasta discriminar H4-A vs H4-B con una captura enfocada del DOM final.

## Evidencia mínima necesaria

Usar la captura diferida enfocada existente (o repetirla si se perdió) y extraer por cada línea quoted:

- `documentLine`, `documentText`, `role`;
- `line.element.classes`;
- `line.element.style.backgroundColor`, `color`, `textAlign`;
- descendants con `tag`, `classes`, `text`, `backgroundColor`, `color`.

La clave es observar las clases reales de `.cm-line` **mientras `hasFocus === true`**.

## Prohibiciones mantenidas

Hasta nueva evidencia no usar:

- DOM mutation;
- private selectors (`.cm-embed-block`, `HyperMD-*`) en producción;
- `!important` como parche;
- editor interno inventado;
- otro cambio basado únicamente en una simulación que no reproduzca primero la propiedad causal del host.
