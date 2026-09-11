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
2. TM arquitectónico hasta dos revisiones consecutivas SIN CAMBIOS;
3. plan de implementación;
4. TM del plan hasta dos revisiones consecutivas SIN CAMBIOS.

La arquitectura restabilizada exige que dentro de `.cm-line.syntax-editor-code-source` toda la familia pública `--code-*` relevante se remapee a una paleta dark-safe propia (`--syntax-common-*` heredable → literal seguro), manteniendo `--code-background: transparent`, sin private selectors, branches por theme ni `!important`.

No cuenta como revisión limpia.

## Revisión 4

Resultado: SIN CAMBIOS.

Primera revisión limpia del estado completo posterior a todas las correcciones de producción.

Se revisó el diff funcional completo frente a la arquitectura restabilizada:

- los únicos módulos production modificados están dentro del alcance permitido: catálogo/engine common, autoridad de semantic ranges, consumidores Reading/Markdown source, SourceView y CSS;
- `blocks.ts`, presentation, contrast manager, build boundary, Smart Editing, configured tokenizers y routing rendered no cambian funcionalmente;
- engine stream manual y support nativo parten de la misma tabla efectiva y la misma precedencia;
- synthetic names usan únicamente el contrato público de `StreamParser.tokenTable` y evitan que aliases legacy internos ganen antes de la tabla extra, sin consultar/copiar esa tabla interna;
- scanner coincide con el boundary actual de StreamLanguage para LF/CRLF, blank lines, source vacío y terminador final;
- manual common emite únicamente `syntax-common-*`;
- SourceView conserva la ruta nativa `LanguageSupport + syntaxHighlighting` con el highlighter único;
- quoted source posee su surface negra mediante Decoration.line + variables CSS públicas scoped;
- toda variable `--code-*` relevante dentro de quoted source deriva de `--syntax-common-*` o literal dark-safe, por lo que la paleta clara original del theme no vuelve a dominar la surface;
- no aparecen private selectors ni `!important` nuevos;
- el ledger contiene las expectativas antiguas adaptadas hasta este punto;
- CI completa y `pack:all` están verdes en el estado funcional final.

No se encontró modificación necesaria. Esta es la primera revisión limpia del estado final de implementación.

## Revisión 5

Resultado: SIN CAMBIOS.

Segunda revisión limpia, independiente y centrada en failure modes/lifecycle:

- `StreamParser.startState` opcional converge en el mismo estado trivial tanto en support nativo como en extracción manual;
- `parser.tokenTable` mantiene precedencia sobre `engine.tokenTags`; los nombres sintéticos solo afectan a la ruta nativa y la extracción manual conserva los styles originales;
- styles múltiples, modificadores públicos y styles desconocidos fallan/localizan sin introducir una segunda taxonomía;
- el guard de tokens sin avance evita loops sin normalizar ni desplazar el source;
- SourceView conserva indentación/languageData/copyState/blankLine/mergeTokens del parser efectivo y no incorpora un parser manual paralelo;
- el modelo/caché/viewport y los settings de Fase 1 no cambian;
- quoted Text y quoted common code comparten la misma line surface sin alterar presentation del body;
- los overrides `--syntax-*` heredados siguen teniendo prioridad y los fallbacks dark-safe permanecen legibles sobre `#000`;
- los fallbacks más débiles revisados siguen por encima de 4.5:1 (`invalid` ≈5.84:1, `important` ≈5.94:1, line numbers ≈6.21:1);
- no se introducen APIs desktop-only ni mutaciones de DOM CodeMirror;
- routing rendered, fallback Markdown y diagnostics permanecen intactos para el gate real.

No se encontró modificación necesaria.

Revisiones **4 y 5 son consecutivas sin cambios**: la implementación de Fase 2 queda estabilizada según TM. Se autoriza comenzar la fase independiente de tests nuevos/reconstruidos.