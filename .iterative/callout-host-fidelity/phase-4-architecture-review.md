# Revisión TM temporal · arquitectura Fase 4

Estado: TEMPORAL. Eliminar tras gate satisfactorio y limpieza final.

## Revisión 1

Resultado: SIN CAMBIOS.

Se contrastó el plan con la evidencia real y la documentación oficial de variables CSS de Obsidian.

Confirmaciones:

- las clases `syntax-editor-code-source*` sí están materializadas en `.cm-line`;
- el fallo observado es únicamente `backgroundColor` computado transparente;
- `--blockquote-background-color` es una variable pública documentada de Obsidian para el fondo de blockquotes;
- asignarla únicamente sobre `.cm-line.syntax-editor-code-source` respeta ownership del host y evita contaminar blockquotes normales/callout prose;
- conservar `--code-background: transparent` sigue siendo necesario para evitar superficies individuales en spans `cm-inline-code`;
- el foreground ya es correcto en la evidencia real, por lo que no se justifica redefinir `--blockquote-color`;
- no se requieren cambios TypeScript, selectores privados, `!important` ni DOM mutation.

No se identificó corrección arquitectónica adicional.

Falta una segunda revisión limpia consecutiva.

## Revisión 2

Resultado: SIN CAMBIOS.

Segunda revisión independiente centrada en compatibilidad de cascada y alcance:

- declarar la variable pública en la propia `.cm-line.syntax-editor-code-source` mantiene el override estrictamente scoped;
- `--syntax-editor-code-background` continúa siendo la fuente de verdad del plugin y puede ser sobrescrita por themes/snippets desde ancestros;
- la propiedad directa `background-color` permanece como fallback cuando no exista una regla host que consuma `--blockquote-background-color`;
- no se necesita elevar especificidad ni introducir `!important`;
- no se amplía el scope a foreground, bordes, padding, tipografía ni otros blockquotes;
- no se requiere ningún cambio TypeScript ni de lifecycle.

No se identificó ninguna modificación arquitectónica adicional.

Revisiones 1 y 2 consecutivas SIN CAMBIOS: arquitectura Fase 4 estable según TM.
