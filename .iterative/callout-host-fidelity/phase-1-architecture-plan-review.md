# Revisión TM temporal · plan arquitectónico Fase 1

Estado: TEMPORAL. Eliminar al cerrar el ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se contrastó el primer plan con la documentación oficial de Obsidian/CodeMirror y con `contrast-manager.ts`.

Cambio principal:

- El plan prohibía mutar DOM gestionado por CodeMirror en el bridge rendered, pero dejaba vivo `CommonContrastManager`, que escribe `style.color` y `data-syntax-contrast-adjusted` directamente sobre spans `syntax-common-*` observados globalmente. En source esos spans pertenecen al DOM de CodeMirror, por lo que la arquitectura seguía violando el mismo ownership que pretendía corregir.

Corrección incorporada:

- contraste JS solo en DOM propio bajo `.syntax-highlight-frame`;
- source queda exclusivamente bajo decorations + CSS/variables del host;
- surface no pertenece al contrast manager;
- mantener settings preview y configured profiles fuera de la normalización común como hasta ahora.

También se explicitó que recomendaciones generales de lifecycle detectadas durante la revisión se registran como deuda fuera de alcance.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

La revisión de rendimiento/ownership del ViewPlugin detectó una incoherencia: el plan proponía materializar decorations solo para `visibleRanges`, pero el modelo documental ya contenía todos los token spans, obligando a parsear/tokenizar todos los bloques del documento en cada cambio.

Corrección incorporada:

- modelo documental estructural/resuelto, sin tokenizar todos los bloques;
- solo bloques que intersectan `view.visibleRanges` se parsean/tokenizan;
- cada bloque visible se procesa sobre su cuerpo lógico completo para conservar estado multilinea;
- semántica cacheada por bloque + revisión;
- materialización recalculada ante viewport/model/revision y, cuando sea necesario, selección.

## Revisión 3

Resultado: SIN CAMBIOS.

Se revisó el plan contra documentación oficial de decorations, frontera de runtime del sample oficial y ruta soportada de code-block processors en Live Preview.

Comprobaciones:

- marks, line decorations y widgets inline pueden seguir siendo proporcionados por ViewPlugin;
- el sample oficial externaliza CodeMirror y Lezer conjuntamente, y `obsidian` declara Lezer como peer;
- `registerMarkdownCodeBlockProcessor` es la API soportada para rendered code blocks en Reading/Live Preview;
- `--code-background` y `--code-*` son una frontera temática adecuada para styling propio.

No se encontró una modificación necesaria.

## Revisión 4

Resultado: SIN CAMBIOS.

Segunda revisión independiente del plan estabilizado, centrada en ownership y contratos host. No se encontró una modificación necesaria. Revisiones 3 y 4 fueron consecutivas sin cambios.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Se volvió a contrastar el plan con el `esbuild.config.mjs` **actual** del sample oficial de Obsidian y con la documentación/foro oficial sobre Markdown processing vs Live Preview. Esta comprobación reabre el TM arquitectónico: la estabilidad anterior estaba basada en dos simplificaciones inexactas.

### Cambio A · frontera completa de externals

El sample oficial no externaliza únicamente CodeMirror + Lezer. Su frontera completa incluye:

- `obsidian`;
- `electron`;
- `@codemirror/autocomplete`, `collab`, `commands`, `language`, `lint`, `search`, `state`, `view`;
- `@lezer/common`, `highlight`, `lr`;
- todos los built-ins de Node (`builtinModules`).

El plan se corrigió para seguir esa frontera completa. `electron`/built-ins son externals de bundle aunque hoy no los importemos; no se convierten automáticamente en peerDependencies npm.

### Cambio B · significado de “Reading fallback”

La documentación oficial describe `registerMarkdownPostProcessor` como herramienta de Reading View y exige editor extension para Live Preview, mientras `registerMarkdownCodeBlockProcessor` sí está soportado en ambos modos. La evidencia capturada en esta investigación mostró, sin embargo, que un subtree Markdown rendered dentro de Live Preview puede llegar a ejecutar el postprocessor incidentalmente.

La arquitectura se corrigió para expresar el contrato correcto:

- el fallback estructural tiene **garantía funcional de Reading**;
- Live Preview rendered depende únicamente del code-block processor oficial;
- si el host ejecuta incidentalmente el postprocessor en otro subtree rendered, este debe ser seguro/idempotente, pero esa ejecución no forma parte del contrato de corrección de Live Preview;
- queda prohibido compensar su ausencia mediante scanning/mutación privada del DOM del EditorView.

Por tanto las antiguas Revisiones 3–4 ya no cuentan como el par limpio final; el plan necesita dos nuevas revisiones consecutivas sin cambios después de estas correcciones.
