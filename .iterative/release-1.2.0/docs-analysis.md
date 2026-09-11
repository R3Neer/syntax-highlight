# Análisis temporal · documentación y release 1.2.0

Estado: TEMPORAL. Eliminar antes de la release.

## Alcance

Actualizar documentación pública para que describa exclusivamente la arquitectura final que pasó el gate real de Obsidian.

## Documentos que requieren cambio sustancial

### `README.md`

Debe seguir siendo una entrada breve al monorepo, pero ahora debe señalar con claridad las capacidades de Obsidian introducidas desde 1.1.0: lenguajes comunes, PowerShell, fences quoted/callouts y presentación Text/Markdown. No debe convertirse en documentación específica del plugin.

### `docs/architecture.md`

La versión actual solo cubre la dirección general de dependencias. Debe documentar:

- separación core / language packs / renderers / host adapters;
- arquitectura del adaptador Obsidian source vs rendered;
- modelo quote-aware físico/lógico;
- semantic engine común tree/stream/plain;
- runtime CodeMirror/Lezer compartido con Obsidian;
- ownership del DOM y prohibición de mutar DOM de CodeMirror;
- fallback estructural de Reading;
- contraste restringido al DOM rendered propiedad del plugin.

### `docs/theme-integration.md`

Está obsoleto en dos puntos centrales:

- afirma que Reading emite clases Prism y Editing clases CodeMirror como contrato temático principal;
- describe un bridge de Live Preview basado en `.cm-embed-block` + MutationObserver que fue eliminado.

Debe reescribirse para reflejar:

- una taxonomía semántica propia `syntax-common-*` compartida;
- integración mediante variables CSS públicas de Obsidian;
- source quoted oscuro con variables propias y `--blockquote-background-color` scoped;
- contrast manager solo sobre `.syntax-highlight-frame` rendered;
- ViewPlugin + decorations para source;
- processors/postprocessor estructural para rendered/Reading.

### `packages/obsidian/README.md`

Debe eliminar la descripción del bridge privado y explicar la arquitectura soportada actual, manteniendo instalación, perfiles y manual check.

## Documentos con cambio acotado

### `CHANGELOG.md`

Convertir `Unreleased` en `1.2.0` y reescribir los bullets que describen la arquitectura intermedia eliminada. Mantener las mejoras funcionales reales.

### `docs/migration.md`

Añadir que la misma build puede instalarse con perfiles `common` o `mud` y que esos perfiles solo cambian la configuración del vault destino.

## Documentos sin cambio

- `docs/language-packs.md`
- `docs/mcp-apps.md`

No hay cambios de contrato que justifiquen tocar esos textos.

## Versión

Recomendación: `1.2.0`.

Razones:

- última GitHub release: `v1.1.0`;
- el código del monorepo ya estaba en `1.1.1` por mejoras MUD previas;
- desde `v1.1.0` hay cientos de commits y una ampliación sustancial de capacidades del adaptador Obsidian;
- no se identifica ruptura deliberada de las APIs públicas de los paquetes que justifique `2.0.0`;
- el alcance excede claramente un patch.

## Release style

Las releases anteriores usan:

- nombre/título igual al tag (`v1.0.0`, `v1.1.0`);
- notas autogeneradas por GitHub;
- assets npm `.tgz` y los tres archivos del plugin Obsidian (`main.js`, `manifest.json`, `styles.css`).

La 1.2.0 debe conservar ese estilo.

## Limpieza previa obligatoria

Antes de versionar/release:

- eliminar `.iterative/callout-host-fidelity` y `.iterative/release-1.2.0`;
- eliminar `_tmp-host-diagnostics.ts` y sus tests;
- quitar wiring de diagnostics de `editor.ts`;
- cerrar excepciones de architecture tests que solo existían para diagnostics temporales;
- confirmar CI + `pack:all` verdes sin instrumentación.
