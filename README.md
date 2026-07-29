# Syntax Highlight

Plugin local de Obsidian para resaltar bloques `mud`, `ebnf`, `asdl` y perfiles
configurables tanto en lectura como en Source y Live Preview. También abre y
edita directamente los archivos asociados a cada perfil.

## Descriptores y gramáticas

Cada lenguaje se presenta mediante un descriptor JSON independiente. El
descriptor declara su nombre, motor, aliases de bloque, extensiones, grupos y
categorías, roles visuales, mapeos de producciones y ejemplo inicial. Los
descriptores integrados se encuentran en `languages/` y se instalan junto al
plugin.

La ruta del descriptor se puede cambiar desde los ajustes por otra ruta de la
bóveda. Los perfiles genéricos también pueden guardar el JSON dentro de sus
propios ajustes. El plugin valida identificadores, duplicados, grupos, roles,
categorías y referencias de los mapeos antes de aceptar una recarga. Si el JSON
o una gramática falla, conserva la última versión válida.

Cambiar datos del descriptor o de las gramáticas instaladas no requiere
recompilar: el plugin vigila esos archivos y los recarga al guardarlos. Añadir
una distinción que necesite un algoritmo léxico o contextual nuevo sí requiere
ampliar el tokenizador TypeScript.

El perfil MUD obtiene palabras, operadores, signos, declaraciones y términos
contextuales directamente de:

- `especificacion/gramatica/mud-lexico.ebnf`
- `especificacion/gramatica/mud.ebnf`

Ya no existe `mud-highlight.json`. Al guardar una gramática, el plugin la vuelve
a analizar automáticamente. La pestaña de configuración permite cambiar rutas,
validar manualmente y consultar el estado de cada perfil.

El perfil EBNF usa un tokenizador integrado de la metanotación. Los perfiles
genéricos mapean producciones EBNF a categorías declaradas por su descriptor;
constituyen una base configurable para lenguajes con convenciones léxicas
compatibles, no un parser semántico ni un LSP universal.

El perfil ASDL sigue la notación Zephyr empleada por CPython: `module`, tipos
suma y producto, constructores, campos, `attributes`, opcionales `?` y
secuencias `*`. La extensión canónica es `.asdl`.

## Edición de archivos fuente

Los descriptores declaran, además de los fences Markdown, las extensiones que
abre el editor integrado. De forma predeterminada son `.mud`, `.ebnf` y
`.asdl`. La vista incluye números de línea, búsqueda, deshacer/rehacer, ajuste
de línea, guardado automático y `Ctrl+S`.

## Temas

Los colores se administran desde los ajustes mediante las categorías auténticas
de cada lenguaje, agrupadas y descritas por su JSON. Se incluyen cinco familias:
Catppuccin, Visual Studio Code Dark+/Light+, Solarized, GitHub Default y
Gruvbox.

Cada plantilla aporta una paleta común de roles visuales y puede contener
excepciones por lenguaje y categoría. Al cambiar un color solo se crea una
excepción para esa categoría; el perfil pasa a `Personalizado sin guardar` y
puede guardarse como una plantilla global reutilizable.

Cada descriptor aporta un fragmento inicial y cada perfil permite editarlo en
una vista previa coloreada que se actualiza al escribir.

`styles.css` solo conserva estructura, tipografía semántica y diseño de la
interfaz; las reglas de color se generan desde la configuración.

## Configuración portable

Los ajustes se organizan en General, Lenguajes, Temas, Diagnóstico y Avanzado.
La interfaz sigue el idioma de Obsidian y permite forzar inglés o español.
Lectura Markdown, editor Markdown y editor directo de fuentes se activan por
separado.

Se pueden exportar configuraciones ligeras, paquetes de lenguaje autocontenidos
y temas como documentos JSON versionados. Las importaciones se validan antes de
aplicarse, permiten fusionar o reemplazar y conservan una copia recuperable de
la configuración anterior. Un paquete puede mantener sus gramáticas integradas
o materializarlas bajo `syntax-highlight/languages/` para editarlas.

Los descriptores incluidos se empaquetan dentro de `main.js`; la carpeta
`languages/` es material de desarrollo y no es necesaria para una instalación
desde la comunidad de Obsidian. Al personalizar un descriptor integrado se
crea una copia personal y siempre se puede volver al original.

El diagnóstico valida perfiles, gramáticas y colisiones de fences o
extensiones. La copia diagnóstica nunca incluye snippets ni contenido de las
gramáticas.

## Desarrollo e instalación local

```powershell
npm install
npm run check
npm run install-local
```

`install-local` copia `main.js`, `manifest.json`, `styles.css` y `languages/` a
`.obsidian/plugins/mud-syntax-highlighter/`, y activa el identificador sin
retirar otros plugins.

El identificador interno conserva el prefijo histórico para no perder ajustes
ni crear una segunda instalación, pero el nombre visible es `Syntax Highlight`.

## Alcance

El resaltado de MUD sigue siendo léxico y contextual ligero. Reconoce el
catálogo normativo vigente, declaraciones, referencias de tipo habituales,
familias, unidades, literales numéricos, Rumber y formas de punto. No valida
dominios, tipos ni formatos declarados: esos diagnósticos corresponden al futuro
parser o LSP.

El renderizado usa nodos de texto y nunca inserta código de la bóveda mediante
`innerHTML`.
