# Revisión TM temporal · tests Fase 4

Estado: TEMPORAL. Eliminar tras gate satisfactorio y limpieza final.

## Revisión 1

Resultado: SIN CAMBIOS.

Se revisó la cobertura nueva contra el plan arquitectónico:

- el test fija `--blockquote-background-color` dentro del selector propio quoted-source;
- exige que derive de `--syntax-editor-code-background` con fallback `#000`;
- conserva la comprobación del `background-color` directo y de `--code-background: transparent`;
- prohíbe `--blockquote-color` dentro del scope;
- verifica que la variable pública solo se declara una vez en `styles.css`;
- las pruebas existentes siguen cubriendo ausencia de `!important`, `HyperMD-*`, `.cm-inline-code`, `.cm-embed-block` y `.cm-callout` en la sección propia;
- el test no referencia themes concretos ni pretende simular Obsidian real.

CI completa y `pack:all` pasan.

No se identificó cambio necesario.

Falta una segunda revisión limpia consecutiva.
