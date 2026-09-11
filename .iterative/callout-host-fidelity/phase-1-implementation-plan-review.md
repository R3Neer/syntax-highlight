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

El orden operativo y las dependencias entre fases se revisaron sin encontrar cambios necesarios.

## Revisión 4

Resultado: SIN CAMBIOS.

Segunda revisión independiente centrada en failure modes y capacidad de rollback:

- externalización falla temprano antes de cambiar comportamiento funcional;
- ausencia inesperada del code-block processor en LP obliga a volver a análisis/gate, no a reintroducir DOM privado;
- scanner quote-aware y Smart Editing permanecen autoridades separadas del nuevo materializador source;
- contraste rendered queda aislado de source por diseño;
- diagnostics se conservan hasta después del gate real, por lo que toda la migración permanece observable;
- cada eliminación de test/API antiguo está ligada al ledger de garantías.

No se encontró un cambio necesario. Revisiones 3 y 4 son consecutivas sin cambios; plan de implementación estable según TM.
