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

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

Tras separar el contrato temporal del wiring, la suite completa quedó verde. La revisión de cobertura contra las correcciones introducidas durante el TM de implementación detectó dos huecos:

1. se prueba aislamiento por `EditorView`, pero no el aislamiento **por nodo** añadido en la Revisión 5 de implementación. Una `.cm-line` que falle durante snapshot debe producir `snapshotError:true` y no impedir capturar otra línea sana del mismo view;
2. `registerLivePreviewDiagnosticView()` recibe `acceptedFences` como callback para reflejar cambios del registry/settings sin recrear el view, pero ningún test demuestra que el provider se evalúe de nuevo en capturas sucesivas.

Corrección requerida:

- añadir una regresión con dos `.cm-line` donde la primera falle al inspeccionar `classList` y la segunda siga apareciendo sana;
- añadir una regresión que cambie el conjunto devuelto por `acceptedFences` entre dos capturas del mismo view y compruebe que los fences lógicos se recalculan;
- no tocar producción para satisfacer estas pruebas.
