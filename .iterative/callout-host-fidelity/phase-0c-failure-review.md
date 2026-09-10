# Revisión temporal · fallo de validación Fase 0C

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

## Hecho observado

La validación manual del build `0c37d910f26f525365b6cf7aeeb6c4e9c622b71c` en Obsidian real no muestra ninguna mejora visual respecto de las capturas anteriores:

- el source quoted dentro del callout sigue sin adquirir la superficie de code block del top-level;
- los fragmentos del quoted source siguen presentándose con apariencia de inline code;
- los colores de PowerShell siguen sin resultar visibles como deberían;
- Reading View continúa funcionando tras la corrección anterior de `is-loaded`.

## Lo que queda descartado

### R1 · build antiguo o artifact sin los cambios

DESCARTADO.

Se descargó el artifact exacto de CI correspondiente al head `0c37d910...` y `dist/main.js` contiene:

- `syntax-quoted-code-source HyperMD-codeblock`;
- `HyperMD-codeblock-begin-bg`, `HyperMD-codeblock-bg` y `HyperMD-codeblock-end-bg`;
- el puente de PowerShell para `tags.standard(tags.variableName)` hacia `cm-builtin` / `token builtin`.

Por tanto el fallo no se explica por ausencia de la implementación en el paquete construido.

### R2 · Nier no responde a las clases que elegimos

DESCARTADO como explicación suficiente.

El `theme.css` actual de Nier define explícitamente fondo negro para `div.HyperMD-codeblock-begin-bg`, `div.HyperMD-codeblock-bg` y `div.HyperMD-codeblock-end-bg` bajo `.cm-s-obsidian`. También asigna color a `.HyperMD-codeblock .cm-builtin` y al resto de clases `cm-*` relevantes.

Si esas clases estuvieran materializadas sobre el DOM real con el ancestry esperado, debería existir una diferencia visual. Que el resultado sea idéntico demuestra que nuestra prueba de integración no modela correctamente al menos una frontera del host real.

## Error metodológico de la Fase 0C

Los tests añadidos verifican tres niveles, pero falta el cuarto y decisivo:

1. **generación lógica**: `findCodeBlocks()` y `buildSyntaxDecorations()` producen rangos y clases esperadas;
2. **materialización CodeMirror genérica**: un `EditorView` creado por Vitest/happy-dom materializa esas decorations;
3. **semántica temática estática**: Nier contiene reglas compatibles con los nombres de clase elegidos;
4. **materialización Obsidian real**: NO fue observada antes de considerar estable la implementación.

La validación manual demuestra que inferimos 4 a partir de 1+2+3. Ese salto no estaba justificado.

## Hipótesis abiertas

### H-A · las line decorations no sobreviven a la composición real de extensiones de Obsidian

Posible. El `EditorView` de test no incluye la pila de extensiones/precendencias de Obsidian. Las classes pueden ser sustituidas, no materializarse sobre el nodo esperado o terminar en una estructura distinta a la simulada.

### H-B · el source visible del callout usa una representación DOM/lifecycle distinta a la que inspecciona el test

Posible y consistente con el problema original. Aunque las posiciones documentales sean correctas y nuestros widgets de línea aparezcan, opening/body/closing pueden materializarse con wrappers y spans que no coinciden con el `EditorView` aislado.

### H-C · las marcas `cm-*` sí se generan pero no quedan en un ancestry que active el CSS del tema

Posible. Los tests solo prueban que la clase forma parte de una `Decoration.mark`; no capturan el DOM post-materialización de Obsidian ni el estilo computado final.

### H-D · el normalizador de contraste aplana o sustituye el color temático después de que aparezcan las marcas

Posible para color, pero no explica por sí sola la ausencia del fondo negro quoted. Debe investigarse como frontera separada, no usarse como explicación global.

## Consecuencia

No debe añadirse otro parche CSS ni otra clase host por intuición.

Antes de rediseñar la solución hay que observar el DOM post-materialización de Obsidian real, por posición documental, incluyendo:

- `className` del `.cm-line` real de opening/body/closing top-level y quoted;
- `outerHTML` sanitizado o estructura equivalente de los spans del cuerpo;
- clases efectivas de `$foo`, `42`, `=`, `Write-Host`;
- `background-color` y `color` computados de línea y tokens;
- ancestry hasta `.cm-s-obsidian`;
- presencia/ausencia de `syntax-quoted-code-source`, `HyperMD-codeblock*`, `syntax-common-*` y `cm-*`.

La instrumentación debe ejecutarse después de que CodeMirror/Obsidian haya materializado el frame, no durante `buildSyntaxDecorations()`.

## Revisión TM 1

Resultado: CAMBIOS NECESARIOS.

La revisión inicial incorporó dos comprobaciones que faltaban en la primera explicación del fallo:

1. verificar el artifact construido para descartar una falsa instalación;
2. separar explícitamente generación de decorations, materialización en CodeMirror genérico, CSS del tema y materialización final en Obsidian real.

Estas distinciones cambian la conclusión: el problema ya no debe tratarse como una simple incompatibilidad CSS, sino como una frontera de host todavía no observada.
