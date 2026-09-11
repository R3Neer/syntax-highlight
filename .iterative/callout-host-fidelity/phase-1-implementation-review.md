# Revisión TM temporal · implementación Fase 1

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se revisó el diff funcional completo contra el plan arquitectónico estabilizado, con especial atención a la frontera oficial Obsidian/CodeMirror, ownership del DOM, themes y contraste.

### Cambio A · fallback de color source demasiado frágil

La primera versión de la surface propia usaba `background` como shorthand y `--code-normal` como fallback del color base de línea y de `syntax-common-variable`.

Corrección aplicada:

- usar `background-color`;
- color base de `syntax-editor-code-source` -> `--syntax-editor-code-color`, con fallback estable `--text-normal`;
- `syntax-common-variable` -> `--syntax-common-variable`, con fallback estable `--text-normal`;
- mantener variables `--code-*` para categorías semánticas específicas;
- no introducir ninguna rama por tema.

### Cambio B · consulta de contraste todavía demasiado global

Aunque `CommonContrastManager` ya filtraba escrituras a nodos bajo `.syntax-highlight-frame`, `commonTokens()` seguía consultando todos los `.syntax-common-*` del root y descartando después los que no eran propios.

Corrección aplicada:

- construir selector compuesto `.syntax-highlight-frame .syntax-common-*`;
- consultar directamente solo tokens de DOM propio;
- conservar el selector semántico simple únicamente para restaurar un nodo previamente ajustado que perdió su clase.

La siguiente revisión se realizó sobre el estado corregido completo. Esta revisión no cuenta como revisión limpia.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Se revisó la frontera entre el artifact Obsidian y el contrato npm del adapter.

### Hallazgo

El artifact construido y empaquetado deja imports externos reales para:

- `obsidian`;
- `@codemirror/autocomplete`;
- `@codemirror/commands`;
- `@codemirror/language`;
- `@codemirror/search`;
- `@codemirror/state`;
- `@codemirror/view`;
- `@lezer/common`;
- `@lezer/highlight`;
- `@lezer/lr`.

Sin embargo `packages/obsidian/package.json` declaraba únicamente `obsidian` como peer. Eso era suficiente para una carga directa dentro de la aplicación pero dejaba incompleto el contrato del paquete npm publicado, cuyo `dist/main.js` requiere también los módulos host anteriores.

### Corrección aplicada

Se añadieron como `peerDependencies` todos los módulos externos que el artifact requiere realmente:

- familia CodeMirror con rango `^6.0.0`;
- familia Lezer con rango `^1.0.0`;
- `obsidian` conserva `^1.7.2`.

No se añadieron `electron`, `@codemirror/collab`, `@codemirror/lint` ni built-ins de Node como peers porque forman parte de la frontera preventiva de externals del sample oficial pero el artifact actual no los importa.

La separación queda explícita:

- **externals de build**: frontera completa recomendada por el sample oficial;
- **peers npm**: módulos externos que el artifact publicado necesita resolver.

`npm ci`, `npm run check` y `pack:all` pasan después del cambio. El lockfile no necesitó modificación para este cambio de metadata de peer del workspace.

Esta revisión tampoco cuenta como limpia.
