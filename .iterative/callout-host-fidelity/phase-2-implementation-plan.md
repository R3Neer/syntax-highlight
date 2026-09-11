# Plan de implementación temporal · Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Este plan ejecuta el plan arquitectónico de Fase 2 estabilizado por TM. Los checkboxes son la fuente de verdad del progreso. No marcar tareas por intención: solo cuando el cambio exista y haya pasado las comprobaciones aplicables.

## 0. Baseline y guardrails

- [ ] Confirmar branch `plan/obsidian-callout-host-fidelity` y CI verde antes de tocar producción de Fase 2.
- [ ] Mantener diagnostics y documentos temporales de Fase 1/2 hasta gate real satisfactorio.
- [ ] No limpiar ni reescribir el routing rendered durante esta fase.
- [ ] Mantener los tests arquitectónicos de Fase 1 que prohíben private selectors/bridge DOM.
- [ ] Registrar aquí cualquier cambio de alcance antes de implementarlo.

## 1. Modelo de engine común y highlighter único

### Tipos y metadata

- [ ] Refactorizar `CommonLanguage` para tener un engine discriminado `tree | stream | plain`.
- [ ] Tree engine conserva factory actual de `LanguageSupport`.
- [ ] Stream engine contiene `StreamParser` y `tokenTags` explícito.
- [ ] Plain engine no tiene parser/support.
- [ ] Eliminar el `support()` paralelo que pueda divergir del engine.

### PowerShell declarativo

- [ ] Declarar PowerShell como engine stream usando el `powerShell` oficial de legacy-modes.
- [ ] Declarar tokenTags públicos para `variable`, `number`, `operator`, `builtin`, `punctuation`, `string`, `comment`, `keyword`, `error`.
- [ ] No introducir `if (language.id === "powershell")` en rendering/materialización.

### Support común

- [ ] Implementar `commonLanguageSupport(language)`.
- [ ] Tree devuelve su support.
- [ ] Stream crea un parser efectivo sin mutar el parser original.
- [ ] Combinar token tables con precedencia `parser.tokenTable > engine.tokenTags`.
- [ ] Plain devuelve `undefined`.

### Highlighter

- [ ] Crear `COMMON_SEMANTIC_HIGHLIGHT_STYLE` con solo `syntax-common-*`.
- [ ] Retirar progresivamente `COMMON_READING_HIGHLIGHT_STYLE` y `COMMON_EDITOR_HIGHLIGHT_STYLE` cuando todos los consumidores hayan migrado.
- [ ] Ejecutar typecheck/CI existente antes de pasar a la autoridad de ranges.

## 2. `common-semantic-ranges.ts`

### Contrato puro

- [ ] Crear `CommonSemanticRange { from, to, classes }`.
- [ ] Crear `commonSemanticRanges(language, source, options?)` como dispatcher tree/stream/plain.
- [ ] El módulo no conoce DOM, EditorView ni Obsidian.

### Tree-backed

- [ ] Obtener parser/lenguaje desde el engine tree.
- [ ] Parsear como en la ruta actual.
- [ ] Ejecutar `highlightTree()` con `COMMON_SEMANTIC_HIGHLIGHT_STYLE`.
- [ ] Devolver solo clases `syntax-common-*`.

### Plain

- [ ] Producir ranges plain sin parser cuando corresponda, conservando el comportamiento Text actual.

### Stream-backed · scanner

- [ ] Crear estado con `startState(indentUnit)` cuando exista.
- [ ] Recorrer líneas completas en orden.
- [ ] Soportar LF.
- [ ] Soportar CRLF sin desplazar offsets.
- [ ] Soportar última línea sin terminador.
- [ ] Llamar `blankLine(state, indentUnit)` en línea vacía cuando exista.
- [ ] Crear `StringStream(line, tabSize, indentUnit)` con defaults 4/2 sin EditorState.
- [ ] Permitir options explícitas de tabSize/indentUnit.
- [ ] Mapear `stream.start/pos` a offsets absolutos exactos.
- [ ] Implementar guard finito para llamadas a `token()` que no avancen.

### Stream-backed · styles

- [ ] Crear tabla efectiva con precedencia `parser.tokenTable > engine.tokenTags`.
- [ ] Resolver primero tabla efectiva.
- [ ] Resolver después nombres públicos de `tags`.
- [ ] Resolver modificadores públicos con `.`.
- [ ] Resolver varios style names separados por espacios y unir Tags.
- [ ] Llamar `COMMON_SEMANTIC_HIGHLIGHT_STYLE.style(tags)`.
- [ ] Style desconocido no aborta el bloque.
- [ ] Nunca consultar internals de StreamLanguage/NodeProps/TokenTable interno.

### Gate interno

