# Análisis temporal · Fase 0D · materialización real de Live Preview

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

## Punto de partida verificado

1. Reading View nested ya funciona tras marcar nuestro `CODE.language-*` como `is-loaded`; la captura real confirma que el PRE no vuelve a adquirir `language-*`.
2. El build `0c37d910...` instalado contiene la implementación de Fase 0C.
3. `buildSyntaxDecorations()` genera en tests:
   - marks semánticos `syntax-common-*` + clases `cm-*` para PowerShell;
   - line decorations `syntax-quoted-code-source HyperMD-codeblock` + `*-bg` para quoted source;
   - presentation classes para Text/Markdown.
4. Un `EditorView` aislado de Vitest materializa esas decorations.
5. Nier contiene reglas que deberían responder a `div.HyperMD-codeblock*-bg` y a `.HyperMD-codeblock .cm-*`.
6. Pese a 2–5, Obsidian real se ve exactamente igual antes y después de Fase 0C.

Por tanto la frontera no observada es **la reconciliación/materialización real de Obsidian + CodeMirror**, no la generación del DecorationSet ni la existencia estática del CSS.

## Separación de problemas

No deben volver a tratarse como un único fallo visual.

### P1 · superficie del quoted source

Síntoma: al poner el cursor dentro del bloque nested, el contenido se ve sobre la superficie del callout y varias piezas parecen inline-code. No adquiere la superficie de code block top-level ni conserva de forma fiable presentation/alignment.

Lo que ya sabemos:

- nuestro scanner reconoce el quoted fence y produce rangos físicos correctos en tests;
- el artifact contiene `addQuotedCodeSurfaceRanges()`;
- Nier sí pinta de negro `div.HyperMD-codeblock*-bg`;
- por tanto, o esas clases no llegan al `.cm-line` final, o el contenido visible no usa esas `.cm-line` como suponemos, o otra capa posterior reemplaza/reconcilia el DOM.

### P2 · color semántico PowerShell

Síntoma: el usuario no percibe colores de PowerShell ni en top-level ni en nested source.

Lo que ya sabemos:

- el parser legacy clasifica `$foo`, `42`, `=` y `Write-Host`;
- el RED test anterior encontró una pérdida real de `builtin`, corregida ahora con `tags.standard(tags.variableName)` → `syntax-common-callable` + `cm-builtin` / `token builtin`;
- el artifact contiene esa corrección;
- aun así el resultado visual real no cambia.

Esto deja tres fronteras posibles para color:

1. las `Decoration.mark` no llegan como spans/clases al DOM final;
2. sí llegan, pero el ancestry final no satisface los selectores del tema;
3. sí llegan y el tema las aplica, pero una regla posterior o `CommonContrastManager` cambia el color efectivo.

P2 puede compartir causa de materialización con P1, pero no se debe asumir.

## Modelo de host que debemos comprobar

### Modelo M1 · source quoted = líneas normales del EditorView exterior

Si M1 fuera cierto, `Decoration.line` sobre `openingLineFrom/bodyLines/closingLineFrom` debería aparecer en `.cm-line`, y los marks sobre offsets físicos deberían aparecer en spans descendientes. El test aislado modela aproximadamente esto.

La validación visual hace M1 **dudoso**.

### Modelo M2 · source quoted = contenido reconciliado dentro del widget/callout

Obsidian puede mantener el `.cm-embed-block.cm-callout` como host y alternar internamente partes rendered/source. En ese caso el texto visible puede no corresponder uno-a-uno con las `.cm-line` a las que llegan las decorations del ViewPlugin exterior, o puede ser reconstruido por una extensión host con precedencia/replacement propia.

M2 explica simultáneamente:

- que el nested source se parezca a inline code;
- que line decorations válidas en un EditorView aislado no cambien el aspecto real;
- que el lifecycle dependa fuertemente de la posición del cursor;
- que el bridge rendered sí vea `.cm-embed-block.cm-callout` incluso mientras el editor exterior sigue activo.

