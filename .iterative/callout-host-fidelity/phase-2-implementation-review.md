# Revisión TM temporal · implementación Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se revisó el estado funcional completo contra el plan arquitectónico Fase 2.

### Cambio A · resolver stream reconstruido por token

`commonStreamTagsForStyle()` y el wrapper del parser efectivo reconstruían la tabla/mapas estáticos para cada token.

Corrección aplicada:

- `WeakMap<CommonStreamEngine, CommonStreamStyleResolver>`;
- tabla efectiva y nombres sintéticos se construyen una vez por engine;
- manual extraction y native StreamLanguage conservan la misma metadata y precedencia.

### Cambio B inicial · tratamiento de línea vacía final

La primera lectura de esta revisión interpretó que la línea vacía virtual posterior a un terminador final debía recibir `blankLine()` y cambió temporalmente el scanner de `<` a `<=`.

La Revisión 2 contrastó esa conclusión con la implementación oficial actual de `StreamLanguage` y la corrigió. Por tanto este Cambio B **no forma parte del estado final** y la revisión sigue contando como cambios necesarios.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Se comparó el scanner directo con la implementación oficial actual de `@codemirror/language`.

### Cambio A · revertir blankLine virtual final

`StreamLanguage.Parse.parseLine()` procesa posiciones reales hasta `to`; no invoca `blankLine()` para:

- un documento de longitud cero;
- la línea vacía virtual posterior a un terminador LF/CRLF final.

Sí invoca `blankLine()` para líneas vacías que ocupan una posición real dentro del input.

Corrección:

- restaurar `while (lineFrom < source.length)`;
- conservar LF/CRLF y última línea no terminada;
- documentar explícitamente que el límite replica la conducta host actual.

### Cambio B · `startState` es opcional en la API pública

El primer engine exigía `parser.startState` y lanzaba error si faltaba. La interfaz pública `StreamParser` lo declara opcional y CodeMirror usa un estado trivial cuando no existe.

Corrección:

- `streamEngine()` acepta cualquier StreamParser válido;
- `engine.startState(indentUnit)` delega en el parser cuando existe y devuelve `true` en caso contrario;
- SourceView y manual extraction comparten ese mismo comportamiento efectivo.

### Revisión del parser efectivo nativo

Se revisó además la necesidad de los nombres sintéticos usados por `effectiveCommonStreamParser()`.

La implementación actual de CodeMirror inicializa `TokenTable.table` con su tabla legacy por defecto y resuelve esa tabla antes de crear un token usando `tokenTable` extra. Por ello un nombre como `variable` puede ser capturado por el alias legacy antes que por una entrada extra del mismo nombre.

La solución actual no copia esa tabla ni depende de saber qué claves contiene:

- todo style que Syntax Highlight define explícitamente se reescribe a un nombre sintético único;
- ese nombre sintético se declara mediante la API pública `StreamParser.tokenTable`;
- modificadores y múltiples styles siguen usando el contrato público del StreamParser;
- manual extraction conserva los nombres originales y resuelve los mismos Tags desde la misma tabla efectiva.

Esto mantiene una sola metadata semántica sin depender de NodeProps/internals para el resultado.

### Validación

CI completa vuelve a pasar tras las correcciones: lint, typecheck, suite existente, build, `pack:all` y artifact.

Esta revisión no cuenta como limpia.