- [ ] Añadir tests unitarios mínimos del módulo antes de migrar consumidores.
- [ ] Confirmar PowerShell genera variable/number/operator/builtin/string/comment en Node/Vitest.
- [ ] Confirmar Bash tree sigue generando ranges.
- [ ] CI verde antes de retirar la ruta antigua.

## 3. Migrar manual highlighting de Markdown/Reading

### Reading/rendered

- [ ] `renderCommonCode()` consume `commonSemanticRanges()`.
- [ ] Eliminar `highlightTree()` directo de `reading.ts`.
- [ ] Eliminar clases `token *` de ranges manuales.
- [ ] Mantener badge, line numbers, `language-* is-loaded`, presentation y DOM estructural intactos.

### Markdown source

- [ ] `buildEditorBlockSemantics()` consume `commonSemanticRanges()`.
- [ ] Mantener `mapCodeBlockRange()` para quoted/top-level.
- [ ] Eliminar clases `cm-*` de semantic marks manuales.
- [ ] Mantener model/cache/viewport de Fase 1 sin rediseño.
- [ ] Mantener line decorations/furniture separados de semantic marks.

### Retirada de ruta antigua

- [ ] Eliminar `parseCommonLanguageTree()` si queda sin consumidores legítimos o reducirlo a helper tree-only interno.
- [ ] Eliminar exports host-specific antiguos una vez migrados todos los consumidores.
- [ ] Ejecutar CI existente.

## 4. `SyntaxSourceView`

- [ ] Sustituir acceso directo `common.support()` por `commonLanguageSupport(common)`.
- [ ] Usar `syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHT_STYLE)`.
- [ ] No añadir ViewPlugin stream manual.
- [ ] Conservar language support, indentation/brackets, Smart Editing y demás lifecycle actual.
- [ ] Añadir/ajustar test para verificar que PowerShell support efectivo usa la tabla declarativa del engine.
- [ ] Ejecutar CI existente.

## 5. Source dark surface

### Variables propias

- [ ] Cambiar fallback de `--syntax-editor-code-background` a negro explícito `#000`.
- [ ] Definir foreground quoted legible, fallback final `#d4d4d4` o equivalente acordado.
- [ ] Definir caret quoted legible.
- [ ] Mantener variables `--syntax-*` sobrescribibles por theme/snippet.

### Integración host sin selectores privados

- [ ] Dentro de `.cm-line.syntax-editor-code-source`, redefinir `--code-background: transparent`.
- [ ] Redefinir `--code-normal` hacia el foreground propio.
- [ ] Redefinir `--caret-color` hacia el caret propio.
- [ ] No seleccionar `.cm-inline-code`, `HyperMD-*`, `.cm-embed-block` o `.cm-callout`.
- [ ] No usar `!important`.
- [ ] No añadir margins verticales.

### Paleta semántica sobre negro

- [ ] Revisar cada `.syntax-common-*` para que tenga fallback final legible sobre la surface negra.
- [ ] Mantener orden: variable propia → variable pública `--code-*`/`--color-*` → fallback literal.
- [ ] Plain no termina en `--text-normal` dentro de quoted source.
- [ ] No añadir excepción Nier ni detectar nombre de theme.
- [ ] Ejecutar CI existente.

## 6. Coherencia y retirada de taxonomía host-specific

- [ ] Buscar producción por `token ` generado por nuestro manual highlighter y eliminarlo.
- [ ] Buscar producción por clases `cm-*` generadas por nuestro manual highlighter y eliminarlas.
- [ ] No confundir clases que CodeMirror genera por sí mismo con clases emitidas por Syntax Highlight.
- [ ] Confirmar que `syntax-common-*` es la única taxonomía semántica manual.
- [ ] Confirmar configured profiles permanecen sin cambios.
- [ ] Confirmar tests de private-selector boundary siguen verdes.

## 7. Revisión TM de implementación

- [ ] Revisar diff completo contra plan arquitectónico de Fase 2.
- [ ] Revisar específicamente uso exclusivo de APIs públicas stream.
- [ ] Revisar que engine/support no hayan vuelto a duplicarse.
- [ ] Revisar que PowerShell no tenga rama renderer especial.
- [ ] Revisar que tree languages no hayan cambiado de parser accidentalmente.
- [ ] Revisar offsets LF/CRLF/blank/zero-length.
- [ ] Revisar que manual ranges no emitan `cm-*`/`token *`.
- [ ] Revisar source dark sin private selectors/`!important`.
- [ ] Revisar que no cambió routing rendered.
- [ ] Revisar scope: blocks/presentation/contrast/build/smart-edit/configured tokenizers intactos salvo imports inevitables.
- [ ] Aplicar correcciones encontradas.
- [ ] Repetir hasta dos revisiones consecutivas sin cambios.
- [ ] Solo entonces pasar a tests finales de Fase 2.

