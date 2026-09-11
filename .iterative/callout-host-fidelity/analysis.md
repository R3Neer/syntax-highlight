# Análisis temporal: bloques anidados en Obsidian

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

## Evidencia observada

- Top-level `text` funciona en Reading y edición.
- Dentro de `[!task]`, añadir `>` a la línea de contenido solo recupera la alineación en edición. Reading y edición mostraron inicialmente divergencias distintas.
- El prefijo `>` ausente era un defecto de fuente, pero no la causa principal del fallo de integración.
- Nier amplifica las divergencias porque da una superficie y colores muy reconocibles a las clases nativas de code block.

## Hipótesis y estado

### H1: instalación/plugin viejo
DESCARTADA. El artifact exacto del build validado contiene las implementaciones de `is-loaded`, surface quoted y el puente semántico PowerShell.

### H2: el `>` ausente es la causa raíz
DESCARTADA como causa raíz. Es un problema de compatibilidad de entrada y Smart Editing, pero el caso canónico con `>` sigue requiriendo integración específica con el host.

### H3: Nier es la causa raíz
DESCARTADA. Nier hace visibles los fallos, pero no los origina. La solución no debe ramificar por nombre de tema.

### H4: Reading/LP rendered no entra en nuestro renderer para el bloque anidado
DESCARTADA por captura real instrumentada. El processor especializado reclama y termina de renderizar PowerShell dentro de `.cm-embed-block.cm-callout`.

La captura real demostró la secuencia:

1. `reading-specialized / claimed` sobre `DIV.block-language-powershell` dentro de `callout-content`.
2. `reading-specialized / rendered` con `PRE.syntax-highlight-block.has-line-numbers` y `CODE.language-powershell`.
3. Inmediatamente después, `reading-fallback / observed` veía el mismo subtree mutado a `PRE.syntax-highlight-block.has-line-numbers.language-powershell` y `CODE.language-powershell.is-loaded`.

El arreglo de Fase 0B emite `CODE.language-* is-loaded` desde nuestro renderer. La validación posterior en Obsidian real confirmó que PRE deja de recibir `language-*`. Reading View queda estable.

Subhipótesis H4a: el detector fallback es demasiado estrecho. CONFIRMADA como defecto real independiente. El detector compartido deberá resolver metadata desde PRE y/o CODE para hosts nativos no procesados.

Subhipótesis H4b: el fallback de Reading puede perder clasificación tardía. ABIERTA pero no explica el caso canónico capturado: el processor especializado sí reclama ese bloque antes de la mutación tardía.

### H5: el bridge de widget de Live Preview arregla por sí solo el estado de edición mostrado
DESCARTADA. Live Preview alterna entre fuente y widgets renderizados según cursor. Top-level y callout cambian de representación de forma independiente.

### H6: las decorations de fuente anidadas son incompletas
CONFIRMADA como síntoma, pero la técnica de corrección de Fase 0C queda FALSADA por validación real.

Fase 0C añadió `Decoration.line` con `HyperMD-codeblock` + `*-bg` sobre opening/body/closing quoted. También añadió `tags.standard(tags.variableName)` → `cm-builtin`/`token builtin` para PowerShell. La generación lógica y un `EditorView` aislado de tests muestran esas clases, pero el build validado en Obsidian real se ve exactamente igual que antes.

### H7: nuestros tests llamados “realistic/real DOM” representan el host real
DESCARTADA. Construyen manualmente DOM/EditorView y no incluyen la composición real de extensiones, widgets, reconciliación ni estilos computados de Obsidian.

### H8: el artifact instalado no contiene Fase 0C
DESCARTADA. Se descargó el artifact CI del mismo head validado y `dist/main.js` contiene las clases de surface quoted y el puente `cm-builtin`.

## Nueva frontera descubierta: generación ≠ materialización real

La Fase 0C demostró que hay que separar cuatro niveles:

1. `findCodeBlocks()` produce el modelo físico/lógico esperado.
2. `buildSyntaxDecorations()` produce `Decoration.mark/line` con las clases esperadas.
3. Un `EditorView` genérico de Vitest/happy-dom materializa esas decorations.
4. Obsidian real materializa/reconcilia su DOM y aplica su pila completa de extensiones/tema.

Los niveles 1–3 pasan; el nivel 4 falla visualmente. Por tanto no es correcto diseñar otro fix apoyándose solo en `DecorationSet` o en un `EditorView` desnudo.

## Por qué el CSS de Nier no basta para explicar el fallo

