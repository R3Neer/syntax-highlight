# Revisión TM temporal · implementación Fase 1

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Cambios: surface source más robusta (`background-color`, fallback base `--text-normal`) y contraste restringido a DOM propio.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Cambio: declarar como peers npm los runtime imports CodeMirror/Lezer que el artifact deja externos; externals preventivos como `electron`/built-ins no se convierten en peers fantasma.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

Cambio: rendered Markdown pasa a elegir `markdownEditor` o `markdownReading` según `MarkdownView.getMode()` mediante APIs públicas, en vez de usar siempre `markdownReading`.

## Revisión 4

Resultado: CAMBIOS NECESARIOS.

Cambios:

- resolver primero el `MarkdownView` propietario por `containerEl.contains(element)` y usar `context.sourcePath` solo como fallback inequívoco, para cubrir transclusiones;
- sincronizar Fases 0–7 del plan de implementación con el progreso real.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

Cambio: cerrar trazabilidad del ledger con una matriz explícita de tests futura para settings/mode, incluyendo transclusión, owner por containment y fallback conservador.

## Revisión 6

Resultado: SIN CAMBIOS.

Se revisó de nuevo el conjunto completo, no los commits individuales, contra los invariantes arquitectónicos estabilizados.

Comprobaciones:

- el artifact comparte CodeMirror/Lezer con Obsidian y el guardrail de build hace fallar cualquier runtime host empaquetado o import no externalizado;
- el contrato npm describe los imports externos reales del artifact sin convertir toda la lista preventiva de externals en peers;
- Live Preview source participa solo mediante `Decoration.mark`, `Decoration.line` y widgets inline de un ViewPlugin;
- no existe bridge rendered ni MutationObserver que sustituya DOM gestionado por CodeMirror;
- el `MutationObserver` de contraste solo programa normalización de `.syntax-highlight-frame`, DOM creado por Syntax Highlight;
- las clases privadas `.cm-embed-block`, `.cm-callout` y `HyperMD-codeblock*` no son dependencia funcional de producción; permanecen únicamente en diagnostics temporales;
- rendered Live Preview tiene como garantía `registerMarkdownCodeBlockProcessor`; el generic postprocessor no es requisito de corrección de LP;
- el resolver de settings usa `MarkdownView.getMode()`, containment público y fallback por `sourcePath` solo si es inequívoco;
- el modelo estructural se reconstruye conservadoramente y la semántica cara solo se calcula para bloques visibles, procesando el bloque lógico completo;
- el highlighter MUD específico exportado en `editor.ts` no tiene consumidores production fuera del propio módulo y no crea una segunda ruta Markdown activa;
- el ledger y el plan contienen destino para todas las garantías retiradas o nuevas.

No se encontró modificación necesaria. Esta es la primera revisión limpia del estado actual.
