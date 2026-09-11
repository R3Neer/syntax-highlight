# Revisión TM temporal · arquitectura Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisiones 1–3

Resultado: CAMBIOS NECESARIOS.

Se estabilizaron previamente engine/support únicos, stream directo con API pública, SourceView nativo, scanner de offsets/estado y surface quoted propia sin internals.

## Revisiones 4–5

Resultado: SIN CAMBIOS / SIN CAMBIOS.

Par limpio del estado anterior, posteriormente invalidado como par final por Revisión 6.

## Revisión 6

Resultado: CAMBIOS NECESARIOS.

El gate/theme real demostró que variables públicas diseñadas para un papel claro pueden tener contraste insuficiente sobre la surface negra propia (`--code-property` ≈2.95:1; `--code-value` ≈4.33:1).

Corrección arquitectónica:

- dentro de `.cm-line.syntax-editor-code-source`, remapear toda variable `--code-*` relevante hacia nuestra paleta dark-safe (`--syntax-common-*` heredable → literal seguro);
- mantener `--code-background: transparent`;
- `--code-normal`, caret, invalid y line numbers reciben fallbacks propios legibles;
- sin branch por theme, private selectors ni `!important`.

## Revisión 7

Resultado: SIN CAMBIOS.

Primera revisión limpia del nuevo estado. Se verificó cascada sin ciclos, overrides heredables, ownership restringido a nuestra line decoration y portabilidad mobile.

## Revisión 8

Resultado: SIN CAMBIOS.

Segunda revisión limpia, centrada en compatibilidad/failure modes:

- el default del plugin es autoconsistente: surface negra + paleta dark-safe;
- themes/snippets pueden personalizar fondo y/o roles mediante `--syntax-editor-code-*` y `--syntax-common-*` heredables;
- el plugin no intenta inferir automáticamente contraste de una personalización externa dentro del EditorView, evitando reintroducir mutación/medición JS del DOM source;
- el remapeo `--code-*` solo existe dentro de las líneas que nuestra Decoration.line marca como quoted source;
- Reading/rendered, top-level nativo no quoted y configured languages no reciben esa paleta scoped;
- mobile usa la misma frontera CM6/CSS y no requiere API desktop-only;
- ningún selector privado ni `!important` vuelve a ser necesario.

No se encontró modificación necesaria.

Revisiones **7 y 8 son consecutivas sin cambios**: la arquitectura Fase 2 queda nuevamente estabilizada y se autoriza reconciliar el plan de implementación con esta versión.
