# MUD Syntax Highlight

Plugin local de Obsidian para bloques Markdown con lenguaje `mud`:

````markdown
```mud
ordered family Color {
    Red,
    Green,
    Blue
}
```
````

Colorea:

- Modo lectura mediante un procesador de bloques `mud`.
- Source y Live Preview mediante decoraciones de CodeMirror 6.
- Llaves, paréntesis y corchetes como categorías independientes.

Ambas superficies comparten `src/tokenizer.ts`. El tokenizador sigue el léxico de:

- `especificacion/06-lexico.md`
- `especificacion/gramatica/mud-lexico.ebnf`

## Aspecto

La paleta pastel viva está inspirada en Catppuccin Mocha: palabras reservadas
rosas, cadenas verdes, números melocotón, declaraciones amarillas, tipos cian y
comentarios lavanda. Los campos conservan el color normal tanto al declararse
como al usarse. Llaves, paréntesis y corchetes reciben colores distintos.

El plugin no impone ninguna tipografía: respeta la fuente de código configurada
por Obsidian o por el tema activo. Las variables `--mud-color-*` de `styles.css`
permiten retocar la paleta sin modificar TypeScript; después debe ejecutarse
`npm run install-local` y recargarse Obsidian.

## Configuración léxica editable

`mud-highlight.json` decide qué palabras y símbolos pertenecen a cada categoría
visual. Permite editar:

- `words`: palabras reservadas, operadores verbales, tipos básicos y constantes.
- `symbols`: operadores y signos clasificados como llaves, paréntesis, corchetes
  o puntuación.
- `declarationHeads`: palabras tras las que se colorea un nombre declarado.
- `contextualKeywords`: palabras que solo se reservan junto a otra palabra o
  símbolo.

La copia utilizada por Obsidian está en:

```text
.obsidian/plugins/mud-syntax-highlighter/mud-highlight.json
```

Tras editarla basta con recargar el plugin o usar `Reload app without saving`.
No es necesario recompilar. Si el JSON es inválido, el plugin muestra un aviso y
usa la configuración predeterminada incluida en `main.js`.

`npm run install-local` crea el archivo cuando no existe, pero no sobrescribe una
configuración local ya personalizada.

## Desarrollo

Requiere Node.js y npm:

```powershell
npm install
npm run check
npm run install-local
```

`install-local` compila e instala:

```text
.obsidian/plugins/mud-syntax-highlighter/
```

Además añade el identificador a `.obsidian/community-plugins.json` sin retirar
otros plugins. Para una primera instalación se recomienda cerrar Obsidian antes
de ejecutar el comando: una instancia abierta puede volver a escribir su lista
de plugins desde memoria. Si se instala con Obsidian abierto, debe activarse
manualmente `MUD Syntax Highlight` en los ajustes comunitarios.

## Alcance

El resaltado es léxico y contextual ligero; no reemplaza al futuro parser o LSP. Marca declaraciones, referencias de tipo reconocibles por su posición, palabras reservadas, algunos términos contextuales, literales, comentarios, números, operadores y puntuación.

También reconoce los miembros nominales declarados dentro de una `family` y
todas las referencias de magnitud que forman la expresión dimensional situada
tras `:=`.

Las formas de unidad y los operadores que las componen se colorean como una
unidad visual en cantidades como `10 m/s`, `90 km/h` o `30 people`. Una
conversión compuesta como `speed in km/h` también se reconoce sin confundir
`10 * count` con una unidad.

No diagnostica:

- Tipos incompatibles.
- Nombres ambiguos.
- Orden Unicode incorrecto en una colección `Char [* ordered]`.
- Formas de unidad dependientes de Q-054.
- Literales contextuales `POINT_LITERAL` definidos por D-062, todavía no implementados por el resaltador.

## Arquitectura

- `src/tokenizer.ts`: scanner compartido y clasificación.
- `src/blocks.ts`: localización de fences `mud`.
- `src/editor.ts`: decoraciones CodeMirror.
- `src/reading.ts`: render seguro mediante `textContent`.
- `src/main.ts`: registro del plugin.

No usa `innerHTML` con código de la bóveda.