## 8. Tests de Fase 2

### Semantic engine

- [ ] Tree-backed Bash produce semantic ranges esperados.
- [ ] Plain Text conserva ranges plain.
- [ ] PowerShell stream produce variable/number/operator/builtin/string/comment/keyword/punctuation.
- [ ] No hay rama renderer por id PowerShell.
- [ ] `parser.tokenTable` gana a `engine.tokenTags`.
- [ ] engine tokenTags cubre nombres no definidos por parser.
- [ ] tags públicos directos funcionan.
- [ ] modificadores públicos funcionan.
- [ ] múltiples style names funcionan.
- [ ] unknown style falla localmente.

### Scanner stream

- [ ] estado multilinea sobre al menos string/comment synthetic parser.
- [ ] LF offsets exactos.
- [ ] CRLF offsets exactos.
- [ ] última línea sin newline.
- [ ] blankLine invocado.
- [ ] zero-length state step permitido.
- [ ] parser que nunca avanza termina por guard y no cuelga suite.

### Consistencia de consumidores

- [ ] Reading PowerShell contiene `syntax-common-*` correctos y no `token *` manuales.
- [ ] Markdown editor PowerShell contiene roles equivalentes y no `cm-*` manuales.
- [ ] Bash Reading/editor convergen en los mismos roles `syntax-common-*`.
- [ ] quoted mapping sigue excluyendo `>` de semantic spans.
- [ ] line numbers/presentation actuales no regresan.
- [ ] SourceView usa `commonLanguageSupport()+COMMON_SEMANTIC_HIGHLIGHT_STYLE`.

### CSS/arquitectura

- [ ] quoted source surface fallback es negra.
- [ ] quoted source neutraliza `--code-background` mediante variable pública scoped.
- [ ] foreground/caret y plain fallback son legibles sobre negro.
- [ ] no hay `!important` nuevo para esta surface.
- [ ] no se reintroducen private selectors.
- [ ] tests arquitectónicos de Fase 1 siguen verdes.

## 9. Revisión TM de tests

- [ ] Cruzar cada invariante del plan con prueba concreta.
- [ ] Revisar tests contra internals de CodeMirror: no copiar implementación privada como contrato.
- [ ] Revisar que happy-dom no se presente como host real.
- [ ] Revisar fragilidad de colores: probar variables/clases, no pixel exacto salvo requisito negro explícito.
- [ ] Repetir hasta dos revisiones consecutivas sin cambios.
- [ ] CI completa y `pack:all` verdes.

## 10. Gate manual Obsidian real · Fase 2

No limpiar diagnostics todavía.

### Visual

- [ ] PowerShell top-level source sigue coloreado.
- [ ] PowerShell top-level rendered queda coloreado por `syntax-common-*`.
- [ ] PowerShell quoted source queda negro, sin píldoras claras dominantes y con semántica coloreada.
- [ ] PowerShell quoted rendered queda coloreado.
- [ ] Reading View PowerShell top-level/quoted queda coloreado.
- [ ] Bash mantiene colores semánticos coherentes entre source/rendered sin depender de `cm-*`/`token *` nuestros.
- [ ] Text quoted conserva presentation source/rendered.
- [ ] Cursor source ↔ rendered no vuelve a romper estructura.

### Routing rendered fresco

- [ ] Limpiar/habilitar diagnostics antes de crear el bloque/widget.
- [ ] Crear/modificar contenido después de enable para forzar render fresco.
- [ ] Verificar eventos de PowerShell nested.
- [ ] Confirmar `reading-specialized` si el processor oficial es la ruta garantizada.
- [ ] Si solo aparece `reading-fallback`, detener limpieza y volver a análisis TM de routing.

### Settings

- [ ] `markdownEditor=false` sigue eliminando semantic decorations propias del editor.
- [ ] `markdownReading=false` mantiene Reading sin renderer semántico propio.

## 11. Limpieza final conjunta Fase 1 + Fase 2

Solo tras gate satisfactorio:

- [ ] Eliminar `_tmp-host-diagnostics.ts` y suites temporales.
- [ ] Retirar wiring/controller global de diagnostics.
- [ ] Actualizar `packages/obsidian/README.md` al modelo sin bridge y con engines tree/stream/plain.
- [ ] Actualizar `docs/theme-integration.md` a `syntax-common-*` + variables públicas/source dark.
- [ ] Revisar/actualizar CHANGELOG si contiene la arquitectura retirada del bridge como estado actual.
- [ ] Eliminar todos los documentos agotados de `.iterative/callout-host-fidelity/`, incluidos planes Fase 1 y Fase 2.
- [ ] Ejecutar CI final + `pack:all`.
- [ ] Auditar diff final sin temporales/private-selector exceptions.