M2 es ahora la hipótesis arquitectónica principal, pero todavía no está demostrada.

### Modelo M3 · M1 estructuralmente cierto, pero las decorations son filtradas/sustituidas por precedencia host

También posible. CodeMirror permite múltiples fuentes de decorations y Obsidian instala las suyas. El `EditorView` aislado no reproduce esa composición. Si el nodo final sigue siendo una `.cm-line` ordinaria pero carece de nuestras clases, M3 gana frente a M2.

## Qué evidencia discrimina M1/M2/M3

La captura debe ocurrir **después de un animation frame**, cuando el DOM visible ya esté reconciliado. No sirve `traceHostDiagnostic("live-preview-source", ...)` desde `buildSyntaxDecorations()` porque se ejecuta antes de esa materialización.

Para cada `.cm-line` visible del EditorView real necesitamos:

- posición documental derivada desde el DOM (`view.posAtDOM`) y número de línea;
- texto visible;
- `classList` y atributos de la línea;
- estilos computados relevantes: `display`, `position`, `background-color`, `color`, `text-align`, `white-space`, `border-radius`, paddings;
- ancestors con tag/clases hasta `view.dom`, indicando si pasa por `.cm-embed-block`, `.cm-callout`, `.cm-s-obsidian`;
- descendants relevantes (`span`, `code`, widgets) con texto corto, clases, atributos y color/background computados;
- presencia explícita de `syntax-quoted-code-source`, `HyperMD-codeblock*`, `syntax-common-*`, `cm-*`, `cm-inline-code` y `data-syntax-contrast-adjusted`.

Además se debe registrar:

- selection head/anchor;
- `view.viewport`;
- cada fence lógico reconocido y sus rangos físicos opening/body/closing;
- qué líneas físicas de ese fence están materializadas como `.cm-line` y cuáles no.

La captura debe poder invocarse manualmente desde DevTools para evitar carreras y obtener tres estados separados:

1. cursor dentro de PowerShell top-level;
2. cursor dentro de PowerShell quoted;
3. cursor fuera de ambos.

Después se repetirá con `text-center-justified` quoted para P1/presentation.

## Diseño de instrumentación derivado del análisis

No modificar todavía CSS, parser, presentation ni host bridge.

Ampliar el helper temporal de diagnóstico con un registro de `EditorView` activos y una operación global manual, por ejemplo `SyntaxHighlightHostDiagnostics.captureLivePreview()`.

La extensión temporal debe:

1. registrar/desregistrar cada `EditorView`;
2. al pedir captura, esperar `requestAnimationFrame` para observar el estado post-reconciliation;
3. enumerar `.cm-line` visibles y obtener su posición mediante `view.posAtDOM(line, 0)`; si falla, registrar el fallo en vez de inventar posición;
4. anotar cada línea contra los fences reconocidos de `findCodeBlocks()`;
5. capturar estilos y descendants sin incluir rutas del vault ni información externa a la nota activa;
6. no mutar DOM, selection, document, decorations ni settings;
7. permanecer completamente inerte cuando diagnostics está desactivado.

## Decisiones que NO se toman todavía

Hasta tener esa captura post-frame no se decide:

- reutilizar más clases host;
- abandonar `Decoration.line`;
- crear una superficie propia con CSS semántico;
- intervenir dentro de `.cm-embed-block.cm-callout` durante source;
- cambiar la precedencia de extensiones;
- tocar `CommonContrastManager`;
- eliminar `cm-inline-code` visualmente;
- introducir excepciones por Nier.

Cualquiera de esas decisiones antes de discriminar M1/M2/M3 sería otro parche por intuición.

## Criterio de salida del análisis

El siguiente plan debe producir **solo instrumentación post-frame + evidencia reproducible**. La corrección funcional no comienza hasta que la captura real permita afirmar, para top-level y quoted:

- dónde viven realmente opening/body/closing;
- si nuestras line decorations sobreviven;
- si nuestros token marks sobreviven;
- qué estilo final recibe cada elemento y por qué ancestry;
- si el normalizador de contraste interviene.
