# Revisión previa al borrado

Estado: temporal. Debe borrarse al cerrar este ciclo iterativo.

## Criterio
No se elimina una pieza solo porque haya participado en una solución fallida. Se elimina o sustituye únicamente si su contrato contradice evidencia del host o si duplica una responsabilidad que pasará a una abstracción mejor.

## Decisiones
- `directCodeChild` actual: **sustituir, no conservar**. Su condición `children.length === 1` contradice el DOM realista con botón de copia.
- Test `rejects deceptive classes and pre elements with extra UI children`: **sustituir parcialmente**. Se conserva la parte de clases engañosas y se cambia la parte de UI auxiliar para exigir aceptación cuando existe un único `<code>` directo.
- `collectUnprocessedRenderedCodeBlocks`: **conservar** y endurecer. Es útil en Reading y puede reutilizarse para Live Preview.
- `createReadingFallbackPostProcessor`: **conservar**. El fallo fue el detector, no la estrategia de fallback tardío.
- `buildSyntaxDecorations` y tests quote-aware: **conservar**. Siguen cubriendo el modo en que el source Markdown está realmente expuesto por CodeMirror.
- No se elimina ningún renderer ni la infraestructura Text/Markdown/PowerShell/MUD.

## Borrado efectivo de esta fase
No se borrará ningún archivo de producción completo. El “tirar cosas” de este ciclo consiste en eliminar dos supuestos del código/tests:
1. la prohibición de hijos auxiliares junto al `<code>`;
2. la suposición de que las decoraciones de offsets son la única integración necesaria para Live Preview anidado.

Ambos serán reemplazados por contratos explícitos y pruebas host-realistas en la siguiente fase.
