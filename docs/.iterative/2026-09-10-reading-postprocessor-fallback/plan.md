# Plan temporal — fallback real de Reading View

> Documento temporal del Método Iterativo de Samuel. Debe eliminarse al finalizar este proceso.

## Plan

- [ ] **P1. Límite DOM del fallback**
  - crear `reading-fallback.ts`;
  - detectar candidatos `<pre><code class="language-*">` de forma estricta;
  - snapshot antes de mutar DOM;
  - idempotencia y exclusión de output propio;
  - rechazo fail-closed de DOM ambiguo.

- [ ] **P2. Convergencia de renderizado**
  - extraer en `main.ts` una única ruta `renderReadingFence`;
  - hacer que configured/common code-block processors la utilicen;
  - hacer que el fallback la utilice;
  - mantener precedencia configured → common y comportamiento de `markdownReading=false`.

- [ ] **P3. Registro de host**
  - registrar `registerMarkdownPostProcessor` una sola vez en `onload`;
  - asignar orden tardío para que sea fallback real;
  - mantener processors especializados existentes.

- [ ] **P4. Tests adversariales del DOM**
  - callout-like DOM Text/Markdown/PowerShell;
  - unknown untouched;
  - idempotencia/reentrada;
  - output propio ya procesado;
  - siblings y nesting profundo;
  - root `<pre>`;
  - clases engañosas/ambiguas;
  - alias con guiones y alias no registrable especializado;
  - source exacto y mutación durante iteración.

- [ ] **P5. Test del límite de registro**
  - fake registrar que capture el Markdown postprocessor;
  - verificar `sortOrder` tardío;
  - invocar callback capturado sobre DOM y demostrar delegación al handler.

- [ ] **P6. Regresiones de renderer/host**
  - verificar que top-level ya procesado no se toca;
  - verificar que Text/Markdown mantienen no-furniture y presentación;
  - verificar que código mantiene badge/números/highlighting;
  - verificar click metadata/source permanece disponible.

- [ ] **P7. Documentación persistente**
  - documentar fallback de Reading View y su razón en README/docs;
  - changelog mínimo y preciso.

- [ ] **P8. Implementación ↺**
  - ejecutar CI completa;
  - revisar fallos y diff;
  - corregir cualquier carencia y repetir hasta una pasada sin cambios.

- [ ] **P9. Revisión adversarial global / análisis de cambios ↺**
  - comparar rama contra `main`;
  - revisar requisitos uno por uno;
  - inspeccionar especialmente doble procesamiento, DOM destructivo, aliases, settings y click-to-edit;
  - si aparece una carencia, volver al plan si cambia el diseño o a implementación si el plan sigue siendo válido.

- [ ] **P10. Cierre**
  - eliminar `requirements.md`, `analysis.md`, `plan.md`;
  - eliminar cualquier script/workflow temporal si se utiliza;
  - abrir PR;
  - esperar CI de PR;
  - squash merge;
  - esperar CI de `main` posterior al merge.

## Revisión del plan

- P-R1: el test del límite de registro es obligatorio y separado de los tests del detector para no repetir el fallo metodológico anterior.
- P-R2: la convergencia de renderizado se hace antes del registro del fallback; así el fallback no nace con una segunda política paralela.
- P-R3: los tests adversariales se ejecutan antes de documentación/cierre, y cualquier cambio reinicia la revisión de implementación.
- P-R4: sin cambios. Plan estable para implementación.
