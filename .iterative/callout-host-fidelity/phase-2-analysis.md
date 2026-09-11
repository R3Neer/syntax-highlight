# Análisis temporal · Fase 2 · gate real fallido

Estado: TEMPORAL. Eliminar tras implementación, tests, validación real y limpieza final.

Este análisis nace del gate manual de Obsidian real sobre el head `3508f5fefa5c08224606af8dd10d3ddc6052a938`. No modifica producción. Su objetivo es explicar los dos fallos restantes y qué frontera arquitectónica debe cambiar antes de un nuevo plan.

## 1. Evidencia del gate real

### 1.1 Lo que sí mejoró

La refactorización de Fase 1 eliminó la inestabilidad estructural anterior:

- los bloques quoted rendered ya no se aplastan ni mezclan líneas;
- Text quoted rendered conserva presentación centrada/justificada;
- PowerShell quoted rendered conserva line numbers y badge;
- mover el cursor entre source/rendered ya no produce las deformaciones anteriores;
- Bash demuestra que el pipeline manual puede colorear tanto quoted source como rendered.

Por tanto, scanner quote-aware, mapping físico/lógico, furniture, presentation y renderer estructural ya no son el problema principal.

### 1.2 Fallo A · PowerShell solo colorea cuando Obsidian controla el highlighting

Con fence `powershell`:

- top-level source nativo de Obsidian aparece coloreado;
- top-level rendered por Syntax Highlight aparece sin colores semánticos;
- quoted source, donde Syntax Highlight debe rellenar el hueco del host, aparece sin colores semánticos;
- quoted rendered por Syntax Highlight aparece sin colores semánticos;
- Reading View aparece sin colores semánticos.

Al cambiar únicamente el fence a `bash`, manteniendo el mismo texto, los caminos manuales sí producen colores.

Esto separa claramente dos mundos:

- **host-native source highlighting** puede colorear PowerShell;
- **manual common-language highlighting de Syntax Highlight** no consigue extraer semántica de PowerShell en Obsidian real.

### 1.3 Fallo B · quoted source conserva superficie clara

La line decoration propia ya está materializando presentation: Text quoted se centra en source. Por tanto la line decoration sí llega a las líneas visibles.

La ausencia de negro no es un fallo de materialización. Es el valor CSS elegido por nuestra propia arquitectura:

```css
.cm-line.syntax-editor-code-source {
  background-color: var(--syntax-editor-code-background, var(--code-background));
}
```

El tema Nier actual define en `.theme-dark`:

```css
--code-background: rgba(255, 255, 255, 0.352);
```

pero pinta el source code nativo de negro mediante selectores privados:

```css
.cm-s-obsidian div.HyperMD-codeblock-begin-bg,
.cm-s-obsidian div.HyperMD-codeblock-end-bg,
.cm-s-obsidian div.HyperMD-codeblock-bg {
  background-color: rgb(0 0 0);
}
```

Por eso nuestra surface basada en la variable pública queda clara mientras el bloque top-level nativo queda negro. La Fase 1 hizo exactamente lo que decía su plan: priorizó contrato público frente a reproducir selectores privados. El gate demuestra que esa decisión no satisface el requisito explícito de producto: quoted source debe ser negro.

### 1.4 Bash revela una tercera incoherencia visual

Bash usa `@codincod/codemirror-lang-shell`, un paquete con gramática Lezer. En el gate:

- la semántica manual sí aparece;
- los colores/aspecto cambian entre source y rendered.

La causa está en nuestra taxonomía dual. El mismo tag semántico produce simultáneamente:

- `syntax-common-*` + `cm-*` en source;
- `syntax-common-*` + `token *` en rendered.

El tema Nier estiliza fuertemente `.HyperMD-codeblock .cm-*` y `.token.*`, incluso con `!important`. Quoted source no tiene el ancestor privado `HyperMD-codeblock`, mientras rendered sí expone `token.*`. Así, dos representaciones nuestras del mismo rango semántico pueden acabar con cascadas distintas.

Esto no implica que el parser Bash cambie de opinión. Implica que entregamos la misma semántica a **dos taxonomías visuales externas diferentes** y luego dejamos que el tema decida cuál gana.

## 2. Causa del fallo PowerShell

## 2.1 PowerShell es el único common language actual basado en StreamLanguage

`common-languages.ts` construye PowerShell con:

```ts
new LanguageSupport(StreamLanguage.define(powerShell))
```

El parser `powerShell` viene de `@codemirror/legacy-modes/mode/powershell`.

Bash, en cambio, usa `@codincod/codemirror-lang-shell`, que publica una gramática Lezer moderna.

Esta diferencia coincide exactamente con el gate: tree-backed funciona; StreamLanguage manual no.

## 2.2 Qué hace realmente StreamLanguage

