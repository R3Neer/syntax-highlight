# Análisis temporal — presentación de bloques Text/Markdown

> Documento temporal del Método Iterativo de Samuel. Debe eliminarse al finalizar este proceso.

## Estado relevante de la repo

- [x] La revisión previa del árbol de `main` no encontró documentos residuales de requisitos/análisis/plan de procesos anteriores.
- [x] `CommonLanguage` ya tiene una política `presentation` para badge y números de línea; Text la usa para ocultar ambos.
- [x] Markdown sigue siendo parser-backed y actualmente conserva mobiliario de código.
- [x] PowerShell ya está integrado como lenguaje común y no necesita cambios funcionales en este proceso.
- [x] Reading View renderiza cada línea como `.syntax-code-line` con contenido `.syntax-code-line-content`.
- [x] Editing View construye decoraciones a partir de `findCodeBlocks`; ya existe un punto único donde añadir decoraciones de línea para familias presentacionales.
- [x] `findCodeBlocks` conoce la etiqueta del fence pero no conserva todavía las posiciones exactas de esa etiqueta, necesarias para reescrituras quirúrgicas.
- [x] Los processors de Obsidian se registran por nombre exacto de fence; por tanto las variantes con guiones deben enumerarse al registrar, aunque conceptualmente sigan siendo overrides y no lenguajes nuevos.
- [x] `ThemeManager` regenera CSS cada vez que cambian settings, lo que permite aplicar defaults de presentación mediante variables/reglas CSS y actualizar bloques existentes sin depender de un rerender completo.
- [x] El schema de settings está en 7 y el instalador local replica ese número; añadir defaults persistentes requiere migrar ambos a schema 8.

## Diseño propuesto

### 1. Una familia presentacional, no aliases como lenguajes

Extender `CommonLanguagePresentation` con una familia opcional:

```ts
family?: "text" | "markdown";
```

Text y Markdown usarán `badge: false`, `lineNumbers: false` y su familia correspondiente. Los demás lenguajes no cambian.

### 2. Fuente de verdad de fences presentacionales

Crear un módulo puro `block-presentation.ts` con:

- tipos `BlockAlignment = left|center|right` y `BlockFlow = ragged|justified`;
- parser de fence configurable;
- enumeración de todas las formas válidas que Obsidian debe registrar;
- generación de clases para overrides locales;
- resolución `override ?? default`;
- canonicalización completa `base-alignment-flow`;
- reescritura pura de una nota Markdown.

La gramática será estricta y canónica: base, luego alineación opcional y luego flujo opcional. Se permiten también un único modificador de cualquiera de las dos dimensiones.

### 3. Defaults persistidos

Añadir a settings:

```ts
blockPresentation: {
  text: { alignment: "left", flow: "ragged" },
  markdown: { alignment: "left", flow: "ragged" },
}
```

Los defaults `left/ragged` preservan la apariencia histórica al migrar. `loadSettings` validará cada dimensión por separado y completará valores inválidos/ausentes.

### 4. Aplicación visual inmediata mediante CSS

Los renderers no deben congelar el default actual en clases. Cada bloque/línea tendrá:

- `syntax-presentational`;
- `syntax-presentation-family-text|markdown`;
- clases de override solo cuando el fence las especifica, por ejemplo `syntax-presentation-align-right` y `syntax-presentation-flow-justified`.

`ThemeManager` emitirá las variables base de cada familia según settings. Las clases locales sobrescribirán esas variables. Así cambiar un default cambia CSS y afecta inmediatamente a bloques ya renderizados.

Para `ragged`:

```css
text-align: var(--syntax-presentation-alignment);
text-align-last: auto;
```

Para `justified`:

```css
text-align: justify;
text-align-last: var(--syntax-presentation-alignment);
```

Reading View aplicará la alineación sobre `.syntax-code-line`, no sobre el `span` inline. Los bloques presentacionales usarán `white-space: pre-wrap` en el contenido para permitir wrapping visual sin cambiar el source.

### 5. Editing View

Además de las marks de sintaxis/texto actuales, cada línea de cuerpo de Text/Markdown recibirá una `Decoration.line` con las clases presentacionales. Las líneas de apertura/cierre del fence no se centran ni justifican.

Los números de línea del plugin seguirán desactivados para ambas familias, independientemente del ajuste global de números de línea.

### 6. Reescritura al cambiar defaults

Extender `findCodeBlocks` con offsets de la etiqueta de lenguaje del fence de apertura. Esto evita reemplazos textuales globales.

Para cada nota:

1. encontrar bloques reconocidos;
2. parsear el fence con la fuente de verdad presentacional;
3. filtrar la familia cambiada;
4. comparar presentación resuelta con defaults viejos y nuevos;
5. si cambia, sustituir solo la etiqueta por `base-oldAlignment-oldFlow`;
6. aplicar reemplazos de derecha a izquierda.

El alias base original se conserva.

### 7. Flujo de settings y seguridad

Al pulsar un valor nuevo:

1. no mutar todavía settings;
2. escanear Markdown y calcular alcance;
3. si 0 bloques cambian, guardar el nuevo default directamente;
4. si hay afectados, mostrar modal con número de bloques y notas;
5. `Mantener apariencia`: reescribir primero las notas con la configuración vieja, y solo después guardar el nuevo default;
6. `Aplicar nuevo default`: guardar sin reescribir;
7. `Cancelar`: no hacer nada.

Si una reescritura falla a mitad, no se guarda el nuevo default. Las notas ya convertidas quedan con el aspecto anterior explícito, por lo que no sufren cambio visual bajo la configuración vieja.

## Riesgos y mitigaciones

- **Muchas variantes registradas:** son finitas (12 por alias presentacional) y solo cinco aliases base actuales. Coste pequeño; no se muestran en catálogo.
- **Colisiones con perfiles configurables:** se conserva la precedencia actual, porque los perfiles configurables se registran antes que los comunes.
- **Justificación aparentemente inerte:** se habilita `pre-wrap`; cada línea fuente actúa como párrafo y las sublíneas producidas por wrapping sí se justifican.
- **Cambios externos durante el popup:** al aplicar `Mantener apariencia`, cada archivo se vuelve a leer y reescribir con la misma transformación antes de modificarlo.
- **Markdown:** conserva el parser y los colores del tema; solo cambia mobiliario/presentación.
- **Rerender:** defaults en CSS dinámico; overrides locales dependen del source y se actualizan mediante las decoraciones/render normal cuando el fence cambia.

## Revisión del análisis

- A1: se descartó resolver defaults directamente en el renderer porque podía dejar Reading View/CodeMirror visualmente obsoletos tras un cambio de settings.
- A2: se movió el default a CSS generado por `ThemeManager` y se reservaron las clases del DOM para familia + overrides explícitos.
- A3: sin cambios. El análisis queda estable para pasar a plan.
