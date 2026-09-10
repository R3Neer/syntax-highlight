# Análisis temporal — fallback real de Reading View

> Documento temporal del Método Iterativo de Samuel. Debe eliminarse al finalizar este proceso.

## Diagnóstico confirmado

- [x] La instalación del usuario fue correcta: `install:obsidian` reconstruye el monorepo y copia `dist/main.js`, `styles.css` y `manifest.json` al vault.
- [x] La implementación anterior hizo `blocks.ts` quote-aware y cubrió correctamente scanner, offsets físicos/lógicos, reescritura y editor Markdown.
- [x] El hueco está en el límite con Obsidian Reading View: `main.ts` solo registra processors especializados mediante `registerMarkdownCodeBlockProcessor`.
- [x] No existe un `registerMarkdownPostProcessor` general que inspeccione el HTML ya generado y capture `<pre><code class="language-*">` que hayan quedado sin procesar dentro de contenedores como callouts.
- [x] La API de Obsidian define el postprocessor general precisamente para modificar HTML después del render Markdown y el processor especializado como una capa particular para code blocks.
- [x] La CI anterior demostró que nuestro scanner entendía el source quoted, pero no demostró que el host invocase el processor especializado en ese contexto. Esa era la carencia de prueba.

## Arquitectura propuesta

### 1. Mantener la ruta especializada y añadir fallback tardío

Conservar `registerMarkdownCodeBlockProcessor` para el camino normal. Añadir un `registerMarkdownPostProcessor` con `sortOrder` posterior al default para inspeccionar el DOM que sobreviva a los processors especializados.

El fallback no sabe qué es un callout. Busca estructuralmente `<pre>` con un único hijo directo `<code>` que tenga una clase exacta `language-<fence>`.

### 2. Resolver una sola vez la semántica de un fence

Crear en `main.ts` una única función/método `renderReadingFence(fence, source, element, context): boolean` que:

1. da precedencia a `registry.byFence(fence)`;
2. si no hay runtime configurado, prueba `commonFenceMatch(fence)`;
3. si ninguno reconoce el fence, devuelve `false` sin tocar DOM;
4. si Reading está desactivado, aplica el renderer plano existente;
5. si hay runtime, usa `renderSyntaxCode`;
6. si es common, usa `renderCommonCode` con el fence real;
7. marca el host como procesado y habilita clic-para-editar.

Los processors especializados y el fallback llaman a esta misma función. Así no puede existir una política para top-level y otra para callouts.

### 3. Módulo puro/testeable del límite DOM

Crear `reading-fallback.ts` con:

- extracción estricta del fence desde `classList`;
- colección en snapshot de candidatos no procesados;
- rechazo de DOM ambiguo/destructivo;
- creación de un host de sustitución;
- llamada al handler compartido;
- sustitución del `<pre>` solo si el handler reconoce el fence;
- marca de procesamiento e idempotencia;
- helper de registro que asigna un `sortOrder` tardío.

Esto permite probar el límite que falló sin tener que simular internamente el parser Markdown de Obsidian.

### 4. Reglas adversariales del detector

- Solo clases cuyo nombre empieza exactamente por `language-` cuentan.
- Se normaliza el suffix a minúsculas, pero no se recorta ni interpreta arbitrariamente.
- Si existen dos `language-*` distintas, el bloque se considera ambiguo y se deja intacto.
- Duplicados equivalentes tras normalización sí son tolerables.
- Solo se reemplaza un `<pre>` cuando tiene exactamente un hijo elemento y ese hijo es `<code>`, evitando destruir botones/wrappers añadidos por terceros.
- Se ignora cualquier `<pre>` que ya esté dentro de `.syntax-highlight-frame` o de un ancestro con `data-syntax-highlight-processed`.
- Se recopilan candidatos antes de reemplazar nodos para que mutar el DOM durante la iteración no omita hermanos posteriores.

### 5. Orden de postprocesado

El fallback debe ejecutarse después del camino especializado. El helper asignará un `sortOrder` positivo alto (`100`) al processor registrado. Así, cuando `registerMarkdownCodeBlockProcessor` haya funcionado, su `<pre><code>` ya habrá desaparecido o estará marcado y el fallback no hará nada.

### 6. Aliases no registrables por processor especializado

El fallback resolverá por el mismo `registry.byFence/commonFenceMatch` y no por `isSafeMarkdownProcessorLanguage`. Esto permite incluso rescatar aliases reconocidos cuyo nombre no se pueda registrar mediante el processor especializado, sin ampliar el catálogo conceptual.

## Estrategia de tests adversariales

Crear `reading-fallback.test.ts` en happy-dom con DOM similar a Obsidian y casos de caja negra:

- callout anidado con Text y PowerShell;
- Markdown presentacional;
- desconocido intacto;
- varios hermanos, nesting profundo y root `<pre>`;
- repetición del processor sobre el mismo árbol;
- output ya generado por Syntax Highlight;
- clases engañosas y conflicto entre dos `language-*`;
- símbolos/saltos de línea exactos;
- alias `text-right-justified`;
- alias común no registrable por processor especializado si la clase DOM lo expresa;
- un handler que reemplaza nodos mientras quedan candidatos posteriores;
- helper de registro: comprueba que el callback queda efectivamente registrado, con orden tardío, y que al invocarlo ejecuta el fallback.

Ampliar tests existentes de Reading View si hace falta para validar el marcador de procesamiento y la ruta compartida sin cambiar semántica.

## Riesgos

- **Doble procesamiento:** mitigado por sort order + detector que excluye output propio + marca explícita.
- **Conflicto con plugins de terceros:** mitigado no destruyendo estructuras `<pre>` complejas y dejando lenguajes desconocidos intactos.
- **Clases ambiguas:** fail-closed; no adivinar.
- **Cambios de settings:** la ruta compartida consulta settings/registry en cada invocación, no congela estado.
- **Contraste:** al insertar el mismo renderer en DOM, el `CommonContrastManager` observa el subtree nuevo como en top-level.
- **Click-to-edit:** el fallback entrega fence y source al mismo mecanismo existente, que ya localiza body source mediante `findCodeBlockBodyStartLine`.

## Revisión del análisis

- A1: se descartó reemplazar por completo los processors especializados. Son eficientes y correctos cuando Obsidian sí los invoca; el postprocessor general debe ser un fallback, no una segunda implementación dominante.
- A2: se añadió una condición fail-closed para `<pre>` con hijos adicionales, reduciendo riesgo de destruir UI de otros plugins.
- A3: se añadió `sortOrder` tardío como defensa adicional contra doble procesamiento, en vez de depender solo de marcas DOM.
- A4: sin cambios. Análisis estable para pasar a plan.