La implementación oficial de `@codemirror/language` recibe strings del `StreamParser.token()` y las convierte a NodeTypes con props de highlighting.

El modo oficial PowerShell devuelve strings estándar como:

- `variable`;
- `number`;
- `operator`;
- `builtin`;
- `punctuation`;
- `string`;
- `comment`;
- `keyword`.

`StreamLanguage` traduce nombres legacy como `variable` y `builtin` a tags Lezer (`variableName`, `variableName.standard`) y construye NodeTypes mediante `styleTags()`.

Nuestro camino manual hace después:

```text
StreamLanguage tree
  -> highlightTree(tree, COMMON_*_HIGHLIGHT_STYLE)
  -> ranges
```

## 2.3 Por qué externalizar Lezer no fue suficiente

Fase 1 corrigió un defecto real: el artifact ya no empaqueta su propia copia de los módulos host CodeMirror/Lezer.

Pero el gate demuestra que compartir el import externo del plugin no garantiza que los `NodeProp` de highlighting que `StreamLanguage` creó dentro del runtime de Obsidian sean observables por el `highlightTree` manual del plugin en todos los caminos del host.

La señal decisiva es:

- el propio Obsidian sí colorea PowerShell cuando conserva ownership completo del editor;
- la misma definición `powerShell` deja de producir ranges cuando nosotros extraemos semántica a través del árbol;
- Bash, cuyo parser Lezer empaquetado resuelve sus imports contra nuestra frontera externalizada, sí produce ranges manuales.

Por tanto el problema ya no debe tratarse como "PowerShell necesita otra clase CSS". El punto inestable es **usar un árbol StreamLanguage como formato intermedio para extraer semántica fuera del highlighter que lo creó**.

## 2.4 La API pública ofrece una salida más directa

`StreamParser` y `StringStream` son API pública de `@codemirror/language`.

El contrato oficial de `StreamParser.token()` es precisamente devolver una string de estilo/tag por token, manteniendo estado mutable entre líneas. Para manual highlighting no necesitamos convertir primero esas strings a NodeTypes/NodeProps y volver a recuperar los tags con `highlightTree`.

Podemos mantener dos engines manuales genéricos:

1. **tree-backed**: parser Lezer -> `highlightTree`;
2. **stream-backed**: `StreamParser.token()` + `StringStream` -> tags/clases semánticas directamente.

Esto no debe ser una excepción hardcoded de rendering para PowerShell. PowerShell será simplemente el primer `CommonLanguage` con engine `stream`.

## 3. Arquitectura semántica objetivo deducida del gate

### 3.1 Una sola verdad semántica de Syntax Highlight

Los caminos manuales del plugin no deberían delegar la taxonomía final a Prism/CM compatibility classes.

Objetivo:

```text
common language
   |
   +-- tree engine ----> semantic tag ranges --+
   |                                           |
   +-- stream engine --> semantic tag ranges --+--> syntax-common-* classes
   |                                           |
   +-- plain engine ---------------------------+
```

Las mismas `syntax-common-*` representan la misma función en:

- quoted Live Preview source;
- rendered Live Preview;
- Reading View;
- source view propia cuando sea necesario.

### 3.2 Compatibility classes dejan de ser autoridad visual en DOM/ranges manuales

Actualmente `createCommonHighlightStyle()` mezcla dos responsabilidades:

- semántica propia `syntax-common-*`;
- adaptación visual a `cm-*`/`token *`.

El gate Bash demuestra que esa mezcla introduce divergencia de tema.

La nueva arquitectura debe separar ambas responsabilidades. Preferencia:

- ranges manuales emiten **solo** `syntax-common-*`;
- CSS propio usa variables públicas `--code-*` como integración temática;
- top-level source común que Obsidian ya resalta nativamente no necesita una segunda capa de marks comunes del plugin;
- configured/custom languages mantienen sus clases propias actuales.

Así no intentamos hacer que un mismo token sea simultáneamente "nuestro semantic role", "Prism token" y "CM private-looking class".

### 3.3 Top-level source común: host first

El gate demuestra que Obsidian sabe colorear PowerShell top-level incluso cuando nuestro manual extractor falla.

Para common languages top-level en Live Preview source:

- dejar syntax highlighting al host;
- mantener únicamente furniture propio que realmente necesitemos (por ejemplo line numbers);
- no superponer manual common token marks si `quoteDepth === 0`.

Para quoted source:

- el host no ofrece la misma representación nativa;
- Syntax Highlight sí debe materializar los semantic marks propios.

Configured/custom languages siguen necesitando marks propios también top-level.

Esta regla reduce doble-highlighting y aprovecha el host donde ya funciona.

### 3.4 Source view propia

`SyntaxSourceView` hoy usa `common.support() + syntaxHighlighting(COMMON_EDITOR_HIGHLIGHT_STYLE)` para todos los common languages.

