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
