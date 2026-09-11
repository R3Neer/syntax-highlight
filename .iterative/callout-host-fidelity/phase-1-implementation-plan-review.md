# Revisión TM temporal · plan de implementación Fase 1

Estado: TEMPORAL. Eliminar al cerrar el ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

La primera revisión se centró en si el orden operativo podía ejecutar la arquitectura sin introducir garantías implícitas o perder cobertura durante la migración.

Cambios incorporados:

1. invalidación de caché conservadora (`docChanged`/revision limpian; viewport/selection reutilizan);
2. ledger de garantías retiradas antes de eliminar tests/APIs del bridge;
3. excepción temporal de selectors privados solo para `_tmp-host-diagnostics.ts` hasta el gate;
4. gate manual específico para nested rendered sin bridge DOM.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

El plan de implementación había quedado desfasado al reabrirse y corregirse el plan arquitectónico en sus Revisiones 5–7.

Reconciliación incorporada:

1. **Frontera de build completa.** Fase 1 enumera ahora `obsidian`, `electron`, la familia CodeMirror del sample oficial, Lezer y `builtinModules`. `electron`/built-ins se tratan como externals preventivos, no como peerDependencies automáticos.
2. **Peers separados de externals.** El paquete npm solo declara peers que correspondan a runtime imports/identidad compartida; la lista de externals del artifact sigue el sample oficial completo.
3. **Fallback Markdown correctamente acotado.** Su garantía contractual es Reading View. No se intenta bloquear una ejecución incidental en otro renderer Markdown, pero LP no depende de ella.
4. **Gate LP corregido.** Se exige validar `registerMarkdownCodeBlockProcessor` como ruta oficial de nested rendered sin considerar necesario que el generic postprocessor aparezca en LP.
5. **Tests de arquitectura actualizados.** La futura verificación de externals comprueba la lista oficial adoptada completa y el gate real cubre el contrato que no debe simularse con DOM ficticio.

El orden general de ejecución no cambia.
