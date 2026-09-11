# Plan temporal · documentación y release 1.2.0

Estado: TEMPORAL. Eliminar antes de la release.

## Orden de trabajo

1. Reescribir `docs/architecture.md` como fuente de verdad técnica de capas y ownership.
2. Reescribir `docs/theme-integration.md` contra esa arquitectura, sin mencionar bridges privados eliminados.
3. Actualizar `packages/obsidian/README.md` como guía de uso/instalación que enlace a los dos documentos anteriores.
4. Actualizar `README.md` raíz con una visión breve del monorepo y enlaces claros.
5. Actualizar `docs/migration.md` solo donde el instalador/perfiles lo requieran.
6. Reconciliar `CHANGELOG.md` y publicar el bloque `1.2.0`.
7. Revisar el conjunto completo por coherencia y duplicación.
8. Limpiar diagnostics y documentos temporales.
9. Bump coordinado de versión a `1.2.0` en root/workspaces, manifest y versions metadata.
10. CI + `pack:all` final.
11. Fast-forward de `main` a la rama estabilizada.
12. Crear tag `v1.2.0` mediante GitHub Actions para disparar el workflow `Release` existente.
13. Verificar release, assets y notas autogeneradas.

## Reglas documentales

- `docs/architecture.md` es la autoridad sobre ownership, dependencia y runtime.
- `docs/theme-integration.md` es la autoridad sobre clases/variables/cascada/contraste.
- `packages/obsidian/README.md` describe capacidades y operación; no duplica detalles internos completos.
- `README.md` raíz no se convierte en manual de Obsidian.
- `CHANGELOG.md` enumera cambios de usuario/arquitectura sin narrar experimentos temporales.
- Ningún documento final menciona `.cm-embed-block` como dependencia de producción, diagnostics temporales o fases TM.
- Las diferencias visuales entre Editing y Reading se describen como motores host distintos, no como obligación de igualdad pixel-perfect.

## Release 1.2.0

El release mantiene el estilo histórico:

- tag/nombre: `v1.2.0`;
- notas: `--generate-notes` de GitHub;
- assets: tgz de workspaces + `main.js`, `manifest.json`, `styles.css`.

No crear release si el tag no apunta al mismo commit que `main` o si CI/pack falla.
