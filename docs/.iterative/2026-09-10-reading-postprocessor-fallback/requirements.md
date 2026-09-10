# Requisitos temporales — fallback de Reading View para fences anidados

> Documento temporal del Método Iterativo de Samuel. Debe eliminarse al finalizar este proceso.

## Funcionales

- [ ] Los bloques fenced reconocidos por Syntax Highlight deben recibir el mismo tratamiento en Reading View aunque Obsidian no los entregue a `registerMarkdownCodeBlockProcessor`, especialmente dentro de blockquotes y callouts.
- [ ] El fallback debe procesar Text, Markdown, lenguajes comunes, perfiles configurados y MUD.
- [ ] Debe reutilizar exactamente los renderers y políticas existentes: tema activo, normalización de contraste, badge/números cuando correspondan, Text/Markdown sin mobiliario de código, alineación/flujo y modificadores locales.
- [ ] Debe preservar el clic-para-editar y la localización correcta de la línea fuente.
- [ ] Debe procesar únicamente bloques `<pre><code>` con un fence/lenguaje reconocido.
- [ ] Debe dejar intactos los lenguajes desconocidos.
- [ ] Debe ser idempotente: nunca reprocesar un bloque ya transformado por Syntax Highlight ni generar renderers anidados.
- [ ] Debe tolerar múltiples clases CSS, mayúsculas/minúsculas en `language-*`, aliases con guiones y aliases que no puedan registrarse como processor especializado.
- [ ] Debe evitar falsos positivos de clases similares (`languageish-*`, `foo-language-*`, etc.).
- [ ] Debe funcionar si el nodo raíz del postprocessor es el propio `<pre>` o si contiene varios bloques a distintas profundidades.
- [ ] Si `markdownReading` está desactivado, no debe aplicar resaltado/presentación, pero debe mantener el comportamiento plano y de edición ya definido por el plugin.

## Integración con Obsidian

- [ ] Registrar un `registerMarkdownPostProcessor` general como fallback de host, sin eliminar los `registerMarkdownCodeBlockProcessor` existentes.
- [ ] El postprocessor general debe actuar sobre el HTML ya renderizado y detectar únicamente bloques todavía no procesados.
- [ ] La ruta especializada y la ruta fallback deben converger en una única función de renderizado para evitar divergencias futuras.
- [ ] El fallback no debe depender del nombre o tipo de callout; debe ser estructural.

## Tests adversariales

- [ ] Simular DOM de callout/blockquotes con `<pre><code class="language-...">` sin pasar por el processor especializado y verificar transformación completa.
- [ ] Verificar Text dentro de callout: sin badge, sin números, clases de presentación y contenido conservado.
- [ ] Verificar lenguaje de código dentro de callout: badge/números/sintaxis según configuración.
- [ ] Verificar Markdown presentacional: sin badge/números pero con highlighting.
- [ ] Verificar bloques ya procesados: cero doble procesamiento incluso en llamadas repetidas.
- [ ] Verificar mezcla de reconocidos y desconocidos en el mismo subtree.
- [ ] Verificar root `<pre>` directo, nesting profundo y varios bloques hermanos.
- [ ] Verificar clases CSS engañosas y más de una clase `language-*`.
- [ ] Verificar alias con guiones (`text-right-justified`) y alias no seguro para processor especializado cuando sea resoluble.
- [ ] Verificar que el source entregado al renderer es exactamente `textContent` del `<code>`, sin perder símbolos ni saltos.
- [ ] Verificar que un renderer que sustituye el nodo durante la iteración no hace saltarse otros candidatos.
- [ ] Añadir una prueba del límite con el host que demuestre que el postprocessor general queda realmente registrado y delega en el fallback.

## No funcionales

- [ ] Mantener una sola fuente de verdad para resolver fence → runtime/common.
- [ ] Evitar lógica especial para callouts concretos.
- [ ] No duplicar renderizado entre processor especializado y fallback.
- [ ] Mantener compatibilidad con la arquitectura actual y sin cambios de schema.
- [ ] `npm ci`, lint, typecheck, tests, build y `pack:all` verdes.
- [ ] Revisar el diff con perspectiva adversarial después de cada implementación y repetir el bucle si aparece una carencia.
- [ ] Eliminar requisitos/análisis/plan temporales y cualquier maquinaria auxiliar antes del merge final.

## Revisión de requisitos

- R1: se exige explícitamente una prueba del límite con el host, porque la implementación anterior testeó el parser interno pero no que Reading View recibiera los bloques anidados.
- R2: se exige convergencia de las dos rutas de render para impedir que vuelvan a separarse semánticamente.
- R3: sin cambios. Requisitos estables para pasar a análisis.
