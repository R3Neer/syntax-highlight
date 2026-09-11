# Análisis temporal · Fase 4 · integración CSS de quoted source

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Hecho observado en Obsidian real

Con el editor manteniendo foco dentro de un bloque PowerShell quoted:

- el mismo `EditorView` conserva `hasFocus: true`;
- opening, body y closing existen como `.cm-line` del documento exterior;
- todas esas líneas contienen `syntax-editor-code-source` y su clase de rol correspondiente;
- los body lines contienen `syntax-common-*` y `syntax-editor-line-number`;
- por tanto, el ViewPlugin y las `Decoration.line`/`Decoration.mark` sí están materializando el contrato de producto;
- aun así, `getComputedStyle(line).backgroundColor` es `rgba(0, 0, 0, 0)` para opening/body/closing.

Ejemplo real de body line:

```text
classes:
  cm-line
  syntax-editor-code-source
  syntax-editor-code-source-body
  HyperMD-quote
  HyperMD-quote-1
computed background:
  rgba(0, 0, 0, 0)
semantic descendants:
  syntax-common-variable
  syntax-common-operator
  syntax-common-number
```

Conclusión: la frontera defectuosa ya no es CodeMirror/materialización. Es la cascada CSS del host sobre una línea que simultáneamente es quoted source de Syntax Highlight y blockquote nativo de Obsidian.

## Estado de nuestro CSS

`styles.css` ya define:

```css
.cm-line.syntax-editor-code-source {
  --code-background: transparent;
  ...
  background-color: var(--syntax-editor-code-background, #000);
  color: var(--syntax-editor-code-color, #d4d4d4);
}
```

La regla sí coincide con el DOM real, porque la clase propia está materializada. Sin embargo la propiedad computada termina transparente.

Esto demuestra que otra regla del host/theme gana la propiedad `background-color` sobre la misma `.cm-line` quoted.

## Superficie pública correcta de Obsidian

La documentación oficial de variables CSS de Obsidian lista:

```text
--blockquote-background-color · Blockquote background color
```

Las líneas observadas llevan `HyperMD-quote`, por lo que la integración correcta no debe consistir en competir por especificidad contra la regla del host ni copiar sus selectores privados. Debe proporcionar, dentro del scope de nuestra línea, el valor de la variable pública que el host utiliza para pintar el blockquote.

## Causa raíz

La Fase 2 definió correctamente una surface propia de Syntax Highlight, pero solo expresó esa intención como propiedad CSS directa:

```css
background-color: var(--syntax-editor-code-background, #000)
```

Eso es suficiente en un `.cm-line` normal, pero quoted Live Preview pertenece simultáneamente al componente blockquote de Obsidian. El host conserva autoridad visual sobre ese componente y puede aplicar su propia propiedad `background-color` con mayor especificidad.

La clase propia está presente; la propiedad pierde la cascada.

## Estrategia recomendada

En el scope existente:

```css
.cm-line.syntax-editor-code-source
```

exponer también:

```css
--blockquote-background-color: var(--syntax-editor-code-background, #000);
```

Mantener además nuestro `background-color` actual como fallback para hosts/contextos donde no exista una regla de blockquote que consuma la variable.

Así:

- Obsidian sigue siendo quien pinta visualmente el blockquote cuando su regla gana;
- el valor que consume esa regla procede de la intención scoped del plugin;
- no se necesita `!important`;
- no se aumenta especificidad artificialmente;
- no se referencia `.HyperMD-quote` en producción;
- no se depende del tema activo;
- snippets/temas pueden seguir personalizando `--syntax-editor-code-background` de forma explícita.

## Variables que NO se cambian

No redefinir globalmente variables de blockquote.

La asignación debe existir únicamente sobre:

```css
.cm-line.syntax-editor-code-source
```

Por tanto:

- blockquotes normales conservan el tema;
- callout prose conserva el tema;
- solo las líneas source de fenced code quoted adoptan la surface dark de Syntax Highlight.

No cambiar `--blockquote-border-*` ni `--blockquote-font-style`; no pertenecen al requisito de code surface.

`--blockquote-color` tampoco es necesario inicialmente: el dump real ya demuestra que foreground/tokens se materializan correctamente. Si el gate posterior muestra un problema de foreground, será otra causa y reabrirá análisis.

## Interacción con `--code-background`

Conservar:

```css
--code-background: transparent;
```

en la línea source.

Razón: los spans `cm-inline-code` que Obsidian genera dentro del quoted source deben permanecer transparentes para que no reaparezcan píldoras claras individuales sobre la surface negra continua.

La línea aporta la surface; los spans inline no deben crear una segunda superficie.

## Alcance autorizado

Fase 4 debe tocar funcionalmente solo `packages/obsidian/styles.css`.

No cambiar:

- `editor.ts`;
- `editor-block-model.ts`;
- semantic engine;
- routing rendered/Reading;
- settings;
- diagnostics;
- Smart Editing;
- parser/catalog.

## Cobertura necesaria

1. Test estático de contrato CSS:
   - `.cm-line.syntax-editor-code-source` declara `--blockquote-background-color`;
   - el valor deriva de `--syntax-editor-code-background` con fallback negro;
   - conserva `--code-background: transparent`;
   - no introduce `.HyperMD-quote` ni `!important`.
2. Mantener verde `quoted-source-dark-palette.test.mjs` y `theme-compat.test.ts`.
3. Gate real:
   - PowerShell quoted source focused: background negro continuo;
   - semantic colors y line numbers intactos;
   - opening/body/closing negros;
   - Text quoted source conserva presentation;
   - Bash quoted source conserva semantic colors;
   - blockquotes/callout prose fuera del code fence no cambian.

## Criterio de falsación

Si después de asignar la variable pública scoped la línea real sigue computando `backgroundColor: transparent`, detenerse y volver a análisis.

No escalar a:

- `!important`;
- private selectors;
- MutationObserver;
- style inline desde JavaScript;
- duplicación de `.HyperMD-*`.
