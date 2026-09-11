# Plan de implementación temporal · Fase 4

Estado: TEMPORAL. Eliminar tras gate satisfactorio y limpieza final.

Checklist operativo. La arquitectura estable vive en `phase-4-architecture-plan.md`.

## 0. Baseline y scope

- [x] Confirmar CI + `pack:all` verdes antes de producción.
- [x] Mantener diagnostics temporales activos hasta gate real.
- [x] Autorizar cambios funcionales solo en `packages/obsidian/styles.css`.
- [x] No tocar TypeScript, routing, settings, semantic engine, Smart Editing ni contrast manager.
- [x] No introducir private selectors, `!important`, DOM mutation ni nombres de themes.

## 1. CSS quoted-source

En `.cm-line.syntax-editor-code-source`:

- [x] Añadir `--blockquote-background-color: var(--syntax-editor-code-background, #000);`.
- [x] Mantener `background-color: var(--syntax-editor-code-background, #000);`.
- [x] Mantener `--code-background: transparent;`.
- [x] No redefinir `--blockquote-color`.
- [x] No tocar borders, typography, padding ni margins.
- [x] No cambiar la paleta `--syntax-common-*` ni los colores de line numbers.

## 2. Compatibilidad antes del TM de implementación

- [x] `npm run lint` verde.
- [x] `npm run typecheck` verde.
- [x] suite existente verde.
- [x] `npm run build` verde.
- [x] `npm run pack:all` verde.

## 3. TM de implementación

Revisar el diff funcional completo:

- [x] Scope: solo `styles.css` funcional.
- [x] API pública: solo variable documentada `--blockquote-background-color`.
- [x] Cascada: variable scoped a `.cm-line.syntax-editor-code-source`.
- [x] Fallback directo `background-color` preservado.
- [x] `--code-background: transparent` preservado.
- [x] Sin `!important`, private selectors, theme names o cambios JS.
- [x] Primera revisión completa SIN CAMBIOS.
- [x] Segunda revisión consecutiva SIN CAMBIOS.
- [x] Solo entonces empezar tests nuevos.

## 4. Tests nuevos de Fase 4

### 4.1 Contrato CSS estático

- [x] Dentro del bloque `.cm-line.syntax-editor-code-source` existe `--blockquote-background-color`.
- [x] Su valor deriva de `--syntax-editor-code-background` con fallback `#000`.
- [x] `background-color` directo sigue derivando de la misma variable propia.
- [x] `--code-background: transparent` sigue presente.
- [x] No se añade `--blockquote-color` dentro del bloque.
- [x] No aparece `!important` dentro del bloque.

### 4.2 Scope / architecture

- [x] No se añade selector `.HyperMD-quote` en producción.
- [x] No se añade selector de theme específico.
- [x] No se redefine globalmente `--blockquote-background-color` fuera del scope quoted-source.

### 4.3 Regresiones

- [x] `quoted-source-dark-palette.test.mjs` verde.
- [x] `theme-compat.test.ts` verde.
- [x] semantic suites Fase 2 verdes.
- [x] architecture-boundaries Fase 1 verde.
- [x] diagnostics temporales verdes.
- [x] build + `pack:all` verdes.

## 5. TM de tests

- [x] Revisar cobertura contra arquitectura/checklist.
- [x] Revisar que el test CSS no acople el plugin a Nier ni a estructura privada de Obsidian.
- [x] Revisar que las assertions fijen el contrato público, no formatting incidental del CSS.
- [x] Primera revisión completa SIN CAMBIOS.
- [x] Segunda revisión consecutiva SIN CAMBIOS.
- [x] CI + `pack:all` verdes.

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
