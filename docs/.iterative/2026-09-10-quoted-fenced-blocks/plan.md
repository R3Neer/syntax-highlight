# Plan temporal — fences dentro de blockquotes/callouts

> Documento temporal del Método Iterativo de Samuel. Debe eliminarse al finalizar este proceso.

## Plan

- [ ] **P1. Scanner quote-aware**
  - modelar profundidad de blockquote y offsets de contenido;
  - reconocer opening/closing fences top-level y quoted;
  - conservar protección contra fences literales dentro de otros fences;
  - tests de `>`, `> >`, callout, tildes, CRLF y nesting literal.

- [ ] **P2. Mapping lógico ↔ físico**
  - construir `body` lógico sin prefijos de contenedor;
  - almacenar líneas con offsets lógicos/físicos;
  - helper para proyectar rangos de token a documento;
  - helper para saber si una posición pertenece realmente al contenido.

- [ ] **P3. Integrar Editing View**
  - common parser-backed y parserless sobre `body` lógico;
  - configured/MUD con el mismo mapper;
  - números de línea anclados después del prefijo quote;
  - presentation classes en líneas quoted;
  - smart-edit resolver quote-aware.

- [ ] **P4. Presentación y reescritura**
  - verificar que `languageFrom/languageTo` funcionan tras `>`;
  - tests de `rewritePresentationFences` dentro de blockquotes/callouts;
  - asegurar que aliases y modifiers se conservan.

- [ ] **P5. Reading View / no regresiones**
  - conservar `data-source-line` funcional;
  - verificar por tests de renderer que la política de furniture y tema no cambia;
  - no añadir fallback DOM salvo evidencia de que el processor de Obsidian no cubre nested blocks.

- [ ] **P6. Documentación persistente**
  - documentar soporte de blockquotes/callouts en README/theme integration;
  - changelog mínimo.

- [ ] **P7. Revisión de implementación ↺**
  - `npm ci`, `npm run check`, `npm run pack:all`;
  - revisar diff, tests y edge cases;
  - corregir y repetir hasta pasada estable.

- [ ] **P8. Revisión global / análisis de cambios ↺**
  - contrastar requisitos uno por uno;
  - comprobar ausencia de temporales/workflows auxiliares;
  - si surge carencia, volver a plan/implementación.

- [ ] **P9. Cierre**
  - borrar requirements/analysis/plan temporales;
  - abrir PR;
  - esperar CI de PR;
  - squash merge;
  - esperar CI de `main`.

## Revisión del plan

- P-R1: el mapping se implementa antes de tocar consumidores para no repetir lógica de stripping.
- P-R2: se incluye configured/MUD además de common; el bug debe corregirse en la abstracción de bloque, no solo en los lenguajes que vimos en captura.
- P-R3: no se introduce tratamiento específico de callout. Plan estable.
