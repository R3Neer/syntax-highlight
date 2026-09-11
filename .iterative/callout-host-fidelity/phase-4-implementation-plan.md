# Plan de implementación temporal · Fase 4

Estado: TEMPORAL. Eliminar tras gate satisfactorio y limpieza final.

Checklist operativo. La arquitectura estable vive en `phase-4-architecture-plan.md`.

## 0. Baseline y scope

- [ ] Confirmar CI + `pack:all` verdes antes de producción.
- [ ] Mantener diagnostics temporales activos hasta gate real.
- [ ] Autorizar cambios funcionales solo en `packages/obsidian/styles.css`.
- [ ] No tocar TypeScript, routing, settings, semantic engine, Smart Editing ni contrast manager.
- [ ] No introducir private selectors, `!important`, DOM mutation ni nombres de themes.

## 1. CSS quoted-source

En `.cm-line.syntax-editor-code-source`:

- [ ] Añadir `--blockquote-background-color: var(--syntax-editor-code-background, #000);`.
- [ ] Mantener `background-color: var(--syntax-editor-code-background, #000);`.
- [ ] Mantener `--code-background: transparent;`.
- [ ] No redefinir `--blockquote-color`.
- [ ] No tocar borders, typography, padding ni margins.
- [ ] No cambiar la paleta `--syntax-common-*` ni los colores de line numbers.

## 2. Compatibilidad antes del TM de implementación

- [ ] `npm run lint` verde.
- [ ] `npm run typecheck` verde.
- [ ] suite existente verde.
- [ ] `npm run build` verde.
- [ ] `npm run pack:all` verde.

## 3. TM de implementación

Revisar el diff funcional completo:

- [ ] Scope: solo `styles.css` funcional.
- [ ] API pública: solo variable documentada `--blockquote-background-color`.
- [ ] Cascada: variable scoped a `.cm-line.syntax-editor-code-source`.
- [ ] Fallback directo `background-color` preservado.
- [ ] `--code-background: transparent` preservado.
- [ ] Sin `!important`, private selectors, theme names o cambios JS.
- [ ] Primera revisión completa SIN CAMBIOS.
- [ ] Segunda revisión consecutiva SIN CAMBIOS.
- [ ] Solo entonces empezar tests nuevos.

## 4. Tests nuevos de Fase 4

### 4.1 Contrato CSS estático

- [ ] Dentro del bloque `.cm-line.syntax-editor-code-source` existe `--blockquote-background-color`.
- [ ] Su valor deriva de `--syntax-editor-code-background` con fallback `#000`.
- [ ] `background-color` directo sigue derivando de la misma variable propia.
- [ ] `--code-background: transparent` sigue presente.
- [ ] No se añade `--blockquote-color` dentro del bloque.
- [ ] No aparece `!important` dentro del bloque.

### 4.2 Scope / architecture

- [ ] No se añade selector `.HyperMD-quote` en producción.
- [ ] No se añade selector de theme específico.
- [ ] No se redefine globalmente `--blockquote-background-color` fuera del scope quoted-source.

### 4.3 Regresiones

- [ ] `quoted-source-dark-palette.test.mjs` verde.
- [ ] `theme-compat.test.ts` verde.
- [ ] semantic suites Fase 2 verdes.
- [ ] architecture-boundaries Fase 1 verde.
- [ ] diagnostics temporales verdes.
- [ ] build + `pack:all` verdes.

## 5. TM de tests

- [ ] Revisar cobertura contra arquitectura/checklist.
- [ ] Revisar que el test CSS no acople el plugin a Nier ni a estructura privada de Obsidian.
- [ ] Revisar que las assertions fijen el contrato público, no formatting incidental del CSS.
- [ ] Primera revisión completa SIN CAMBIOS.
- [ ] Segunda revisión consecutiva SIN CAMBIOS.
- [ ] CI + `pack:all` verdes.

## 6. Gate Obsidian real

Con foco dentro de PowerShell quoted:

- [ ] opening/body/closing conservan `syntax-editor-code-source`.
- [ ] `getComputedStyle(line).backgroundColor` deja de ser transparente.
- [ ] surface visual continua y negra por defecto.
- [ ] semantic colors permanecen.
- [ ] line numbers permanecen.
- [ ] spans `cm-inline-code` no forman píldoras claras.

Casos adicionales:

- [ ] Bash quoted source conserva surface + semántica.
- [ ] Text quoted source conserva surface + presentation.
- [ ] prose del callout fuera del fence conserva background del theme.
- [ ] cursor fuera vuelve a rendered sin regresión.
- [ ] Reading View no cambia.

## 7. Decisión posterior

- [ ] Si gate Fase 4 pasa: volver al checklist combinado y ejecutar gate aislado de settings si sigue pendiente.
- [ ] Si el fondo sigue transparente: capturar valor computado de `--blockquote-background-color` y reabrir análisis antes de cualquier aumento de especificidad.
- [ ] No limpiar diagnostics ni documentos temporales hasta cerrar todos los gates pendientes.
