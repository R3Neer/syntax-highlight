# Revisión TM temporal · redacción documentación 1.2.0

Estado: TEMPORAL. Eliminar antes de la release.

## Revisión 1

Resultado: SIN CAMBIOS.

Se revisó el conjunto `README.md`, `docs/architecture.md`, `docs/theme-integration.md`, `packages/obsidian/README.md`, `docs/migration.md` y `CHANGELOG.md` contra el código final y el gate real.

Confirmaciones:

- no se describe el bridge privado `.cm-embed-block` como arquitectura de producción;
- source Live Preview queda bajo ownership de CodeMirror + decorations;
- rendered Markdown queda bajo processors/fallback estructural;
- el modelo físico/lógico quoted se describe de forma coherente;
- PowerShell se documenta como stream-backed dentro de la taxonomía semántica común;
- contraste JS queda limitado a `.syntax-highlight-frame` rendered;
- la surface quoted usa variables propias y `--blockquote-background-color` público;
- Text/Markdown presentation mantiene su gramática y política de furniture;
- perfiles `common`/`mud` se explican sin mezclar configuración entre vaults;
- `CHANGELOG.md` describe la arquitectura final, no experimentos intermedios.

No se identificó cambio necesario.

## Revisión 2

Resultado: SIN CAMBIOS.

Se revisó duplicación y separación de fuentes de verdad:

- README raíz permanece breve y enlaza a la documentación especializada;
- `docs/architecture.md` concentra ownership/runtime/layering;
- `docs/theme-integration.md` concentra clases, variables, cascada y contraste;
- el README de Obsidian se limita a capacidades, instalación y manual check;
- `CHANGELOG.md` expresa cambios de release, no instrucciones internas;
- no hay exigencia de igualdad pixel-perfect entre Editing y Reading;
- no aparecen diagnostics/TM como comportamiento de producto.

Revisiones 1 y 2 consecutivas sin cambios: redacción estable según TM.
