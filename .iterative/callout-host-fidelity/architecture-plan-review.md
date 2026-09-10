# Revisión iterativa del plan arquitectónico

Estado: TEMPORAL. Eliminar al terminar implementación + tests.

## Iteración 1

Resultado: CAMBIOS NECESARIOS.

Problemas encontrados en v1:
- fijaba demasiado pronto una interpretación permisiva sin exigir primero una matriz del comportamiento real de Obsidian;
- hablaba de DOM “real” sin introducir una fase obligatoria de captura/trace del host;
- asumía `CODE` directo y `.cm-embed-block` como contratos antes de verificarlos;
- la propuesta de clases de surface podía convertir una clase interna de CodeMirror en API accidental sin probar efectos laterales;
- faltaba distinguir qué path reclama realmente el bloque antes de corregir Reading.

Cambios aplicados en v2:
- fase 0 obligatoria de instrumentación temporal y captura A/B/C/D;
- matriz explícita de semántica quoted-fence de Obsidian;
- probe derivado de fixtures, no de una forma DOM preconcebida;
- observer de Reading condicionado a evidencia de timing;
- surface adapter con prueba adversarial antes de reutilizar clases host;
- criterios de eliminación más conservadores.

## Iteración 2

Resultado: SIN CAMBIOS ARQUITECTÓNICOS.

Revisión adversarial realizada contra: top-level vs nested, Reading vs LP source/widget, metadata PRE/CODE, lifecycle, theme independence, mapping físico/lógico, unknown fences, nested quotes, Smart Editing y candidatos a eliminación.

No se encontró una dependencia circular ni un supuesto de host que deba fijarse antes de la fase de captura. El plan arquitectónico v2 queda ESTABLE y puede alimentar el plan de implementación.
