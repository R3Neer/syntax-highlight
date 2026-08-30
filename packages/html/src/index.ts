import type { HighlightDocument, ThemeDefinition } from "@r3nner/syntax-highlight-core";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeId(value: string): string {
  return /^[a-z][a-z0-9-]*$/.test(value) ? value : "unknown";
}

export function renderHighlightHtml(document: HighlightDocument): string {
  let cursor = 0;
  let body = "";
  for (const span of document.spans) {
    body += escapeHtml(document.source.slice(cursor, span.from));
    body += `<span class="sh-token sh-token--${safeId(span.categoryId)}">${escapeHtml(document.source.slice(span.from, span.to))}</span>`;
    cursor = span.to;
  }
  body += escapeHtml(document.source.slice(cursor));
  return `<pre class="syntax-highlight" data-language="${escapeHtml(document.languageId)}"><code>${body}</code></pre>`;
}

export function themeCss(theme: ThemeDefinition): string {
  const declarations = Object.entries(theme.colors)
    .filter(([id, color]) => /^[a-z][a-z0-9-]*$/.test(id) && /^#[0-9A-Fa-f]{6}$/.test(color))
    .map(([id, color]) => `  --sh-${id}: ${color};`)
    .join("\n");
  const rules = Object.keys(theme.colors)
    .filter((id) => /^[a-z][a-z0-9-]*$/.test(id))
    .map((id) => `.sh-token--${id} { color: var(--sh-${id}); }`)
    .join("\n");
  return `:root {\n${declarations}\n}\n${rules}`;
}

export const BASE_CSS = `.syntax-highlight {
  margin: 0;
  overflow: auto;
  white-space: pre;
  tab-size: 4;
  font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
}
.syntax-highlight code { font: inherit; }`;
