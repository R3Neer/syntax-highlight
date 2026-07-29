# MUD Syntax Highlight

Plugin local de Obsidian para resaltar bloques `mud`, `ebnf` y perfiles de
lenguaje configurables tanto en lectura como en Source y Live Preview.

## Gramáticas

El perfil MUD obtiene palabras, operadores, signos, declaraciones y términos
contextuales directamente de:

- `especificacion/gramatica/mud-lexico.ebnf`
- `especificacion/gramatica/mud.ebnf`

Ya no existe `mud-highlight.json`. Al guardar una gramática, el plugin la vuelve
a analizar automáticamente y conserva la última configuración válida si el
archivo contiene un error. La pestaña de configuración permite cambiar rutas,
validar manualmente y consultar el estado de cada perfil.

El perfil EBNF usa el tokenizador integrado del visor EBNF. Los perfiles
genéricos pueden mapear producciones EBNF a categorías visuales; constituyen una
base configurable para lenguajes con convenciones léxicas compatibles, no un
parser semántico ni un LSP universal.

## Temas

Los colores se administran desde los ajustes del plugin, por lenguaje y por modo
claro u oscuro. Se incluyen plantillas MUD actual, EBNF actual, Catppuccin y
Visual Studio Code. MUD y EBNF parten de sus colores anteriores. Elegir una
plantilla copia su paleta y cada color puede personalizarse después.

`styles.css` solo conserva estructura, tipografía semántica y diseño de la
interfaz; las reglas de color se generan desde la configuración.

## Desarrollo e instalación local

```powershell
npm install
npm run check
npm run install-local
```

`install-local` copia `main.js`, `manifest.json` y `styles.css` a
`.obsidian/plugins/mud-syntax-highlighter/`, y activa el identificador sin
retirar otros plugins.

## Alcance

El resaltado de MUD sigue siendo léxico y contextual ligero. Reconoce el
catálogo normativo vigente, declaraciones, referencias de tipo habituales,
familias, unidades, literales numéricos y formas de punto numéricas. No valida
dominios, tipos ni formatos declarados: esos diagnósticos corresponden al futuro
parser o LSP.

El renderizado usa nodos de texto y nunca inserta código de la bóveda mediante
`innerHTML`.
