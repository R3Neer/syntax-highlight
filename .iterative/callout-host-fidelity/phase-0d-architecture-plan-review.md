# Revisión TM · plan arquitectónico Fase 0D

Estado: TEMPORAL. Eliminar al terminar implementación + tests de este ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

El borrador reaccionaba únicamente a `ViewUpdate → requestAnimationFrame`. Eso podía perder mutaciones DOM de Obsidian producidas sin transacción de editor, precisamente la clase de frontera que la Fase 0D debe observar.

Cambios:

- añadir `MutationObserver` scoped exclusivamente a `view.dom`;
- batir ViewUpdates y mutaciones en un único scheduler por rAF;
- filtrar bloques por `visibleRanges`/selección y cap duro;
- explicitar que no hay polling ni observer global.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Activar diagnostics desde DevTools no genera necesariamente un `ViewUpdate`. Si el observer está desconectado mientras diagnostics está off, el plan podía quedar inerte tras `enable()` hasta otro evento accidental.

Cambios:

- el controlador temporal notifica transiciones enabled/disabled;
- cada diagnostic ViewPlugin registra listener y capture target;
- `enable()` conecta observer y agenda captura inmediatamente;
- `disable()` desconecta observer y cancela frame;
- `capture()` hace fan-out a targets vivos pero cada target conserva batching post-frame;
- el controlador no conoce `EditorView`;
- deduplicación ignora timestamp pero conserva cambios de selection/representation;
- las mutaciones `style` de otros componentes se observan deliberadamente para poder capturar el estado posterior al contrast normalizer.

## Revisión 3

Resultado: SIN CAMBIOS.

Revisión de carreras de lifecycle: enable/disable desde DevTools, mutaciones de estilo producidas por `CommonContrastManager`, múltiples triggers durante un frame y destroy con captura pendiente. El diseño de suscripción + target + observer scoped resuelve estos casos sin retroalimentación causada por el propio diagnóstico.

También se confirmó que los tokens repetidos, como `$foo`, se identificarán primariamente por posición documental; el texto se usa solo como etiqueta/verificación.

## Revisión 4

Resultado: SIN CAMBIOS.

Revisión de compatibilidad con las APIs/versiones declaradas por el repositorio y de acoplamiento al host. El plan usa capacidades ya disponibles del `EditorView` (`visibleRanges`, `domAtPos`, lifecycle de ViewPlugin), no introduce un selector nuevo de Obsidian y mantiene toda la observación dentro de `view.dom`.

No apareció una corrección arquitectónica adicional justificable antes de la captura real.

La arquitectura quedó estable provisionalmente según TM (revisiones 3 y 4), pero una revisión posterior del plan de implementación descubrió una premisa arquitectónica incorrecta. Según el método TM, el plan se reabre y debe estabilizarse de nuevo antes de continuar.

## Revisión 5 · hallazgo descendente

Resultado: CAMBIOS NECESARIOS.

El plan usaba `view.visibleRanges` como filtro principal. Esto excluye precisamente rangos de source que CodeMirror reemplaza por widgets, por lo que el diagnóstico podía omitir el estado `cursor fuera`, donde los fenced blocks pueden estar renderizados/replaced.

Cambios arquitectónicos:

- `view.viewport` pasa a ser el filtro grueso de bloques en la región renderizada;
- `view.visibleRanges` deja de excluir candidatos y se usa como señal de source directamente materializado;
- un bloque en viewport pero fuera de visibleRanges se conserva como candidato a `rendered-widget/not-materialized`;
- la selección conserva un bloque incluso en bordes de viewport;
- `domAtPos()` sobre replaced ranges se trata como boundary potencialmente no representativo: si no existe una `.cm-line` válida, se registra `materialized:false` en vez de asignar el nodo vecino;
- excepciones de resolución por posición no abortan la captura del resto.

Este cambio es arquitectónico, no un detalle de implementación, porque redefine qué estados del host forman parte de la unidad de observación.

## Revisión 6

Resultado: SIN CAMBIOS.

Se revisó específicamente la distinción `viewport` vs `visibleRanges`, la conservación de ranges reemplazados, los boundaries devueltos por `domAtPos()` y el scope de coste. El plan puede observar source directo y source reemplazado sin ampliar la inspección fuera del viewport del `EditorView`; la selección sigue siendo la única excepción controlada y existe cap duro.

No se encontró una corrección adicional.

## Revisión 7

Resultado: SIN CAMBIOS.

Se revisó el caso ambiguo en el que un source range no está directamente visible por reemplazo, folding o virtualización. El plan no obliga a etiquetarlo como widget: solo usa `rendered-widget` cuando puede demostrarlo localmente y conserva `unknown/not-materialized` en caso contrario. Esto evita convertir ausencia de `.cm-line` en una conclusión falsa.

No se encontró una corrección adicional.

La arquitectura volvió a quedar estable provisionalmente según TM (revisiones 6 y 7), pero la revisión del plan de implementación detectó un segundo problema de protocolo y obliga a una nueva reapertura.

## Revisión 8 · hallazgo descendente de deduplicación

Resultado: CAMBIOS NECESARIOS.

La deduplicación local de snapshots podía sobrevivir a `SyntaxHighlightHostDiagnostics.clear()`. En el flujo manual, un cambio de selección puede disparar una captura automática, después `clear(); capture()` intenta volver a capturar el mismo estado y el ViewPlugin podría suprimirlo como duplicado, dejando el dump vacío.

Cambios arquitectónicos:

- el lifecycle global notifica también `cleared`;
- `clear()` vacía eventos e invalida la baseline de deduplicación de todos los targets, pero no captura por sí solo;
- `clear(); capture()` queda definido como protocolo determinista para volver a publicar incluso un snapshot idéntico al anterior;
- enable/disable siguen notificándose solo en transiciones reales;
- la invalidación de dedup no conoce CodeMirror y se propaga por la misma suscripción de lifecycle.

Este cambio afecta al contrato controller↔ViewPlugin y, por tanto, pertenece a arquitectura.
