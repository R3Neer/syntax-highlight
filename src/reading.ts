import type { MudHighlightConfig } from "./config";
import { tokenClass, tokenizeMud } from "./tokenizer";

export function renderMudCode(
  source: string,
  container: HTMLElement,
  config?: MudHighlightConfig,
): void {
  container.replaceChildren();
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  pre.className = "mud-syntax-block";
  code.className = "language-mud";

  let cursor = 0;
  for (const token of tokenizeMud(source, config)) {
    if (token.from > cursor) {
      code.append(document.createTextNode(source.slice(cursor, token.from)));
    }
    const span = document.createElement("span");
    span.className = tokenClass(token.kind);
    span.textContent = token.text;
    code.append(span);
    cursor = token.to;
  }
  if (cursor < source.length) {
    code.append(document.createTextNode(source.slice(cursor)));
  }

  pre.append(code);
  container.append(pre);
}
