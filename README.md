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

Ambas superficies comparten `src/tokenizer.ts`. El tokenizador sigue el léxico de:

- `especificacion/06-lexico.md`
- `especificacion/gramatica/mud-lexico.ebnf`

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

Además añade el identificador a `.obsidian/community-plugins.json` sin retirar otros plugins. Para una primera instalación se recomienda cerrar Obsidian antes de ejecutar el comando: una instancia abierta puede volver a escribir su lista de plugins desde memoria. Si se instala con Obsidian abierto, debe activarse manualmente `MUD Syntax Highlight` en los ajustes comunitarios.

## Alcance

El resaltado es léxico y contextual ligero; no reemplaza al futuro parser o LSP. Marca declaraciones, propiedades, tipos, palabras reservadas, algunos términos contextuales, literales, comentarios, números, operadores y puntuación.

No diagnostica:

- Tipos incompatibles.
- Nombres ambiguos.
- Orden Unicode incorrecto en una colección `Character [* ordered]`.
- Formas de unidad dependientes de Q-054.
- Literales `POINT_LITERAL` dependientes de Q-055.

## Arquitectura

- `src/tokenizer.ts`: scanner compartido y clasificación.
- `src/blocks.ts`: localización de fences `mud`.
- `src/editor.ts`: decoraciones CodeMirror.
- `src/reading.ts`: render seguro mediante `textContent`.
- `src/main.ts`: registro del plugin.

No usa `innerHTML` con código de la bóveda.
