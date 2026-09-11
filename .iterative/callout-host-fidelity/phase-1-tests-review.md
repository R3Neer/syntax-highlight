# Revisión TM temporal · tests Fase 1

Estado: TEMPORAL. Eliminar tras tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

El mock de `rendered-code-candidate` tenía una firma incompatible con su uso. Se corrigió el test, sin cambio de producción.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

La firma anterior satisfizo TypeScript pero dejó un parámetro ficticio no usado. Se cambió a `vi.fn<signature>().mockReturnValue(false)`.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

La primera ejecución amplia encontró:

- expectativas que recortaban incorrectamente el `\n` anterior al fence de cierre;
- rutas `.mjs` basadas en `import.meta.url` incompatibles con la transformación Vitest actual;
- intento de cargar `MarkdownView`/`main.ts` como runtime en Vitest;
- la última limitación reveló una frontera de testabilidad de producción y provocó la extracción de `markdown-render-mode.ts`.

La modificación production reabrió TM de implementación antes de continuar tests.

## Revisión 4

Resultado: CAMBIOS NECESARIOS.

Las suites `.mjs` pasaron a `process.cwd()`, pero ESLint exige importar `process` explícitamente. Se corrigió sin cambiar producción.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

`reading-real-dom.test.ts` llamaba “real” a un fixture happy-dom construido por nosotros. Se sustituyó por `reading-host-fixture.test.ts`, con nomenclatura explícitamente simulada y las mismas garantías útiles.

## Revisión 6

Resultado: CAMBIOS NECESARIOS.

Se auditó el ledger de garantías retiradas al eliminar el bridge privado. Aunque la cobertura ya existía, el ledger seguía apuntando genéricamente a “Fase 9” y no demostraba dónde vivía cada garantía.

Corrección documental:

- cada garantía automatizable apunta ahora a archivos concretos (`rendered-code-candidate.test.ts`, `reading-fallback.test.ts`, `reading-host-fixture.test.ts`, `editor-block-model.test.ts`, `markdown-mode-settings.test.ts`, `powershell-semantic-bridge.test.ts`, `_tmp-host-diagnostics.test.ts`, etc.);
- las garantías de recreación rendered permanecen explícitamente `GATE REAL`;
- comportamiento inseparable del MutationObserver retirado queda `ELIMINADA`, no convertido artificialmente en una nueva garantía;
- se registró evidencia de artifact/CI: host runtime external, language packages bundled, build y `pack:all` verdes.

No cambió producción ni assertions, pero la trazabilidad de cobertura sí cambió; por tanto no cuenta como revisión limpia.

## Revisión 7

Resultado: SIN CAMBIOS.

Primera revisión limpia de la suite ya corregida.

Se cruzó cada invariante del plan y del ledger con cobertura concreta:

- frontera runtime/external: tests unitarios + guardrail sobre metafile real en cada build;
- language packages: no externalizados y presentes en artifact CI; CodeMirror/Lezer/Obsidian permanecen imports externos;
- Reading fallback: detector puro, integración, furniture, unknown, idempotencia y aislamiento de excepciones;
- source model: top-level/quoted, viewport, cuerpo lógico completo, mapping físico, presentation/surface y caché;
- lifecycle: `_tmp-host-diagnostics.test.ts` destruye el `EditorView` y verifica desregistro;
- mode/settings: política pura sin fingir runtime Obsidian;
- PowerShell: variable/operator/number/builtin/string/comment en Reading y source;
- arquitectura: tests estáticos impiden reintroducir bridge/selectores privados en producción;
- recreación rendered de Live Preview permanece deliberadamente en gate real.

No se encontró garantía faltante ni test que requiera cambio. Esta es la primera revisión limpia.
