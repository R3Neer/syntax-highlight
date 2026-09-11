# Revisión TM temporal · implementación Fase 1

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se revisó el diff funcional completo contra el plan arquitectónico estabilizado, con especial atención a la frontera oficial Obsidian/CodeMirror, ownership del DOM, themes y contraste.

### Cambio A · fallback de color source demasiado frágil

La primera versión de la surface propia usaba:

- `background` como shorthand;
- `--code-normal` como fallback del color base de línea y de `syntax-common-variable`.

La revisión detectó dos problemas:

1. usar el shorthand `background` puede borrar capas/background-image aportadas por el tema, cuando la arquitectura solo pretende aportar una superficie de color;
2. un tema puede definir `--code-normal` con un valor sintácticamente inválido. Un custom property definido pero inválido no ofrece la misma robustez que una variable ausente; depender de él como último fallback puede dejar la línea heredando un color host no deseado.

Corrección aplicada:

- usar `background-color`;
- color base de `syntax-editor-code-source` -> `--syntax-editor-code-color`, con fallback estable `--text-normal`;
- `syntax-common-variable` -> `--syntax-common-variable`, con fallback estable `--text-normal`;
- mantener variables `--code-*` para categorías semánticas específicas (keyword, callable, number, operator, etc.) y no introducir ninguna rama por tema.

### Cambio B · consulta de contraste todavía demasiado global

Aunque `CommonContrastManager` ya filtraba escrituras a nodos bajo `.syntax-highlight-frame`, `commonTokens()` seguía consultando todos los `.syntax-common-*` del root y descartando después los que no eran propios.

Eso no violaba ownership al escribir, pero conservaba una consulta innecesariamente global sobre DOM ajeno.

Corrección aplicada:

- construir un selector compuesto `.syntax-highlight-frame .syntax-common-*`;
- `commonTokens()` consulta directamente solo tokens de DOM propio;
- conservar el selector semántico simple únicamente para detectar que un nodo previamente ajustado perdió su clase y restaurar su color original.

### Estado

Los cambios no alteran el plan arquitectónico. Refuerzan sus invariantes:

- CodeMirror conserva ownership del DOM source;
- surface propia usa únicamente clases/variables públicas;
- el normalizador perceptual inspecciona y modifica solo DOM rendered de Syntax Highlight.

La siguiente revisión se realizará sobre el estado corregido completo. Esta revisión no cuenta como revisión limpia.
