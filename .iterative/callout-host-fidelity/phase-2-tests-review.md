# Revisión TM temporal · tests Fase 2

Estado: TEMPORAL. Eliminar tras gate real satisfactorio y limpieza final.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

La primera suite nueva no llegó a ejecutarse porque ESLint detectó un import de tipo `Tag` sin uso en `common-semantic-engine.test.ts`.

Acción: retirar el import. Producción no cambió.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

`common-semantic-consumers.test.ts` exigía igualdad exacta entre el conjunto bruto de roles del árbol Bash y los roles materializados por cada consumidor.

La revisión detectó que esa expectativa convertía detalles no contractuales en API:

- Reading añade `syntax-common-plain` a huecos no clasificados;
- gramáticas Lezer pueden producir tags solapados/nested y no existe garantía de un nodo DOM independiente por cada tag ornamental.

Acción: exigir en ambos consumidores los roles semánticos significativos que el engine expone, mantener mapping quoted sin `>` y conservar la prohibición de `token *`/`cm-*`. Producción no cambió.

## Revisión 3

Resultado: CAMBIOS NECESARIOS.

La auditoría de cobertura detectó que SourceView solo estaba protegida de forma estática. Faltaba montar un `EditorView` real con exactamente:

`commonLanguageSupport(language) + syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER)`.

Acción: añadir `common-source-view-highlighting.test.ts` para PowerShell stream-backed y Bash tree-backed. Producción no cambió.

## Revisión 4

Resultado: CAMBIOS NECESARIOS.

El ledger temporal seguía describiendo destinos abstractos de Fase 8 aunque ya existían tests concretos.

Acción:

- cerrar cada fila con nombres de suites concretas;
- añadir tabla de garantías nuevas de Fase 2;
- reservar únicamente el routing rendered real al gate manual de Obsidian.

Producción y assertions no cambiaron.

## Revisión 5

Resultado: CAMBIOS NECESARIOS.

La revisión de fragilidad detectó que `common-stream-token-tags.test.ts` llamaba a `effectiveStreamParser.token()` con un objeto mínimo `{ next() }` casteado como stream. El parser sintético solo necesitaba `next`, pero eso convertía accidentalmente una maqueta privada del test en contrato.

Acción: sustituirla por un `StringStream` real de la API pública de CodeMirror y comprobar además que el stream avanza. Producción no cambió.

## Revisión 6

Resultado: SIN CAMBIOS.

Primera revisión limpia, centrada en cobertura completa contra el plan y el ledger:

- engines tree/stream/plain y highlighter compartido;
- PowerShell real con variable/number/operator/builtin/string/comment/keyword/punctuation/invalid;
- precedencia de tablas, synthetic names, parser sin `startState` y contrato público preservado;
- scanner multilinea, LF/CRLF, blank física, source vacío/final virtual y guard de zero-length;
- Bash tree en Reading y quoted source, con mapping sin prefijo `>`;
- SourceView nativo montado con un `EditorView` para PowerShell y Bash;
- surface quoted/presentation heredada de Fase 1;
- paleta dark, remapeo `--code-*`, contraste >= 4.5:1, invalid y line numbers;
- boundaries arquitectónicos Fase 1;
- ledger cerrado con archivos concretos;
- routing rendered real reservado únicamente al gate manual.

No se encontró garantía del plan sin cobertura legítima.

## Revisión 7

Resultado: SIN CAMBIOS.

Segunda revisión limpia, independiente y centrada en fragilidad/contratos:

- ninguna suite happy-dom se etiqueta como host real;
- SourceView usa un `EditorView` real del entorno de test sin simular `MarkdownView`/Obsidian;
- el test de stream usa `StringStream` real;
- Bash comprueba roles semánticos significativos y no exige tags ornamentales solapados ni igualdad pixel-perfect;
- CSS tests fijan únicamente clases/variables/fallbacks propios del plugin;
- tests estáticos fijan layering y prohibiciones arquitectónicas, no internals de CodeMirror;
- ninguna suite inventa `.cm-embed-block` para demostrar routing rendered;
- la garantía del processor oficial permanece exclusivamente en el gate real;
- el head validado pasó 43 archivos / 288 tests, build, `pack:all` y artifact.

No se encontró modificación necesaria.

Revisiones **6 y 7 son consecutivas sin cambios**: los tests de Fase 2 quedan estabilizados según TM. Se autoriza pasar al gate manual de Obsidian real.