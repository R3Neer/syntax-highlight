# Revisión TM temporal · tests Fase 0D

Estado: TEMPORAL. Eliminar al terminar implementación + tests del ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

La primera ejecución de la suite nueva no llegó a Vitest porque TypeScript detectó que el helper `mountEditor()` inicializaba `extensions` con `[]` sin tipo explícito y después podía asignarle `Extension[]`. Bajo la configuración estricta del repositorio se infirió `any[]` y falló `typecheck`.

Corrección requerida:

- importar `Extension` desde `@codemirror/state` como tipo;
- declarar `let extensions: Extension[] = []`;
- no relajar `tsconfig`, no introducir casts y no alterar producción por un problema exclusivo del test.
