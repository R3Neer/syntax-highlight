# Análisis temporal · Fase 3 · visibilidad de quoted source

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Alcance

Esta fase corrige exclusivamente la política de materialización de decorations en Markdown Live Preview source. No toca:

- routing rendered/Reading;
- settings `markdownEditor` / `markdownReading`;
- scanner Markdown quote-aware;
- engine semántico común de Fase 2;
- contrast manager;
- Smart Editing;
- configured profiles.

## Evidencia de Obsidian real

La captura diferida con el cursor dentro del PowerShell quoted produjo:

- `hasFocus: true` en el `EditorView` ya registrado;
- `selection.anchor === selection.head === 259` dentro del mismo documento;
- `quotedFence.language === "powershell"`, `quoteDepth === 1`;
- `relevantLines` para opening, cuatro body lines y closing del fence quoted;
- el PowerShell quoted desapareció de `embeddedHosts` mientras estaba en source;
- otros bloques que seguían rendered permanecieron como `.cm-embed-block`.

Conclusión: el quoted editable NO vive en un segundo editor. Es source del mismo `EditorView` exterior.

La captura sin foco anterior observó lo contrario porque al hacer clic en DevTools Obsidian devolvió el quoted a rendered. Esa captura no era válida para inferir ownership del estado source.

## Síntoma actual

En quoted source:

- los marks semánticos `syntax-common-*` aparecen y colorean PowerShell/Bash;
- line numbers aparecen;
- no aparece la surface negra continua;
- Text presentation de source no materializa el contrato esperado de línea;
- `quotedSourceLines` puede quedar en 0 cuando el snapshot se toma después de perder foco.

El patrón es importante: **las decorations de contenido sí sobreviven, las decorations de línea no**.

## Código causal actual

`editor-block-model.ts` crea correctamente line semantics para todo bloque quoted:

- opening: `syntax-editor-code-source` + `syntax-editor-code-source-opening`;
- body: `syntax-editor-code-source` + `syntax-editor-code-source-body`;
- closing: `syntax-editor-code-source` + `syntax-editor-code-source-closing`;
- Text/Markdown presentation se añade a body lines.

`editor.ts` materializa esas semánticas así:

```ts
const visible = visibleRanges(view);

for (const line of resolved.lineSemantics) {
  if (!positionIsVisible(line.from, visible)) continue;
  ranges.push(
    Decoration.line({
      attributes: { class: line.classes.join(" ") },
    }).range(line.from),
  );
}
```

Y los marks semánticos así:

```ts
for (const span of semanticSpans(resolved, semanticCache)) {
  if (!rangeIntersectsVisible(span.from, span.to, visible)) continue;
  ranges.push(Decoration.mark({ class: span.className }).range(span.from, span.to));
}
```

El quoted scanner mapea los marks después del prefijo `>` (`sourceFrom`), pero la `Decoration.line` debe colocarse en `lineFrom`, el inicio físico de la línea.

## Distinción oficial relevante

Obsidian recomienda ViewPlugin cuando la decoración depende de lo que está dentro del viewport. Su documentación usa `view.visibleRanges` para limitar visitas de contenido/syntax tree, porque puede haber rangos del documento que no están realmente visibles.

CodeMirror distingue dos conceptos:

- `viewport`: tramo del documento cuyo DOM está dibujado por el editor;
- `visibleRanges`: partes realmente visibles del documento, excluyendo contenido oculto/reemplazado por decorations de otras extensiones.

Live Preview de Obsidian oculta sintaxis Markdown. En una quoted line, el prefijo físico `>` puede estar reemplazado/colapsado aunque el resto de la `.cm-line` se siga dibujando. Por tanto:

```text
lineFrom  -> puede quedar fuera de visibleRanges
sourceFrom/body -> puede seguir dentro de visibleRanges
.cm-line -> sigue existiendo dentro del viewport
```

Eso explica simultáneamente:

- marks semánticos presentes;
- widgets de número presentes porque se insertan en `sourceFrom`;
- `Decoration.line` ausente porque se filtra por `positionIsVisible(line.from, visibleRanges)`.

## Causa raíz propuesta

Estamos usando **una sola noción de visibilidad para tipos de decoration con semánticas distintas**.

