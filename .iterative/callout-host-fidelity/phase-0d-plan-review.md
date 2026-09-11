# Revisión TM temporal · plan Fase 0D

Estado: TEMPORAL. Eliminar al terminar implementación + tests del ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se detectaron tres huecos antes de implementar:

1. **controller stale entre recargas del plugin**: `_tmp-host-diagnostics.ts` reutiliza actualmente `window.SyntaxHighlightHostDiagnostics` si ya existe. Al ampliar su interfaz, una recarga de Obsidian podría conservar el objeto de una build anterior y hacer que `captureLivePreview()` no exista o que mantenga callbacks a EditorView destruidos. El plan debe exigir un controller versionado/reinstalado por cada carga del bundle y un registro de views perteneciente solo a esa carga.
2. **atributos demasiado amplios**: `snapshotElement()` copia hoy todos los atributos. Para la nueva captura profunda eso puede arrastrar `href`, `src` u otros valores no necesarios. El snapshot post-frame debe usar una whitelist diagnóstica (class/style/data-syntax*/data-callout*/contenteditable/role/tabindex/aria*/spellcheck y equivalentes estructurales) y excluir rutas/URLs.
3. **DOM mutable durante snapshot**: aunque se capture tras dos frames, CodeMirror puede reconciliar nodos entre consultas. Cada `posAtDOM`, `getComputedStyle` y recorrido de descendants debe tolerar nodo desconectado/excepción y registrar `mappingError`/`styleError` en vez de abortar la captura completa.

También se aclara que la instrumentación debe integrarse en el ViewPlugin ya existente de `createLivePreviewEmbeddedBlockExtension`, no crear una segunda extensión de lifecycle sin necesidad.
