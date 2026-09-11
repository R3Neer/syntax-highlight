# Revisión TM temporal · implementación Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se revisó el estado funcional completo contra el plan arquitectónico Fase 2 ya estabilizado.

### Cambio A · resolver stream reconstruido por token

`commonStreamTagsForStyle()` y el wrapper de `effectiveCommonStreamParser()` reconstruían la tabla efectiva, mapa synthetic y token table para cada token devuelto por el parser.

Corrección:

- cachear `CommonStreamStyleResolver` en `WeakMap<CommonStreamEngine, ...>`;
- la tabla efectiva y la correspondencia synthetic se construyen una vez por engine;
- manual extraction y native `StreamLanguage` siguen compartiendo exactamente la misma metadata/preferencia, sin cambiar semántica.

### Cambio B · se perdía la línea vacía lógica final

El scanner stream usaba `while (lineFrom < source.length)`. Eso omitía:

- la única línea vacía de `source === ""`;
- la línea vacía posterior a un LF/CRLF final.

CodeMirror modela esas líneas y un `StreamParser.blankLine()` puede modificar estado, por lo que la omisión podía romper parsers multilinea.

Corrección:

- recorrer mientras `lineFrom <= source.length`;
- procesar la línea vacía final y llamar `blankLine` cuando corresponda;
- conservar offsets LF/CRLF y última línea no terminada.

### Validación

Tras ambas correcciones, CI completa pasa:

- lint;
- typecheck;
- suite existente;
- build;
- `pack:all`;
- artifact.

Los cambios refuerzan el plan sin alterarlo. Esta revisión no cuenta como limpia.
