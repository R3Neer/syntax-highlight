# Revisión TM temporal · plan de implementación Fase 1

Estado: TEMPORAL. Eliminar al cerrar el ciclo.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

Se incorporaron invalidación conservadora, ledger de garantías retiradas, excepción temporal de selectors privados solo para diagnostics y gate manual de nested rendered.

## Revisión 2

Resultado: CAMBIOS NECESARIOS.

Se reconcilió el plan con la reapertura arquitectónica:

- frontera completa de externals oficial;
- peers separados de externals;
- fallback Markdown con garantía Reading y sin dependencia LP;
- gate LP basado en code-block processor;
- tests futuros alineados con esos contratos.

## Revisión 3

Resultado: SIN CAMBIOS.

Se revisó el orden operativo y las dependencias entre fases:

- unificar runtime primero garantiza que el resto se valida ya contra la identidad host correcta;
- extraer el detector PRE/CODE antes de retirar el bridge conserva la lógica estructural útil;
- retirar el bridge antes de rehacer source fuerza una frontera nítida: LP editable solo puede depender de editor extensions/decorations;
- la invalidación conservadora evita introducir a la vez un algoritmo incremental difícil de auditar;
- surface/presentation se estabiliza antes de restringir contraste, permitiendo comprobar ownership por capas;
- tests nuevos esperan a implementación estable, mientras el ledger evita borrar garantías silenciosamente;
- el gate real cubre el contrato de code-block processor que no se debe fingir con happy-dom.

No se encontró un cambio necesario.
