# Revisión TM temporal · tests Fase 0D

Estado: TEMPORAL. Eliminar al terminar implementación + tests del ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

La primera ejecución de la suite nueva no llegó a Vitest porque TypeScript detectó que el helper `mountEditor()` inicializaba `extensions` con `[]` sin tipo explícito y después podía asignarle `Extension[]`. Bajo la configuración estricta del repositorio se infirió `any[]` y falló `typecheck`.

Corrección requerida:

- importar `Extension` desde `@codemirror/state` como tipo;
- declarar `let extensions: Extension[] = []`;
- no relajar `tsconfig`, no introducir casts y no alterar producción por un problema exclusivo del test.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Tras corregir el tipado, typecheck pasó y Vitest ejecutó los 10 tests de la suite temporal. Nueve pasaron. El único fallo fue la aserción `requestAnimationFrame` llamada exactamente dos veces dentro del test que usa `createMarkdownEditorExtensions()` completo: se observaron tres llamadas.

El tercer frame no pertenece al controller post-frame; el bridge de Live Preview también usa `requestAnimationFrame` para batching. Por tanto el test mezclaba dos responsabilidades y convertía el número total de frames del EditorView en contrato accidental.

Corrección requerida:

- retirar el conteo exacto de frames del test de wiring real;
- mantener en ese test las garantías de registro del ViewPlugin, fences top-level/quoted, roles, descendants semánticos, no-mutación, clear y unregister al destruir el EditorView;
- añadir un test aislado con un view diagnóstico mínimo registrado manualmente, sin otras extensiones que usen RAF, para demostrar que `captureLivePreview()` por sí sola espera exactamente dos animation frames.
