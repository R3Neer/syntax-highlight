# Syntax Highlight

Plugin local de Obsidian para resaltar bloques `mud`, `ebnf`, `asdl` y perfiles
configurables tanto en lectura como en Source y Live Preview. También abre y
edita directamente los archivos asociados a cada perfil.

## Gramáticas

El perfil MUD obtiene palabras, operadores, signos, declaraciones y términos
contextuales directamente de:

- `especificacion/gramatica/mud-lexico.ebnf`
- `especificacion/gramatica/mud.ebnf`

Ya no existe `mud-highlight.json`. Al guardar una gramática, el plugin la vuelve
a analizar automáticamente y conserva la última configuración válida si el
archivo contiene un error. La pestaña de configuración permite cambiar rutas,
validar manualmente y consultar el estado de cada perfil.

El perfil EBNF usa un tokenizador integrado de la metanotación. Los perfiles
genéricos pueden mapear producciones EBNF a categorías visuales; constituyen una
base configurable para lenguajes con convenciones léxicas compatibles, no un
parser semántico ni un LSP universal.

El perfil ASDL sigue la notación Zephyr empleada por CPython: `module`, tipos
suma y producto, constructores, campos, `attributes`, opcionales `?` y
secuencias `*`. La extensión canónica es `.asdl`.

## Edición de archivos fuente

Los perfiles declaran, además de los fences Markdown, las extensiones que abre
el editor integrado. De forma predeterminada son `.mud`, `.ebnf` y `.asdl`.
La vista incluye números de línea, búsqueda, deshacer/rehacer, ajuste de línea,
guardado automático y `Ctrl+S`.

## Temas

Los colores se administran desde los ajustes del plugin, por lenguaje y por modo
claro u oscuro. Se incluyen cinco familias reales: Catppuccin,
Visual Studio Code Dark+/Light+, Solarized, GitHub Default y Gruvbox.
Elegir una plantilla copia su paleta. Al cambiar cualquier color, el perfil pasa
a `Personalizado sin guardar`; puede asignársele un nombre y guardarse como una
plantilla reutilizable en cualquier lenguaje.

Cada perfil contiene además un fragmento editable y una vista previa coloreada
que se actualiza al escribir. MUD y EBNF incluyen ejemplos iniciales propios.

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

El identificador interno conserva el prefijo histórico para no perder ajustes
ni crear una segunda instalación, pero el nombre visible es `Syntax Highlight`.

## Alcance

El resaltado de MUD sigue siendo léxico y contextual ligero. Reconoce el
catálogo normativo vigente, declaraciones, referencias de tipo habituales,
familias, unidades, literales numéricos y formas de punto numéricas. No valida
dominios, tipos ni formatos declarados: esos diagnósticos corresponden al futuro
parser o LSP.

El renderizado usa nodos de texto y nunca inserta código de la bóveda mediante
`innerHTML`.
