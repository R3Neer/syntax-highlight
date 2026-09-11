# Revisión TM temporal · plan arquitectónico Fase 1

Estado: TEMPORAL. Eliminar al cerrar el ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se contrastó el primer plan con la documentación oficial de Obsidian/CodeMirror y con `contrast-manager.ts`.

Cambio principal:

- El plan prohibía mutar DOM gestionado por CodeMirror en el bridge rendered, pero dejaba vivo `CommonContrastManager`, que escribe `style.color` y `data-syntax-contrast-adjusted` directamente sobre spans `syntax-common-*` observados globalmente. En source esos spans pertenecen al DOM de CodeMirror, por lo que la arquitectura seguía violando el mismo ownership que pretendía corregir.

Corrección incorporada:

- contraste JS solo en DOM propio bajo `.syntax-highlight-frame`;
- source queda exclusivamente bajo decorations + CSS/variables del host;
- surface no pertenece al contrast manager;
- mantener settings preview y configured profiles fuera de la normalización común como hasta ahora.

También se explicitó que recomendaciones generales de lifecycle detectadas durante la revisión se registran como deuda fuera de alcance.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

La revisión de rendimiento/ownership del ViewPlugin detectó una incoherencia: el plan proponía materializar decorations solo para `visibleRanges`, pero el modelo documental ya contenía todos los token spans, obligando a parsear/tokenizar todos los bloques del documento en cada cambio.

Corrección incorporada:

- modelo documental estructural/resuelto, sin tokenizar todos los bloques;
- solo bloques que intersectan `view.visibleRanges` se parsean/tokenizan;
- cada bloque visible se procesa sobre su cuerpo lógico completo para conservar estado multilinea;
- semántica cacheada por bloque + revisión;
- materialización recalculada ante viewport/model/revision y, cuando sea necesario, selección.

## Revisión 3

Resultado: SIN CAMBIOS.

Se revisó el plan contra documentación oficial de decorations, frontera de runtime del sample oficial y ruta soportada de code-block processors en Live Preview.

Comprobaciones:

- marks, line decorations y widgets inline pueden seguir siendo proporcionados por ViewPlugin;
- el sample oficial externaliza CodeMirror y Lezer conjuntamente, y `obsidian` declara Lezer como peer;
- `registerMarkdownCodeBlockProcessor` es la API soportada para rendered code blocks en Reading/Live Preview;
- `--code-background` y `--code-*` son una frontera temática adecuada para styling propio.

No se encontró una modificación necesaria.

## Revisión 4

Resultado: SIN CAMBIOS.

Segunda revisión independiente del plan estabilizado, centrada en ownership y contratos host:

- no queda ninguna mutación funcional del DOM de CodeMirror;
- ninguna funcionalidad production depende de `.cm-embed-block`, `.cm-callout` o `HyperMD-codeblock*`;
- source queda íntegramente en editor extensions/decorations;
- rendered queda en Markdown APIs soportadas;
- contraste JS se limita a DOM creado por Syntax Highlight;
- la separación modelo estructural / semántica visible / materialización evita trabajo global innecesario sin perder parsers multilinea;
- runtime CodeMirror/Lezer comparte identidad con Obsidian;
- los aliases no soportados por la API no justifican un fallback privado de DOM;
- diagnostics privados permanecen únicamente como herramienta temporal hasta el gate real.

No se encontró una modificación necesaria. Revisiones 3 y 4 son consecutivas sin cambios; plan arquitectónico estable según TM.
