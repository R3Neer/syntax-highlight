# Revisión iterativa temporal de la implementación

Estado: TEMPORAL. Eliminar al terminar implementación + tests.

## Fase 0 · Instrumentación

### Revisión 1

Resultado: CAMBIOS NECESARIOS.

La primera instrumentación trazaba el fallback solo después de `collectUnprocessedRenderedCodeBlocks()`. Eso sesgaba la evidencia: un host con metadata `language-*` únicamente en `PRE` no llegaría a ser candidato y, por tanto, tampoco aparecería en la captura diagnóstica.

Corrección aplicada: la observación diagnóstica de host renderizado quedó separada del probe de producción. Ahora registra PRE-only, CODE-only, metadata equivalente/conflictiva y wrappers no previstos antes de que el código de producción filtre candidatos. Se añadió además `phase: observed|claimed` para distinguir estructura vista de estructura realmente reclamada.

### Revisión 2

Resultado: SIN CAMBIOS.

Revisión adversarial contra PRE-only, CODE-only, conflicto PRE/CODE, wrappers desconocidos, controles auxiliares, recreación de widgets, source visible y garantía de no mutación. No se encontró un cambio justificable antes de disponer de captura real.

### Revisión 3

Resultado: SIN CAMBIOS.

Se repitió la revisión después de CI completa verde, comprobando además que la instrumentación sigue inerte por defecto, que no cambia el criterio de claim y que los eventos de diagnóstico están limitados. No se encontraron cambios.

La instrumentación de Fase 0 queda ESTABLE por criterio TM: dos revisiones consecutivas sin cambios.

## Fase 0A · Bloqueo PowerShell descubierto en Obsidian real

La primera captura real reveló `TypeError: Cannot read properties of null (reading 'viewport')` al procesar PowerShell. La secuencia de diagnóstico mostró que `live-preview-source` alcanzaba PowerShell top-level y se interrumpía antes del siguiente PowerShell nested, mientras `reading-specialized` llegaba a reclamar ambos. El origen se aisló en el uso directo de `support.language.parser.parse(...)` sobre el `StreamLanguage` de PowerShell fuera de un `ParseContext` de CodeMirror.

Corrección implementada: `parseCommonLanguageTree()` mantiene `parser.parse()` para lenguajes Lezer ordinarios, pero ejecuta `StreamLanguage` mediante un `EditorState` real y `ensureSyntaxTree()`. Reading y Markdown editor consumen el mismo helper. Se añadió una regresión que hace fallar deliberadamente `parser.parse()` directo y exige que PowerShell siga generando árbol.

### Revisión 1

Resultado: CAMBIOS NECESARIOS.

La implementación de producción ya usaba el helper seguro en Reading y editor, pero `theme-compat.test.ts` seguía invocando `language.parser.parse()` directamente. Aunque no era una ruta del producto, conservaba una prueba engañosa capaz de validar una forma de uso incompatible con el host real.

Corrección aplicada: la suite de compatibilidad de tema pasa también por `parseCommonLanguageTree()`, de modo que las pruebas de PowerShell ejercitan la misma frontera que producción.

### Revisión 2

Resultado: SIN CAMBIOS.

Revisión adversarial de compatibilidad, coste y semántica: los parsers Lezer conservan su camino directo; solo `StreamLanguage` crea un `EditorState`; parserless Text no cambia; Reading y editor comparten helper; la regresión impide reintroducir la llamada directa para PowerShell. CI completa verde.

### Revisión 3

Resultado: SIN CAMBIOS.

Se revisó la cobertura funcional existente. `reading.test.ts` renderiza PowerShell por `renderCommonCode()` y comprueba sus clases semánticas; `plain-text-editor.test.ts` pasa PowerShell top-level y nested por `buildSyntaxDecorations()`, incluyendo el mapeo tras prefijos `>`. No se encontró una ruta de producción alternativa que eluda el helper ni una corrección adicional justificable.

La corrección de Fase 0A queda ESTABLE por criterio TM: dos revisiones consecutivas sin cambios y CI verde.

## Gate actual

Debe reinstalarse este build en Obsidian real y comprobar primero que PowerShell top-level/nested ya no produce el error `viewport` al cambiar de vista o archivo. Solo después se repite la matriz de captura de Fase 0. La captura inicial se conserva como evidencia del bloqueo, pero no se usará como fixture final porque quedó interrumpida por el crash.