Para tree-backed puede mantenerse.

Para stream-backed no debemos volver a depender de la misma extracción indirecta que falla en Obsidian real. La source view debe usar el mismo engine semántico stream directo mediante un ViewPlugin de marks, conservando `LanguageSupport` solo para language data/indent/brackets si aporta valor.

## 4. Arquitectura visual objetivo para quoted source

## 4.1 El requisito black source es explícito, no una inferencia de tema

Fase 1 decía "no hardcodear negro". El gate demuestra que ese principio contradice el requisito de producto expresado por el usuario.

No intentaremos detectar Nier ni copiar `.HyperMD-*`.

La surface será propiedad del plugin y tendrá variables propias con default dark explícito, por ejemplo:

```css
--syntax-editor-code-background: #000;
--syntax-editor-code-color: #d4d4d4;
```

Las variables siguen siendo sobrescribibles por tema/snippet. No habrá rama por nombre de tema.

Esto es más estable que intentar deducir el negro nativo de un selector privado que el propio tema puede cambiar.

## 4.2 Paleta sobre fondo negro

Cambiar solo el background a negro y conservar `--text-normal` como plain foreground sería incorrecto en Nier (`--text-normal` es oscuro).

La surface dark debe proporcionar fallbacks propios para los roles comunes que lo necesiten, preferiblemente a partir de `--code-*` y `--color-*`, con valores finales legibles si el tema define variables inválidas/incompletas.

El objetivo no es clonar pixel-perfect el top-level nativo, sino:

- negro consistente en quoted source;
- texto plain legible;
- roles semánticos distinguibles;
- sin depender de `HyperMD-*`.

## 5. Diagnóstico `[]` del processor rendered

El resultado vacío del filtro:

```js
SyntaxHighlightHostDiagnostics.events
  .filter(e => e.fence === "powershell" && e.source.includes("$nested"))
```

no demuestra todavía que el processor oficial no se ejecutara.

El controller solo registra eventos posteriores a `enable()`. Si el widget rendered ya existía o Obsidian reutilizó su DOM/cache al mover la selección, no hay obligación de que vuelva a ejecutar el callback y por tanto no habrá evento nuevo.

Además, el bloque visual quoted rendered contiene badge y line numbers de Syntax Highlight; con el bridge DOM eliminado, algún camino Markdown soportado ya lo procesó anteriormente.

La siguiente validación debe forzar creación fresca después de habilitar diagnostics:

1. habilitar diagnostics mientras el bloque está source;
2. modificar el documento o abrir una nota nueva después de habilitarlo;
3. pasar a rendered;
4. inspeccionar tanto `reading-specialized` como `reading-fallback`.

Si una creación fresca solo aparece como `reading-fallback`, entonces sí se falsifica la premisa "LP correctness no depende del generic postprocessor" y habrá que reabrir esa parte arquitectónica antes de limpiar.

## 6. Qué NO debemos tocar por estos síntomas

El gate no da evidencia para reescribir:

- `blocks.ts` / quote mapping;
- line-number anchoring;
- presentation model;
- `renderRanges()` estructural;
- `CommonContrastManager` ownership restriction;
- build externals/peer boundary de Fase 1;
- Smart Editing;
- configured-language tokenizer.

Tocar esas piezas ahora añadiría riesgo sin atacar causalidad.

## 7. Cambio arquitectónico mínimo completo

La mejora debe concentrarse en cuatro frentes:

1. **common semantic engine** con ramas genéricas tree / stream / plain;
2. **manual ranges semantic-only**, sin taxonomía visual dual `cm-*`/`token *`;
3. **host-first top-level common source**, manual marks solo donde el host no cubre el caso;
4. **quoted source dark surface plugin-owned**, con paleta legible y sobrescribible.

El gate rendered se vuelve a ejecutar después con generación fresca de diagnostics.

## 8. Hipótesis falsables para la siguiente fase

H1. Si PowerShell manual usa `StreamParser.token()` directamente, Reading y quoted source producirán ranges para variable/number/operator/builtin/string/comment sin depender del árbol StreamLanguage.

H2. Si manual routes emiten solo `syntax-common-*`, Bash y PowerShell dejarán de cambiar de taxonomía por entrar/salir de Prism/CM theme selectors; podrá variar el entorno visual, pero no qué semantic role recibe cada token.

H3. Si quoted source define una surface dark propia con foreground propio, las líneas opening/body/closing serán negras y legibles sin reintroducir `HyperMD-*`.

H4. Si top-level common source no recibe manual semantic marks, seguirá coloreado por Obsidian y se elimina doble-highlighting innecesario.

H5. Una captura diagnóstica creada desde cero después de `enable()` determinará si nested rendered llega por `reading-specialized` o depende realmente de `reading-fallback`.
