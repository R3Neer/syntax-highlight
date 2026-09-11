# Revisión TM temporal · plan de implementación Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

- separar estrictamente implementación y tests nuevos;
- usar fallbacks `var(--syntax-*, literal)` para que themes/snippets puedan sobrescribir variables propias;
- mantener ledger de tests antiguos adaptados/retirados durante la migración.

## Revisión 2

Resultado: SIN CAMBIOS.

Primera revisión limpia. Se validó el orden engine → ranges → consumidores → SourceView → CSS → retirada de taxonomía antigua, manteniendo routing/ownership fuera del alcance.

## Revisión 3

Resultado: SIN CAMBIOS.

Segunda revisión limpia, centrada en failure modes:

- una migración incompleta puede detenerse conservando temporalmente exports viejos;
- `parser.tokenTable` y unknown styles tienen conducta determinista;
- tests antiguos que fallen por contrato retirado se trazan antes de adaptarse;
- custom properties conservan override por herencia;
- un fallo del gate rendered no provoca reintroducción automática del bridge;
- scanner Markdown, contrast manager, build boundary, Smart Editing y configured tokenizers permanecen fuera del alcance;
- no hay tests nuevos antes de estabilizar implementación.

No se encontró cambio operativo necesario.

Revisiones **2 y 3 son consecutivas sin cambios**: el plan de implementación de Fase 2 queda estabilizado según TM y se autoriza producción.
