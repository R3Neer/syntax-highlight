# Plan temporal — presentación de bloques Text/Markdown

> Documento temporal del Método Iterativo de Samuel. Debe eliminarse al finalizar este proceso.

## Plan

- [ ] **P1. Modelo y persistencia**
  - añadir tipos de alineación/flujo y `blockPresentation`;
  - subir settings schema 7 → 8 y sincronizar instalador;
  - validar/migrar defaults antiguos;
  - tests de settings/migración.

- [ ] **P2. Lenguajes y fences presentacionales**
  - marcar Text y Markdown como familias presentacionales sin badge ni números;
  - crear fuente única para parsear, enumerar, resolver y canonicalizar variantes con guiones;
  - conservar aliases base y rechazar órdenes/duplicados inválidos;
  - tests de aliases, variantes y no-regresiones.

- [ ] **P3. Reescritura pura y offsets seguros**
  - ampliar el detector de bloques con offsets exactos de la etiqueta de fence;
  - implementar transformación pura de una nota para congelar la apariencia anterior;
  - conservar indentación, backticks/tildes, longitud del fence, info adicional, cuerpo y cierre;
  - tests de cambios parciales, explícitos, aliases, múltiples bloques y CRLF.

- [ ] **P4. Reading View y Editing View**
  - propagar familia + overrides como clases, no defaults resueltos;
  - aplicar clases al frame en Reading View;
  - aplicar `Decoration.line` solo a líneas de cuerpo en editor Markdown;
  - mantener Markdown highlighting y Text parserless;
  - asegurar que números/badge permanecen en código real;
  - tests de DOM/decoraciones.

- [ ] **P5. CSS dinámico**
  - emitir defaults de familia desde `ThemeManager`;
  - añadir reglas estáticas de overrides local alignment/flow;
  - `ragged`: alineación normal; `justified`: justify + `text-align-last`;
  - habilitar wrapping visual en bloques presentacionales de Reading View;
  - tests de CSS generado y no interferencia con normalizador de contraste.

- [ ] **P6. UI y migración del vault**
  - añadir `Text blocks` y `Markdown blocks`;
  - controles segmentados Alignment y Flow;
  - bloque informativo de sintaxis por guiones;
  - escaneo previo del vault y modal con alcance;
  - acciones mantener apariencia / aplicar nuevo default / cancelar;
  - relectura antes de escribir y no commit del setting si una reescritura falla;
  - tests extraíbles de lógica pura; UI cubierta por estructura/helpers donde resulte razonable.

- [ ] **P7. Documentación persistente**
  - README Obsidian;
  - `docs/theme-integration.md`;
  - CHANGELOG.

- [ ] **P8. Revisión de implementación ↺**
  - ejecutar CI completa;
  - inspeccionar fallos y diff;
  - revisar coherencia, nombres, duplicación, compatibilidad y UX;
  - si cambia algo, volver a implementación y repetir revisión hasta una pasada sin cambios.

- [ ] **P9. Revisión global / análisis de lo cambiado ↺**
  - comparar rama con `main`;
  - comprobar todos los requisitos uno por uno;
  - verificar que no queda ningún archivo temporal ni workflow auxiliar;
  - si aparece una carencia, reiniciar el ciclo desde Plan con la revisión correspondiente.

- [ ] **P10. Cierre**
  - eliminar `requirements.md`, `analysis.md` y `plan.md` temporales;
  - abrir PR con resumen del Método Iterativo y verificación;
  - esperar CI de PR;
  - squash merge;
  - esperar CI posterior al merge en `main`.

## Revisión del plan

- P-R1: el orden separa primero semántica y transformación pura, después render/UI, para que la parte destructiva de reescritura quede testeable sin Obsidian.
- P-R2: se añadió una comprobación explícita de ausencia de workflows auxiliares porque el proceso anterior necesitó uno temporal para el lockfile.
- P-R3: sin cambios. Plan estable para implementación.
