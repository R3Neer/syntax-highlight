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

También se explicitó que recomendaciones generales de lifecycle detectadas durante la revisión (watchers del vault, modernización de views, lint específico de Obsidian) se registran como deuda fuera de alcance y no se mezclan con esta refactorización de rendering/runtime.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

La revisión de rendimiento/ownership del ViewPlugin detectó una incoherencia: el plan proponía materializar decorations solo para `visibleRanges`, pero el modelo documental ya contenía todos los token spans, lo que obligaba a parsear/tokenizar todos los bloques del documento en cada cambio de documento.

Eso no aprovecha la razón por la que Obsidian recomienda ViewPlugin para decorations ligadas al viewport.

Corrección incorporada:

- el modelo documental pasa a ser estructural/resuelto, sin tokenizar todos los bloques;
- solo bloques que intersectan `view.visibleRanges` se parsean/tokenizan;
- cada bloque visible se procesa sobre su cuerpo lógico completo para conservar estado multilinea de parsers/StreamLanguage;
- la semántica se cachea por bloque + revisión y se reutiliza al hacer scroll;
- la materialización se recalcula ante viewport/model/revision y, cuando sea necesario para el cambio source/rendered del host, selección.

Así el ViewPlugin queda alineado con el patrón recomendado por Obsidian/CodeMirror sin sacrificar corrección multilinea.
