# Revisión TM temporal · arquitectura Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisiones 1–3

Resultado: CAMBIOS NECESARIOS.

Se estabilizaron previamente estas decisiones:

- no copiar aliases internos de StreamLanguage;
- engine como fuente única de support + extracción manual;
- SourceView conserva ruta nativa CodeMirror;
- scanner stream define LF/CRLF/blank/zero-length;
- `parser.tokenTable` gana sobre engine tokenTags;
- quoted source usa surface negra propia y variables CSS públicas, sin private selectors.

## Revisión 4

Resultado: SIN CAMBIOS.

Primera revisión limpia del estado arquitectónico anterior.

## Revisión 5

Resultado: SIN CAMBIOS.

Segunda revisión limpia del estado anterior; la arquitectura quedó inicialmente estabilizada y se autorizó implementación.

## Revisión 6

Resultado: CAMBIOS NECESARIOS.

La revisión de implementación cruzó la nueva surface negra con los valores reales del theme usado en el gate y encontró que el orden anterior `--syntax-common-* -> --code-* -> literal dark-safe` no garantiza contraste.

Evidencia concreta sobre `#000`:

- `--code-property: rgb(51,77,190)` ≈ 2.95:1;
- `--code-value: rgb(161,83,170)` ≈ 4.33:1.

Son variables públicas válidas pero diseñadas para un papel claro. Al forzar una surface negra propia no pueden seguir siendo autoridad cromática dentro de ese scope.

### Corrección arquitectónica

Dentro de `.cm-line.syntax-editor-code-source`:

- remapear la familia pública relevante `--code-*` hacia nuestra paleta dark-safe (`--syntax-common-*` heredable -> literal seguro);
- mantener `--code-background: transparent` para furniture interno;
- `--code-normal` y `--caret-color` también salen de variables propias con fallback claro;
- nuestros roles `syntax-common-*` y el furniture del host consumen así la misma paleta compatible con la surface;
- `syntax-common-invalid` no usa `--text-error` oscuro como autoridad final dentro del quoted source;
- line numbers reciben un fallback claramente legible.

No se añade branch por theme, selector privado ni `!important`.

Este hallazgo modifica una decisión arquitectónica, por lo que las antiguas Revisiones 4–5 dejan de ser el par limpio final. Se requieren dos nuevas revisiones consecutivas sin cambios antes de continuar implementación.
