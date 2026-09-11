# Revisión TM temporal · documentación y release 1.2.0

Estado: TEMPORAL. Eliminar antes de la release.

## Revisión 1

Resultado: CAMBIOS NECESARIOS.

La auditoría del workflow `release.yml` encontró que la release histórica verificaba que cada paquete ya estuviera publicado en npm, pero la repo no contiene un job que publique esos paquetes. Para una versión nueva ese requisito crea una dependencia externa no automatizada y bloquearía la GitHub release.

El plan se corrigió para que `release.yml` valide coherencia de versión/tag, ejecute check + pack y cree la GitHub release con los mismos assets y `--generate-notes`, dejando npm como proceso separado.

## Revisión 2

Resultado: SIN CAMBIOS.

Se revisó el orden documental, la separación entre fuentes de verdad, la limpieza de instrumentación temporal, el bump coordinado, fast-forward de `main`, tagging y release job. No se identificó otro paso ausente ni una dependencia circular entre documentación y proceso de release.

## Revisión 3

Resultado: SIN CAMBIOS.

Se revisaron failure modes: versión/tag incoherentes, tag fuera de `main`, CI/pack fallido, release duplicada, temporales sin limpiar y documentación que describa internals eliminados. El plan ya contiene gates suficientes y no requiere cambios.

Revisiones 2 y 3 consecutivas sin cambios: plan estable según TM.
