# Revisión TM temporal · implementación Fase 1

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Cambios: surface source más robusta (`background-color`, fallback base `--text-normal`) y contraste restringido a DOM propio.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Cambio: declarar como peers npm los runtime imports CodeMirror/Lezer que el artifact deja externos; externals preventivos como `electron`/built-ins no se convierten en peers fantasma.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

Cambio: rendered Markdown pasa a elegir `markdownEditor` o `markdownReading` según `MarkdownView.getMode()` mediante APIs públicas, en vez de usar siempre `markdownReading`.

## Revisión 4

Resultado: CAMBIOS NECESARIOS.

Cambios:

- resolver primero el `MarkdownView` propietario por `containerEl.contains(element)` y usar `context.sourcePath` solo como fallback inequívoco, para cubrir transclusiones;
- sincronizar Fases 0–7 del plan de implementación con el progreso real.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Cambio: cerrar trazabilidad del ledger y del plan con una matriz explícita de tests futura para settings/mode, incluyendo transclusión, owner por containment y fallback conservador.

## Revisión 6

Resultado: SIN CAMBIOS.

Primera revisión limpia del estado actual. Se comprobó runtime/bundle, contrato npm, ownership DOM, ruta oficial de LP rendered, contraste, selectores privados, viewport/caché, lifecycle y ledger. No se encontró modificación necesaria.

## Revisión 7

Resultado: SIN CAMBIOS.

Segunda revisión independiente centrada en los contratos públicos de Obsidian/CodeMirror y en estados de lifecycle:

- `MarkdownView.getMode()`, `containerEl`, `sourcePath`, code-block processors y editor extensions son APIs públicas;
- ninguna decisión funcional depende de `.cm-embed-block`, `.cm-callout` o `HyperMD-codeblock*`;
- no hay modificación directa del DOM gestionado por CodeMirror;
- LP rendered depende del code-block processor oficial, no del generic postprocessor;
- el fallback estructural sigue siendo host-neutral e idempotente;
- source y rendered comparten taxonomía semántica sin excepción PowerShell;
- runtime externo y peers npm describen la misma frontera real;
- CI completa y `pack:all` están verdes.

No se encontró modificación necesaria. Revisiones 6 y 7 son consecutivas sin cambios: **implementación estabilizada según TM**. Se autoriza el paso a Fase 9 de tests nuevos.
