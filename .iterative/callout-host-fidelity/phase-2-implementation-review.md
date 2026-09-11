# Revisión TM temporal · implementación Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se revisó el estado funcional completo contra el plan arquitectónico Fase 2.

Cambios:

- cachear el resolver stream/tablas sintéticas una vez por engine;
- se formuló inicialmente una hipótesis incorrecta sobre la línea vacía virtual tras un terminador final, corregida en Revisión 2.

No cuenta como revisión limpia.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Se contrastó el scanner directo con la implementación oficial actual de `StreamLanguage`.

Cambios:

- restaurar el límite `lineFrom < source.length`: source vacío y línea virtual tras LF/CRLF final no llaman `blankLine`, mientras una línea vacía física intermedia sí;
- aceptar `StreamParser.startState` opcional y usar estado trivial cuando falta;
- mantener synthetic token names para la ruta nativa: CodeMirror resuelve su tabla legacy antes del `tokenTable` extra, así que los nombres explícitos del engine se traducen a nombres únicos publicados únicamente mediante la API pública `tokenTable`;
- manual extraction conserva los nombres originales y resuelve los mismos Tags desde la misma tabla efectiva.

CI completa pasó tras las correcciones: lint, typecheck, suite existente, build, `pack:all` y artifact.

No cuenta como revisión limpia.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

La revisión de cascade/contraste cruzó la nueva surface negra con valores reales del theme usado en el gate y detectó que variables públicas de código válidas para un papel claro podían quedar por debajo del contraste mínimo sobre negro (`--code-property` ≈2.95:1; `--code-value` ≈4.33:1).

El hallazgo modificaba una decisión arquitectónica, por lo que se detuvo implementación y se reabrieron correctamente:

1. plan arquitectónico;
2. TM arquitectónico hasta Revisiones 7–8 consecutivas SIN CAMBIOS;
3. plan de implementación;
4. TM del plan hasta Revisiones 6–7 consecutivas SIN CAMBIOS.

La arquitectura restabilizada exige que dentro de `.cm-line.syntax-editor-code-source` toda la familia pública `--code-*` relevante se remapee a una paleta dark-safe propia (`--syntax-common-*` heredable → literal seguro), manteniendo `--code-background: transparent`, sin private selectors, branches por theme ni `!important`.

No cuenta como revisión limpia.

## Revisión 4

Resultado: SIN CAMBIOS.

Primera revisión limpia del estado completo posterior a todas las correcciones de producción.

Se revisó el diff funcional completo frente a la arquitectura restabilizada:

- los únicos módulos production modificados están dentro del alcance permitido: catálogo/engine common, autoridad de semantic ranges, consumidores Reading/Markdown source, SourceView y CSS;
- `blocks.ts`, presentation, contrast manager, build boundary, Smart Editing, configured tokenizers y routing rendered no cambian funcionalmente;
- engine stream manual y support nativo parten de la misma tabla efectiva y la misma precedencia;
- synthetic names usan únicamente el contrato público de `StreamParser.tokenTable` y evitan que aliases legacy internos ganen antes de la tabla extra, sin consultar/copyar esa tabla interna;
- scanner coincide con el boundary actual de StreamLanguage para LF/CRLF, blank lines, source vacío y terminador final;
- manual common emite únicamente `syntax-common-*`;
- SourceView conserva la ruta nativa `LanguageSupport + syntaxHighlighting` con el highlighter único;
- quoted source posee su surface negra mediante Decoration.line + variables CSS públicas scoped;
- toda variable `--code-*` relevante dentro de quoted source deriva de `--syntax-common-*` o literal dark-safe, por lo que el palette claro original del theme no vuelve a dominar la surface;
- no aparecen private selectors ni `!important` nuevos;
- el ledger contiene las expectativas antiguas adaptadas hasta este punto;
- CI completa y `pack:all` están verdes en el estado funcional final.

No se encontró modificación necesaria. Esta es la primera revisión limpia del estado final de implementación.
