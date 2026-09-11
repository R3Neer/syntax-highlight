# Análisis temporal · Fase 3 · frontera quoted-source con foco preservado

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Contexto

El gate manual de Fase 2 confirmó que:

- PowerShell top-level source se colorea;
- PowerShell/Bash/Text rendered funcionan de forma regular;
- Reading especializado entra por `reading-specialized` y renderiza;
- el source quoted visible al editar un callout no adquiere la surface negra esperada;
- el diagnóstico lógico `live-preview-source` reclama repetidamente los bloques quoted.

Para localizar la discrepancia se ejecutó `captureLivePreview()` desde DevTools con el cursor previamente colocado dentro del bloque PowerShell quoted.

## Evidencia nueva

La captura post-frame devuelve:

- `hasFocus: false`;
- cuatro `fences` lógicos: PowerShell top-level, PowerShell quoted, Bash quoted y Text quoted;
- cuatro `embeddedHosts`;
- para los quoted, hosts `.cm-embed-block.cm-callout` con `pre: true`, `code: true`, `cmLine: false`;
- `cap.lines.filter(line => line.role?.language === "powershell")` devuelve `[]`;
- `document.querySelectorAll('.cm-line.syntax-editor-code-source').length === 0`;
- existen numerosos eventos `live-preview-source / claimed` para `$nested = 99`.

## Interpretación correcta

La captura actual **no representa el estado quoted-source con foco**.

Al hacer clic en DevTools, el `EditorView` pierde el foco (`hasFocus: false`). Obsidian recompone los callouts como `cm-embed-block` rendered antes de que el diagnóstico post-frame tome la instantánea. Por eso la captura ve `pre/code` y no `.cm-line` en los callouts.

Esto invalida una inferencia posible pero incorrecta: `quotedSourceLines: 0` no demuestra que las decorations quoted-source nunca puedan materializarse. Demuestra únicamente que no están materializadas en el estado rendered posterior a la pérdida de foco.

## Dato que sí es concluyente

La coexistencia de:

- múltiples `live-preview-source / claimed`, y
- cero `.cm-line.syntax-editor-code-source` en la captura sin foco

confirma que **la reclamación lógica del bloque y la materialización DOM son fronteras distintas**.

`traceVisibleBlock()` se ejecuta mientras el ViewPlugin construye decorations a partir del documento/modelo. No demuestra que el DOM final visible conserve esas decorations después de la reconciliación de Obsidian.

## Estado del código relevante

`editor.ts` actualmente:

- construye un `EditorBlockModel` para el documento;
- materializa `Decoration.line`, `Decoration.mark` y widgets únicamente sobre rangos visibles;
- recalcula las decorations cuando cambia el documento, viewport o selección (`update.selectionSet`);
- para quoted source, intenta aplicar line semantics a las posiciones físicas del documento exterior;
- no muta DOM directamente.

Por tanto el fallo restante no puede atribuirse simplemente a que el plugin "no reacciona al cursor".

## Hipótesis abiertas

### H1 · mismo EditorView, reconciliación/precedencia del host

Cuando el cursor entra en el callout, las líneas quoted siguen materializándose dentro del mismo `EditorView` exterior, pero las extensiones de Live Preview de Obsidian sustituyen/preceden la representación de línea de forma que nuestras `Decoration.line` no terminan sobre el nodo visible esperado.

### H2 · superficie editable interna del callout

Cuando el cursor entra en el callout, Obsidian activa una superficie editable interna dentro de `.cm-embed-block` (potencialmente otro editor o DOM administrado por el renderer del callout). Las decorations calculadas sobre el `EditorView` exterior siguen siendo lógicamente correctas pero no poseen ese DOM editable.

La evidencia actual sin foco hace H2 plausible, pero no la prueba, porque el acto de abrir DevTools cambia el estado observado.

## Settings: reinterpretación del gate previo

Dos checks previos no deben considerarse todavía prueba de bug de gating:

1. `.cm-content [class*="syntax-common-"]` puede contar tokens dentro de widgets rendered (`.syntax-highlight-frame`) que viven dentro de `.cm-content`, no solo marks source.
2. contar `.syntax-highlight-frame` en Reading inmediatamente después de cambiar settings puede observar DOM ya renderizado antes de que el host fuerce un rerender.

Los settings deben volver a comprobarse después de resolver la frontera source, con selectores/acciones que distingan DOM editable propio de widgets rendered y fuerzen un nuevo render cuando proceda.

## Evidencia que falta antes de arquitectura

Hace falta una captura **post-frame con el foco preservado en el editor**, tomada mientras el cursor está realmente dentro del PowerShell quoted source.

La captura debe responder:

- si el `EditorView` registrado conserva `hasFocus: true`;
- si aparecen `.cm-line` correspondientes a opening/body/closing quoted;
- si esas líneas llevan `syntax-editor-code-source`;
- si el `.cm-embed-block.cm-callout` sigue existiendo durante edición y contiene `.cm-line`/otro editor;
- si existe un segundo `.cm-content`/`.cm-editor` dentro del embedded host;
- qué clases/estilos finales reciben opening/body/closing y los spans semánticos.

## Método de captura

No hace falta modificar producción todavía. El controller actual puede ejecutarse con `setTimeout` desde DevTools; el usuario vuelve a hacer clic en el bloque quoted antes de que venza el delay. Así `captureLivePreview()` corre cuando el editor vuelve a tener foco.

Solo después de esta evidencia se redactará/reabrirá el plan arquitectónico. Elegir H1 o H2 sin esta captura repetiría exactamente el error metodológico que las fases anteriores intentan eliminar.
