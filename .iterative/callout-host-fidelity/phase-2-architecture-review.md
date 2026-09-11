# Revisión TM temporal · arquitectura Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisiones 1–3

Resultado: CAMBIOS NECESARIOS.

Se estabilizaron previamente:

- engine como fuente única de support + extracción manual;
- no copiar aliases internos de StreamLanguage;
- SourceView en ruta nativa CodeMirror;
- scanner LF/CRLF/blank/zero-length;
- `parser.tokenTable` sobre engine tokenTags;
- quoted source como surface propia sin private selectors.

## Revisiones 4–5

Resultado: SIN CAMBIOS / SIN CAMBIOS.

Par limpio de la arquitectura anterior, posteriormente invalidado como par final por el cambio de Revisión 6.

## Revisión 6

Resultado: CAMBIOS NECESARIOS.

La revisión de implementación cruzó la surface negra con valores reales del theme del gate y demostró que variables públicas válidas para un papel claro pueden ser ilegibles sobre negro (`--code-property` ≈2.95:1; `--code-value` ≈4.33:1).

Corrección:

- dentro de `.cm-line.syntax-editor-code-source`, la familia pública `--code-*` relevante se remapea a una paleta dark-safe propia;
- cada valor sale de `--syntax-common-*` heredable con literal seguro;
- `--code-background` queda transparente;
- `--code-normal`, caret, invalid y line numbers reciben fallbacks propios legibles;
- sin branch por theme, private selectors ni `!important`.

El cambio reabrió TM arquitectónico.

## Revisión 7

Resultado: SIN CAMBIOS.

Primera revisión limpia del nuevo estado.

Se revisó la cascada/jerarquía de variables:

- no hay ciclo CSS: las variables públicas scoped derivan de `--syntax-common-*` o literal dark-safe;
- nuestros roles pueden consumir esas variables públicas sin depender del palette original del theme;
- un theme/snippet que defina `--syntax-common-*` o `--syntax-editor-code-*` en un ancestro gobierna tanto nuestra semántica como el furniture que consuma `--code-*`;
- la line decoration sigue siendo la única frontera de ownership: no se selecciona ni conoce DOM interior del host;
- no aparecen APIs desktop-only, por lo que el diseño sigue siendo válido en mobile.

No se encontró modificación necesaria. Es la primera revisión limpia tras Revisión 6.
