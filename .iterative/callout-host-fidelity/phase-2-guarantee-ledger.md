# Ledger temporal · garantías migradas en Fase 2

Estado: TEMPORAL. Eliminar tras implementación, tests, gate real y limpieza final.

Este ledger registra únicamente tests existentes adaptados o retirados durante implementación porque su contrato production cambie. Los tests nuevos se crean después del TM de implementación, en Fase 8.

## Pendiente

Todavía no se ha adaptado ni retirado ningún test existente en Fase 2.

## Regla

- Toda expectativa antigua sobre clases manuales `cm-*` o `token *` que se retire debe apuntar a una garantía nueva `syntax-common-*` de Fase 8.
- Una garantía host-real no puede sustituirse por un fixture happy-dom y se mantiene en gate real.
- No registrar como “migrada” una aserción que siga existiendo sin cambios.
