# Revisión TM temporal · plan de implementación Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

- separar estrictamente implementación y tests nuevos;
- usar fallbacks `var(--syntax-*, literal)` para que themes/snippets puedan sobrescribir variables propias;
- mantener ledger de tests antiguos adaptados/retirados durante la migración.

## Revisión 2

Resultado: SIN CAMBIOS.

Primera revisión limpia del plan corregido.

Se revisó el orden de migración y rollback:

- conservar exports viejos mientras nace engine/highlighter nuevo;
- crear la autoridad pura antes de migrar consumidores;
- migrar Reading y Markdown source antes de retirar taxonomía antigua;
- migrar SourceView mediante la ruta nativa CodeMirror;
- aplicar CSS dark después de que `syntax-common-*` sea la taxonomía única;
- retirar exports/clases host-specific solo cuando no queden consumidores;
- routing rendered, scanner Markdown, contrast manager y configured tokenizers quedan fuera del cambio;
- durante implementación solo se adapta cobertura antigua cuyo contrato desaparece y siempre con ledger;
- cobertura nueva espera hasta después del TM de implementación.

No se encontró cambio operativo necesario. Es la primera revisión limpia.