### Content semantics

`Decoration.mark` y widgets inline pertenecen a posiciones de contenido. Deben seguir limitándose con `visibleRanges` para:

- no tokenizar texto sustituido/colapsado;
- mantener performance por ViewPlugin;
- evitar furniture dentro de source que Obsidian no está mostrando.

### Line semantics

`Decoration.line` pertenece a la línea DOM completa y obligatoriamente se coloca en el inicio físico de la línea. Su decisión de materialización no puede exigir que **ese carácter físico concreto** sea visible.

Debe depender de:

1. que la línea intersecte el `viewport` materializado;
2. que alguna parte real de esa línea siga intersectando `visibleRanges`, para no decorar source completamente sustituido por un widget rendered.

Después, la decoration se sigue colocando en `line.from`, porque ésa es la API correcta para modificar `.cm-line`.

## Cambio de modelo recomendado

`EditorLineSemantic` debe conservar también `to`, no solo `from`:

```ts
interface EditorLineSemantic {
  from: number;
  to: number;
  classes: readonly string[];
}
```

Los límites ya existen en `MudCodeBlock`:

- `openingLineFrom` / `openingLineTo`;
- `bodyLines[].lineFrom` / `lineTo`;
- `closingLineFrom` / `closingLineTo`.

Así el materializador puede responder a la pregunta correcta: **¿hay alguna parte de esta línea source materializada?**, en vez de preguntar **¿el primer carácter de la línea está visible?**.

## Política propuesta de rangos

Separar explícitamente:

```text
viewportRanges    -> line decorations
visibleRanges     -> semantic marks + inline widgets
```

Para una line decoration:

```text
line intersects viewport
AND
line intersects at least one visibleRange
```

Si ambos se cumplen, añadir `Decoration.line(...).range(line.from)` aunque `line.from` no pertenezca a `visibleRanges`.

### Por qué hace falta también `visibleRanges`

Usar solo `viewport` volvería a decorar líneas fuente completamente sustituidas por widgets/callouts rendered que estén dentro del viewport. Eso mezclaría source semantics con rendered ownership.

La intersección dual evita ambas clases de error:

- quoted source con prefijo oculto: sí se decora;
- bloque totalmente rendered/replaced: no se decora.

## Reglas que NO cambian

- semantic parsing sigue limitado por `visibleRanges`;
- `semanticCache` y su invalidación permanecen iguales;
- line number widgets siguen limitados por su posición visible (`sourceFrom`);
- `ViewPlugin` sigue siendo la API correcta: las decorations dependen del viewport y no cambian estructura vertical;
- no se usa DOM directo, selectors privados ni `MutationObserver`;
- CSS de Fase 2 no cambia inicialmente: ya expresa el resultado deseado si la clase llega a `.cm-line`;
- no se reintroducen `HyperMD-*` ni `cm-embed-block` en producción.

## Tests que faltan para demostrar la causa

La suite actual usa un `EditorView` sin una segunda extensión que colapse el prefijo quoted. Por eso no reproduce la diferencia entre `viewport` y `visibleRanges`.

La nueva cobertura debe construir un `EditorView` de CodeMirror donde una extensión de prueba use `Decoration.replace` para ocultar exactamente el prefijo `> ` de líneas quoted. Después debe comprobar:

1. `line.from` queda fuera de `view.visibleRanges`;
2. el resto del body sigue dentro de `visibleRanges`;
3. la line decoration de Syntax Highlight sí se materializa sobre `.cm-line`;
4. marks semánticos siguen sobre el body, nunca sobre `>`;
5. una línea completamente replaced no recibe surface source;
6. Text presentation + source surface coexisten bajo el mismo escenario;
7. top-level permanece sin surface propia duplicada.

## Hipótesis falsable

Si, después de esta corrección, Obsidian real sigue mostrando quoted source sin `syntax-editor-code-source` en `.cm-line`, entonces la causa no es el filtro de rangos y deberá reabrirse análisis antes de otro cambio.

No se autoriza como fallback:

- mutar DOM de CodeMirror;
- inspeccionar `.cm-embed-block` en producción;
- copiar clases `HyperMD-*`;
- usar `!important` para ocultar el problema.
