# Revisión TM temporal · tests Fase 1

Estado: TEMPORAL. Eliminar tras tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

La primera ejecución de los tests nuevos no llegó a completar TypeScript: el mock del test `rendered-code-candidate` declaraba una función sin argumentos y después se invocaba con un candidato.

Corrección: tipar el mock con la firma del candidato sin cambiar producción.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

La corrección anterior satisfizo TypeScript pero creó un parámetro ficticio no usado que ESLint rechazó.

Corrección: declarar la firma genérica de `vi.fn` y usar `mockReturnValue(false)` sin parámetro artificial.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

La primera ejecución amplia de Fase 9 encontró varios supuestos incorrectos de tests y un problema real de testabilidad de producción:

- los cuerpos lógicos preservan deliberadamente el salto de línea anterior al fence de cierre; las expectativas lo recortaban incorrectamente;
- los `.mjs` no pueden usar `fileURLToPath(import.meta.url)` bajo la transformación actual de Vitest en esta repo;
- `markdown-mode-settings.test.ts` intentaba cargar `MarkdownView`/`main.ts`, pero el módulo `obsidian` del entorno de test no es un runtime JS del host;
- esa última limitación reveló que la política mode/settings estaba enterrada en `main.ts`.

Correcciones de test:

- expectativas de cuerpos lógicos conservan `\n` final;
- las suites `.mjs` pasan a resolver archivos desde el root de trabajo;
- la matriz mode/settings pasa a apuntar a una política pura.

Corrección de producción provocada por tests:

- extracción de `markdown-render-mode.ts` y delegación desde `main.ts`.

Como producción cambió, se reabrió el TM de implementación y la expansión de tests quedó pausada hasta estabilizarlo de nuevo.

## Revisión 4

Resultado: CAMBIOS NECESARIOS.

Tras corregir las rutas de los `.mjs`, ESLint detectó `process` como global no declarado en esas suites.

Corrección: importar `process` explícitamente desde `node:process` en vez de ensanchar los globals de todos los `.mjs` de la repo.

No hubo cambio de producción.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Después de restabilizar implementación en Revisiones 9–10, se revisó la semántica de los propios nombres/fixtures de tests.

Hallazgo: `reading-real-dom.test.ts` usaba happy-dom y construía manualmente un DOM parecido al host, pero su nombre y `describe` lo presentaban como real. Eso viola la regla del plan de no confundir fixtures simulados con evidencia del host.

Corrección:

- reemplazarlo por `reading-host-fixture.test.ts`;
- renombrar helper/describe/casos para declarar explícitamente que es un fixture simulado con forma de host;
- conservar exactamente las garantías útiles de furniture identity y rechazo de ambigüedad.

No hubo cambio de producción.

La siguiente revisión debe auditar cobertura y fragilidad sobre el estado ya corregido. Se requieren dos revisiones consecutivas sin cambios para cerrar Fase 10.
