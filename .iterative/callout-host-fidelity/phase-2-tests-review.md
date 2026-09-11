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

Aún no existe ninguna revisión limpia en esta fase. El par limpio debe obtenerse después de que el head completo pase CI + `pack:all`.