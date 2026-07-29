import type { MudHighlightConfig } from "./config";
import type { LanguageRuntime } from "./languages";
import {
  tokenClass,
  tokenColorClass,
  tokenizeMud,
  type SyntaxToken,
} from "./tokenizer";

function renderTokens(
  source: string,
  container: HTMLElement,
  languageId: string,
  languageClass: string,
  tokens: readonly SyntaxToken[],
): void {
  container.replaceChildren();
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  pre.className = "syntax-highlight-block";
  code.className = languageClass;

  let cursor = 0;
  for (const token of tokens) {
    if (token.from > cursor) {
      code.append(document.createTextNode(source.slice(cursor, token.from)));
    }
    const span = document.createElement("span");
    span.classList.add(
      tokenClass(token.categoryId),
      tokenColorClass(languageId, token.categoryId),
    );
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

export function renderSyntaxCode(
  source: string,
  container: HTMLElement,
  runtime: LanguageRuntime,
): void {
  renderTokens(
    source,
    container,
    runtime.settings.id,
    `language-${runtime.descriptor.fences[0] ?? runtime.settings.id}`,
    runtime.tokenize(source),
  );
}

export function renderMudCode(
  source: string,
  container: HTMLElement,
  config?: MudHighlightConfig,
): void {
  renderTokens(
    source,
    container,
    "mud",
    "language-mud",
    tokenizeMud(source, config),
  );
}
