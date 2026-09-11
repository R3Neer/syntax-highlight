# Revisión TM temporal · plan arquitectónico Fase 1

Estado: TEMPORAL. Eliminar al cerrar el ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se contrastó el primer plan con la documentación oficial de Obsidian/CodeMirror y con `contrast-manager.ts`.

Cambio principal:

- El plan prohibía mutar DOM gestionado por CodeMirror en el bridge rendered, pero dejaba vivo `CommonContrastManager`, que escribe `style.color` y `data-syntax-contrast-adjusted` directamente sobre spans `syntax-common-*` observados globalmente. En source esos spans pertenecen al DOM de CodeMirror, por lo que la arquitectura seguía violando el mismo ownership que pretendía corregir.

Corrección incorporada: contraste JS solo en DOM propio, source solo decorations/CSS, surface fuera del contrast manager.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

El plan proponía materializar por `visibleRanges` pero todavía tokenizaba todos los bloques. Se separó modelo estructural de semántica por bloque visible y caché.

## Revisión 3

Resultado: SIN CAMBIOS.

Primera revisión limpia de la versión anterior del plan.

## Revisión 4

Resultado: SIN CAMBIOS.

Segunda revisión limpia de la versión anterior del plan. Ese par quedó posteriormente invalidado al descubrirse cambios oficiales adicionales en Revisión 5.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Se volvió a contrastar con el `esbuild.config.mjs` actual del sample oficial y con la documentación/foro oficial de Markdown processing vs Live Preview.

Cambios:

- frontera de externals completa: `obsidian`, `electron`, CodeMirror, Lezer y `builtinModules`;
- `electron`/built-ins son externals de bundle, no peers automáticos;
- el Markdown postprocessor tiene garantía de Reading; Live Preview rendered depende del code-block processor oficial;
- el fallback sigue siendo idempotente si un renderer Markdown interno lo invoca incidentalmente, pero esa ejecución no es un requisito de LP.

## Revisión 6

Resultado: SIN CAMBIOS.

Se revisó la versión corregida contra las restricciones de decorations de CodeMirror y la documentación de Obsidian para Live Preview.

Comprobaciones:

- el ViewPlugin solo aporta `Decoration.mark`, `Decoration.line` y widgets inline; no introduce replacement/block widgets que requieran un StateField directo;
- `visibleRanges` limita qué bloques se parsean/tokenizan, pero un bloque visible se procesa completo para conservar estado multilinea;
- source permanece enteramente en editor extensions/decorations;
- rendered Live Preview tiene como contrato `registerMarkdownCodeBlockProcessor`;
- el generic Markdown postprocessor no se usa como requisito de LP;
- la frontera de build coincide con la lista actual del sample oficial, incluido `electron` y `builtinModules`;
- no reaparece ninguna dependencia funcional de clases DOM privadas.

No se encontró una modificación necesaria.
