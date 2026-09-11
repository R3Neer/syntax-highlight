# Revisión TM temporal · plan arquitectónico Fase 1

Estado: TEMPORAL. Eliminar al cerrar el ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se detectó que `CommonContrastManager` todavía mutaba spans source gestionados por CodeMirror. Arquitectura corregida: contraste JS solo en DOM propio rendered.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Se detectó que el supuesto modelo por viewport seguía tokenizando todo el documento. Se separó modelo estructural de semántica cacheada solo para bloques visibles.

## Revisión 3

Resultado: SIN CAMBIOS.

Primera revisión limpia de una versión posteriormente superada.

## Revisión 4

Resultado: SIN CAMBIOS.

Segunda revisión limpia de una versión posteriormente superada. Ese par quedó invalidado por Revisión 5.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Contraste con el sample oficial actual y documentación de Markdown/Live Preview:

- frontera de externals completa: `obsidian`, `electron`, CodeMirror, Lezer y `builtinModules`;
- `electron`/built-ins son externals de bundle, no peers automáticos;
- el Markdown postprocessor tiene garantía de Reading; LP rendered depende del code-block processor oficial;
- el fallback debe ser idempotente si un renderer Markdown interno lo invoca incidentalmente, pero esa ejecución no es requisito de LP.

## Revisión 6

Resultado: SIN CAMBIOS.

Se revisó la versión corregida contra las restricciones de decorations de CodeMirror y la documentación de Obsidian para Live Preview.

- ViewPlugin solo aporta marks, line decorations y widgets inline;
- `visibleRanges` limita parseo caro sin truncar el cuerpo lógico del parser;
- source queda en editor extensions/decorations;
- LP rendered se apoya en `registerMarkdownCodeBlockProcessor`;
- frontera de externals coincide con el sample actual;
- no reaparecen clases DOM privadas como dependencia funcional.

## Revisión 7

Resultado: SIN CAMBIOS.

Segunda revisión independiente de la versión corregida, centrada en portabilidad y packaging:

- externalizar `electron` y built-ins no añade imports ni cambia `isDesktopOnly:false`; únicamente mantiene la misma frontera preventiva del sample oficial;
- los language packages que Obsidian no ofrece permanecen bundled, pero sus imports de runtime core resuelven a CodeMirror/Lezer del host;
- la política de externals del artifact y la política de peerDependencies npm quedan separadas deliberadamente, porque el adapter se publica como paquete además de instalarse como plugin;
- no se detectó ninguna necesidad de StateField/block widget ni de volver a DOM privado para cumplir los requisitos funcionales.

No se encontró una modificación necesaria. Revisiones 6 y 7 son consecutivas sin cambios; plan arquitectónico estable según TM.
