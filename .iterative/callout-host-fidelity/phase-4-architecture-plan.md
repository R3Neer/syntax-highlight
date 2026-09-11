# Plan arquitectónico temporal · Fase 4

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Objetivo

Integrar la surface de quoted Live Preview source con la capa visual pública de Obsidian sin competir contra el host por especificidad.

La evidencia real ya demuestra que:

- `Decoration.line` sí llega a `.cm-line`;
- `syntax-editor-code-source` está presente en opening/body/closing;
- tokens y line numbers existen;
- el `backgroundColor` computado sigue siendo transparente.

Por tanto Fase 4 es una corrección de cascada CSS, no de modelado ni de CodeMirror.

## Principio de ownership

La línea quoted pertenece simultáneamente a dos contratos:

1. **Syntax Highlight** aporta semántica específica de code source mediante clases propias;
2. **Obsidian** aporta el componente visual blockquote y su regla de background.

No debemos sustituir el segundo contrato ni intentar superarlo con selectores privados.

La integración debe usar la variable pública documentada por Obsidian:

```css
--blockquote-background-color
```

para transmitir la intención de surface de Syntax Highlight al componente host.

## Cambio de producción

En la regla ya existente:

```css
.cm-line.syntax-editor-code-source
```

añadir:

```css
--blockquote-background-color:
  var(--syntax-editor-code-background, #000);
```

Mantener:

```css
background-color: var(--syntax-editor-code-background, #000);
```

como fallback directo.

### Por qué ambas declaraciones

- Cuando el host aplica una regla de blockquote más específica, consumirá `--blockquote-background-color` y la línea seguirá negra.
- En un contexto donde esa regla no exista, nuestra propiedad directa conserva la surface.
- Ambas expresan una única fuente de verdad visual: `--syntax-editor-code-background`.

## Scope de la variable pública

La asignación se realiza sobre **cada línea source propia**:

```css
.cm-line.syntax-editor-code-source
```

No en `body`, `.markdown-source-view`, `.HyperMD-quote`, `.callout` ni ningún ancestor genérico.

Consecuencias:

- no cambia un blockquote normal;
- no cambia prose de un callout;
- no cambia Bash/Text/PowerShell rendered;
- no cambia Reading View;
- solo las líneas donde nuestro ViewPlugin ya ha decidido que existe fenced code quoted reciben el override.

## Surface vs inline-code furniture

Conservar:

```css
--code-background: transparent;
```

sobre la misma línea.

Esto es parte del mismo contrato:

- `--blockquote-background-color` produce la surface continua de línea;
- `--code-background: transparent` evita backgrounds individuales en spans `cm-inline-code` generados por Obsidian dentro del source quoted.

No convertir `--code-background` a negro: eso reintroduciría píldoras/rectángulos por span y rompería continuidad visual.

## Foreground

No redefinir `--blockquote-color` en esta fase.

Evidencia real:

- `syntax-common-variable`, operator, number, string, callable y comment ya muestran colores dark-safe;
- opening/closing e inline-code base computan foreground legible;
- line numbers usan la paleta propia.

Agregar un override de foreground sin un fallo observado ampliaría scope innecesariamente.

## Borders y typography

No cambiar:

- `--blockquote-border-color`;
- `--blockquote-border-thickness`;
- `--blockquote-font-style`;
- padding/margins de blockquote.

El requisito es surface de fenced code source, no rediseñar el callout/blockquotes de Obsidian.

## Compatibilidad con themes y snippets

La fuente de verdad propia sigue siendo:

```css
--syntax-editor-code-background
```

Un theme/snippet puede sobrescribirla desde un ancestor y la asignación scoped propagará ese valor tanto a:

- nuestra propiedad directa `background-color`;
- la variable pública `--blockquote-background-color` usada por el host.

No se referencia ningún theme por nombre ni se copian reglas privadas.

## Reglas prohibidas

No usar:

- `.HyperMD-quote` en producción;
- `.markdown-source-view.mod-cm6.is-live-preview ...` para competir por especificidad;
- `!important`;
- `style=` desde JavaScript;
- MutationObserver;
- `:has()`;
- variables globales de blockquote.

## Archivos funcionales autorizados

Solo:

```text
packages/obsidian/styles.css
```

Si la implementación requiere modificar TypeScript, se detiene y se reabre análisis.

## Tests previstos

### Contrato CSS

Crear/actualizar test estático que compruebe dentro de `.cm-line.syntax-editor-code-source`:

- `--blockquote-background-color` existe;
- deriva de `--syntax-editor-code-background`;
- fallback `#000` permanece;
- `background-color` directo permanece;
- `--code-background: transparent` permanece;
- no aparece selector `.HyperMD-quote` nuevo en producción;
- no aparece `!important` dentro del bloque quoted-source propio.

### Regresiones

Mantener verdes:

- `quoted-source-dark-palette.test.mjs`;
- `theme-compat.test.ts`;
- semantic suites de Fase 2;
- architecture boundaries de Fase 1;
- diagnostics temporales.

## Gate Obsidian real

Con foco dentro del PowerShell quoted:

1. opening/body/closing conservan `syntax-editor-code-source`;
2. `getComputedStyle(line).backgroundColor` deja de ser transparent y representa la surface negra configurada;
3. semantic colors se mantienen;
4. line numbers se mantienen;
5. spans `cm-inline-code` no generan píldoras claras.

Además:

- Text quoted source conserva alignment/flow sobre surface continua;
- Bash quoted source conserva semantic colors;
- callout prose fuera del fenced block mantiene su background del theme;
- cursor fuera vuelve a rendered sin cambios.

## Rollback

Si el gate real sigue computando fondo transparente aunque `--blockquote-background-color` tenga el valor negro scoped, detenerse y volver a análisis.

No aumentar especificidad ni usar `!important` como siguiente paso automático.
