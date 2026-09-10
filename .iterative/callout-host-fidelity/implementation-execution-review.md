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

La corrección de Fase 0A queda ESTABLE por criterio TM: dos revisiones consecutivas sin cambios y CI verde. La verificación posterior en Obsidian real confirmó además que el crash `viewport` desapareció durante las transiciones top-level/callout y cursor dentro/fuera.

## Fase 0B · Diagnóstico post-render y mutación tardía del host

La verificación manual posterior mostró una nueva divergencia visual: el PowerShell top-level y el nested podían alternar correctamente entre source/rendered, pero el nested renderizado quedaba negro y con las líneas degradadas.

La instrumentación `phase: rendered` resolvió la ambigüedad. La captura real mostró:

1. `reading-specialized / claimed` dentro de `.cm-embed-block.cm-callout`.
2. `reading-specialized / rendered` con `PRE.syntax-highlight-block.has-line-numbers` y `CODE.language-powershell`.
3. Un `reading-fallback / observed` inmediatamente posterior sobre el mismo output, ahora con `PRE.syntax-highlight-block.has-line-numbers.language-powershell` y `CODE.language-powershell.is-loaded`.

Conclusión: nuestro renderer sí termina; Obsidian vuelve a ejecutar después su highlighter nativo sobre el CODE y propaga `language-*` al PRE. Nier solo hace visible el problema porque estiliza ese PRE recién reclasificado.

Corrección implementada: el renderer compartido conserva `language-*` en CODE para compatibilidad temática, pero lo emite ya con `is-loaded`. PRE sigue sin `language-*`. Una regresión adversarial reproduce el segundo pase observado y exige que no pueda reclasificar el PRE. La cobertura incluye PowerShell, Text/Markdown, perfiles configurados y MUD.

El primer CI tras cambiar producción falló únicamente porque seis tests de Reading exigían igualdad exacta de `className`; todos los demás tests, incluida la nueva regresión, pasaron. Se corrigieron esas aserciones para comprobar presencia semántica de `language-*` en lugar de impedir la marca host `is-loaded`. El CI posterior quedó completamente verde, incluyendo `npm run check`, `pack:all` y artifact.

### Revisión 1

Resultado: SIN CAMBIOS.

Revisión contra la evidencia real y compatibilidad temática: la solución no añade `language-*` al PRE, mantiene el scope Prism-compatible en CODE, usa exactamente la marca que el propio host añadió al finalizar su pase nativo y se aplica en el renderer compartido, no mediante excepciones PowerShell/Nier. Los tests actualizados conservan las garantías de lenguaje/badge/tokens.

### Revisión 2

Resultado: SIN CAMBIOS.

Revisión de lifecycle e idempotencia: `collectUnprocessedRenderedCodeBlocks()` excluye output bajo `.syntax-highlight-frame` o hosts ya marcados, por lo que `is-loaded` no introduce auto-claim. Los widgets recreados reciben output nuevo ya marcado; Reading fallback y Live Preview mantienen aislamiento y batching previos. No se encontró una corrección adicional justificable antes de validar la semántica real de `is-loaded` en Obsidian.

La implementación de Fase 0B queda ESTABLE por criterio TM: dos revisiones consecutivas sin cambios y CI verde.

## Gate actual

Debe reinstalarse el build actual en Obsidian real y repetir la nota mínima PowerShell con cursor dentro del top-level, dentro del callout y fuera de ambos. El criterio decisivo es que el output nested renderizado conserve `PRE.syntax-highlight-block...` sin `language-powershell` después de que el host termine de postprocesar, mientras CODE mantenga `language-powershell is-loaded`, badge, líneas y tokens. También se comprobará que los controles nativos útiles no desaparezcan. Si PRE sigue recibiendo `language-*`, la hipótesis `is-loaded` queda falsada y se vuelve a análisis antes de continuar la matriz completa de Fase 0.
