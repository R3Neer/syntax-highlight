# Análisis temporal — fences dentro de blockquotes/callouts

> Documento temporal del Método Iterativo de Samuel. Debe eliminarse al finalizar este proceso.

## Diagnóstico

- [x] `registerMarkdownCodeBlockProcessor` es independiente del scanner de edición; el fallo reproducible en nuestro código está en `findCodeBlocks`, usado por Editing View, smart editing y reescrituras de presentación.
- [x] El scanner actual solo reconoce whitespace antes del fence. Una línea `> ```powershell` o `> ```text-center` queda fuera.
- [x] Limitarse a aceptar `>` en la regex sería insuficiente: el cuerpo físico contiene `> ` al inicio de cada línea y los parsers de Bash/Nu/PowerShell/etc. lo interpretarían como sintaxis del propio lenguaje.
- [x] La solución necesita distinguir contenido lógico del bloque y offsets físicos del documento.
- [x] Los callouts de Obsidian no necesitan parser específico de `[!note]`: su cuerpo es un blockquote, por lo que soportar correctamente el prefijo de cita cubre callouts presentes y futuros.

## Modelo

Añadir a `blocks.ts` una representación de líneas lógicas del cuerpo:

```ts
interface CodeBlockBodyLine {
  sourceFrom: number;
  sourceTo: number;
  logicalFrom: number;
  logicalTo: number;
}
```

Cada bloque conservará `from/to` físicos para compatibilidad y añadirá:

- `quoteDepth`: profundidad del contenedor blockquote;
- `body`: contenido lógico, sin los marcadores `>` pertenecientes al contenedor;
- `bodyLines`: mapping entre intervalos lógicos y físicos.

Los saltos de línea forman parte de `body` para que los parsers mantengan estado multilínea, pero no necesitan decorarse. Cada token lógico se proyectará sobre los tramos de texto reales de las líneas, de modo que un token que cruza líneas se parte en decoraciones físicas y nunca cubre el prefijo de quote.

## Scanner de contenedor

Se implementará un consumidor genérico de marcadores blockquote que pueda consumir exactamente N niveles. El opening fence podrá aparecer tras 0..N marcadores `>` con el espaciado Markdown habitual. El cierre deberá pertenecer a la misma profundidad de quote.

Un fence top-level sigue actuando como contenedor y hace que el scanner salte todo su contenido, de modo que ejemplos literales con `> ```text` dentro de otro fence continúen protegidos.

## Consumidores

- **Editor common/configured/MUD:** tokenizar `block.body`, mapear cada rango lógico a uno o más rangos físicos.
- **Text parserless:** decorar únicamente los intervalos físicos de contenido, no los `>`.
- **Presentation:** aplicar `Decoration.line` a las líneas físicas del cuerpo; la clase de línea conserva la integración con Live Preview.
- **Line numbers:** insertar widgets en `sourceFrom` de cada línea lógica.
- **Smart editing:** resolver el bloque quoted para posiciones de contenido. El contexto sigue usando límites físicos para no rediseñar toda la API, pero el reconocimiento se restringe a posiciones que pertenezcan al contenido de una línea.
- **Vault rewrite:** reutiliza `languageFrom/languageTo`, que pasarán a calcularse correctamente detrás del prefijo quote.

## Reading View

El renderer de Reading View recibe el `source` lógico a través del processor de Obsidian, por lo que no necesita introducir marcadores quote. Se mantendrá una regresión sobre `data-source-line`; si apareciese evidencia de que Obsidian no invoca processors dentro de callouts, se abriría un segundo bucle con postprocessor fallback, pero no se añadirá complejidad especulativa sin necesidad.

## Riesgos

- **Quote depth irregular:** el scanner será conservador; solo quitará marcadores que pertenezcan al mismo contenedor. Marcadores adicionales después de la profundidad del contenedor se consideran contenido literal.
- **CRLF:** el mapping lógico debe contar la longitud real del EOL al avanzar offsets lógicos.
- **Tokens multilínea:** el mapper proyecta por línea y por tanto evita rangos sobre prefijos de quote.
- **Bloques top-level:** deben conservar exactamente la semántica previa y los tests existentes.
- **Callouts:** no se acoplan a clases DOM ni nombres de callout, solo a sintaxis Markdown de blockquote.

## Revisión del análisis

- A1: descartada una regex superficial porque rompería semántica de parsers.
- A2: descartado un parser específico de callouts por duplicar semántica que ya aporta Markdown.
- A3: el mapping lógico/físico en `blocks.ts` queda como fuente única para todos los consumidores.
- A4: sin cambios. Análisis estable para plan.
