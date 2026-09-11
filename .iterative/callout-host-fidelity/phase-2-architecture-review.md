# Revisión TM temporal · arquitectura Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

- separar engine tree/stream/plain explícitamente;
- no copiar aliases internos de `StreamLanguage`;
- conservar `SyntaxSourceView` sobre la ruta nativa `StreamLanguage + syntaxHighlighting()`.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

La tabla semántica pasó a un único `Highlighter` creado con `tagHighlighter()`, compartido por tree, stream y `syntaxHighlighting()`.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

- no prometer identidad pixel-perfect entre los dos motores de highlighting que Obsidian documenta como distintos;
- fijar LF/CRLF/terminador final sin blank line sintética.

## Revisión 4

Resultado: CAMBIOS NECESARIOS.

`effectiveStreamParser.token()` reescribe styles declarados a nombres sintéticos privados para no depender de la precedencia interna de aliases legacy. Scanner manual y StreamLanguage usan el mismo resolver.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

El engine stream exige estado inicial explícito; no se copia el fallback interno de `StreamLanguage` cuando `startState` falta.

## Revisión 6

Resultado: CAMBIOS NECESARIOS.

Se añadió paleta dark plugin-owned y remapeo scoped de variables públicas `--code-*` para que una surface negra no herede una paleta ilegible de un theme light.

## Revisión 7

Resultado: CAMBIOS NECESARIOS.

El wrapper efectivo debe preservar/delegar todo el contrato público del parser ajeno al styling (`name`, estado, copyState, blankLine, indent, languageData, mergeTokens, etc.).

## Revisión 8

Resultado: SIN CAMBIOS.

Primera revisión limpia del estado de entonces; quedó invalidada por la Revisión 9 posterior.

## Revisión 9

Resultado: CAMBIOS NECESARIOS.

- añadir `syntax-common-invalid` para `tags.invalid`;
- incluir `--code-important`/`--syntax-editor-code-important` en la paleta dark scoped;
- exigir tests de contraste para la paleta completa, incluido invalid/error.

El contador de revisiones limpias se reinicia.

## Revisión 10

Resultado: SIN CAMBIOS.

Primera revisión limpia del plan actual.

Comprobaciones:

- todo tag declarado por el engine stream tiene destino semántico visible, incluido `invalid`;
- todos los roles `syntax-common-*` tienen vía de color rendered y paleta dark scoped en quoted source;
- `--code-important` está cubierto;
- opening/closing son legibles aunque no tengan semantic ranges;
- el wrapper stream conserva todo el contrato del parser y adapta solo la frontera de style names;
- no se requieren cambios en scanner Markdown, cache, Smart Editing, contrast manager ni routing rendered.

No se encontró modificación necesaria.

## Revisión 11

Resultado: SIN CAMBIOS.

Segunda revisión limpia, centrada en layering, packaging y portabilidad:

- `common-languages.ts` puede ser autoridad de catálogo/engines/support/highlighter;
- `common-semantic-ranges.ts` depende de esa autoridad sin crear ciclo inverso;
- `reading.ts` y `editor-block-model.ts` quedan como consumidores de semantic ranges;
- `source-view.ts` consume support + highlighter nativos, no el scanner manual;
- common languages son estáticos durante el bundle y no requieren una nueva revision cache;
- `StringStream`, `StreamParser`, `tagHighlighter` pertenecen a la frontera host ya externalizada/declarada como peer;
- no se introducen APIs Node/Electron ni dependencia desktop-only.

No se encontró modificación necesaria.

Revisiones **10 y 11 son consecutivas sin cambios**: el plan arquitectónico de Fase 2 queda estabilizado según TM y se autoriza crear el plan de implementación con checkboxes.