El CSS actual de Nier asigna fondo negro a `div.HyperMD-codeblock-begin-bg`, `div.HyperMD-codeblock-bg` y `div.HyperMD-codeblock-end-bg` bajo `.cm-s-obsidian`. También colorea `.HyperMD-codeblock .cm-builtin`, `.cm-number`, `.cm-operator`, etc.

Si nuestras clases de Fase 0C estuvieran presentes en el nodo real y ancestry esperado, el resultado debería cambiar. Que no cambie indica al menos una de estas posibilidades:

- la `Decoration.line` no queda en el `.cm-line` final;
- queda en otro nodo/wrapper;
- Obsidian reemplaza/reconcilia ese nodo después;
- las `Decoration.mark` no sobreviven al DOM final esperado;
- el ancestry final no activa las reglas temáticas;
- el normalizador de contraste altera color después de materializarse.

El último punto solo puede explicar color, no simultáneamente la ausencia de superficie negra.

## Limitación de la instrumentación actual

`traceHostDiagnostic("live-preview-source", ...)` se ejecuta dentro de `buildSyntaxDecorations()`. En ese momento conocemos source, posiciones y decorations que pretendemos producir, pero aún no el DOM final tras la reconciliación del frame.

Por tanto esa traza no sirve para decidir la próxima arquitectura de surface/color.

## Fase 0D necesaria: diagnóstico post-frame por posición documental

Antes de otro fix de producción, añadir instrumentación temporal que se ejecute después de un frame real de CodeMirror/Obsidian y capture, para top-level y quoted:

- `.cm-line` asociado a opening/body/closing mediante posiciones del documento y `EditorView.domAtPos()` o mecanismo equivalente;
- tag, clases y atributos del nodo de línea final;
- estructura sanitizada de descendientes relevantes;
- spans que contienen `$foo`, `42`, `=`, `Write-Host` y sus clases finales;
- `background-color`, `color`, `display`, `position`, `padding`, `border` y otras propiedades mínimas necesarias para distinguir surface vs inline-code;
- ancestry hasta `.cm-s-obsidian`;
- presencia de `data-syntax-contrast-adjusted` y color inline del normalizador;
- estado después de `requestAnimationFrame`, no durante la construcción del `DecorationSet`;
- transición cursor top-level → quoted → fuera para detectar reemplazo/recreación.

La instrumentación debe ser inerte por defecto, sanitizable, temporal y no modificar el DOM observado.

## Decisiones que NO pueden tomarse todavía

Hasta obtener Fase 0D no se decidirá entre:

- seguir usando `Decoration.line` con otra precedencia/forma;
- usar una clase propia de surface en vez de clases host;
- reflejar estilos computados de un code block nativo;
- introducir un bridge post-frame específico de DOM;
- tocar o no el `CommonContrastManager` para este caso.

Elegir una de ellas ahora sería repetir el error metodológico de Fase 0C.

## Hipótesis de trabajo consolidada

Persisten cuatro fronteras funcionales, pero la cuarta se divide ahora en intención y materialización:

1. **Semántica de fuente del adaptador**: aceptar el dialecto efectivo de Obsidian para fenced blocks dentro de blockquotes/callouts, conservando mapeo físico/lógico, mientras Smart Editing escribe la forma canónica con `>`.
2. **Host renderizado nativo no reclamado**: detector/lifecycle Reading + LP rendered debe resolver metadata de forma robusta y fail-closed.
3. **Host ya reclamado por Syntax Highlight**: nuestro renderer debe impedir el segundo pase nativo; `is-loaded` está validado en host real.
4. **Host fuente visible**:
   - 4a. producir syntax/presentation/surface en coordenadas documentales correctas;
   - 4b. demostrar cómo Obsidian real materializa esas decorations y estilos después del frame.

Fase 0C cubrió 4a en tests, pero la validación real demuestra que 4b sigue sin entenderse.

## Candidatos a eliminación detectados

- `reading-real-dom.test.ts`: nombre engañoso y fixture inventado; candidato a consolidación/eliminación solo si sus aserciones se migran a una suite basada en fixture capturado.
- `live-preview-extension-integration.test.ts`: prueba un `EditorView` genérico, no Obsidian real. Conservar su garantía de wiring, pero no usarla como evidencia de fidelidad del host.
- `live-preview-host.ts` y `reading-host.ts`: NO sobran. Pueden converger parcialmente en un bridge común.
- `contrast-manager.ts`: NO tocar por intuición. Solo cambiar si Fase 0D demuestra que el color final se altera por su lifecycle o por un fondo efectivo mal calculado.
- `live-preview-source-surface.test.ts`: conservar temporalmente como garantía de generación lógica, pero dejar de considerarlo prueba suficiente de integración real.
