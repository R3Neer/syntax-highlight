import { commonFenceMatch, presentationClassNames } from "./block-presentation";
import { commonSemanticRanges } from "./common-semantic-ranges";
import type { CommonLanguage } from "./common-languages";
import type { MudHighlightConfig } from "./config";
import type { LanguageRuntime } from "./languages";
import type { UiLocale } from "./i18n";
import {
  tokenClass,
  tokenColorClass,
  tokenizeMud,
  type SyntaxToken,
} from "./tokenizer";

interface RenderedRange {
  from: number;
  to: number;
  classes: string;
}

interface SourceLine {
  from: number;
  to: number;
}

interface LanguageBadge {
  label: string;
  mud?: boolean;
}

function sourceLines(source: string): SourceLine[] {
  const result: SourceLine[] = [];
  let from = 0;
  for (let index = 0; index <= source.length; index += 1) {
    if (
      index < source.length &&
      source[index] !== "\n" &&
      source[index] !== "\r"
    ) {
      continue;
    }
    result.push({ from, to: index });
    if (source[index] === "\r" && source[index + 1] === "\n") index += 1;
    from = index + 1;
  }
  return result.length > 0 ? result : [{ from: 0, to: 0 }];
}

function appendPlainSource(
  source: string,
  content: HTMLElement,
  from: number,
  to: number,
  plainClass?: string,
): void {
  if (from >= to) return;
  const text = source.slice(from, to);
  if (plainClass === undefined) {
    content.append(document.createTextNode(text));
    return;
  }
  const plain = document.createElement("span");
  plain.className = plainClass;
  plain.textContent = text;
  content.append(plain);
}

function appendLine(
  source: string,
  code: HTMLElement,
  line: SourceLine,
  lineNumber: number,
  ranges: readonly RenderedRange[],
  showLineNumbers: boolean,
  plainClass?: string,
): void {
  const element = document.createElement("span");
  element.className = "syntax-code-line";
  element.dataset.sourceLine = String(lineNumber);
  if (showLineNumbers) element.dataset.lineNumber = String(lineNumber);
  const content = document.createElement("span");
  content.className = "syntax-code-line-content";

  let cursor = line.from;
  for (const range of ranges) {
    if (range.to <= line.from || range.from >= line.to) continue;
    const from = Math.max(range.from, line.from, cursor);
    const to = Math.min(range.to, line.to);
    if (from >= to) continue;
    appendPlainSource(source, content, cursor, from, plainClass);
    const token = document.createElement("span");
    token.className = range.classes;
    token.textContent = source.slice(from, to);
    content.append(token);
    cursor = to;
  }
  appendPlainSource(source, content, cursor, line.to, plainClass);
  element.append(content);
  code.append(element);
}

function appendLanguageBadge(
  frame: HTMLElement,
  pre: HTMLPreElement,
  badge: LanguageBadge,
): void {
  frame.classList.add("has-language-badge");
  const element = document.createElement("span");
  element.className = "syntax-language-badge";
  element.title = badge.mud ? "MUD" : badge.label;
  element.setAttribute("aria-label", `Language ${badge.label}`);

  if (badge.mud) {
    frame.classList.add("has-mud-badge");
    element.classList.add("syntax-language-badge-mud");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 34 14");
    svg.setAttribute("aria-hidden", "true");
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", "17");
    label.setAttribute("y", "11");
    label.setAttribute("text-anchor", "middle");
    label.textContent = "Mud";
    svg.append(label);
    element.append(svg);
  } else {
    element.classList.add("syntax-language-badge-text");
    element.textContent = badge.label;
  }

  pre.append(element);
}

function setCopyButtonIcon(button: HTMLButtonElement, copied: boolean): void {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    copied
      ? "M20 6 9 17l-5-5"
      : "M8 4h11a2 2 0 0 1 2 2v11M5 8h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z",
  );
  svg.append(path);
  button.replaceChildren(svg);
}

function appendCopyButton(pre: HTMLPreElement, source: string, locale: UiLocale): void {
  const copyLabel = locale === "es" ? "Copiar código" : "Copy code";
  const copiedLabel = locale === "es" ? "Código copiado" : "Code copied";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "syntax-copy-button";
  button.setAttribute("aria-label", copyLabel);
  button.title = copyLabel;
  setCopyButtonIcon(button, false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  let copied = false;
  let leftAfterCopy = false;
  const reset = (): void => {
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    resetTimer = undefined;
    copied = false;
    leftAfterCopy = false;
    button.classList.remove("is-copied");
    button.removeAttribute("aria-disabled");
    button.setAttribute("aria-label", copyLabel);
    button.title = copyLabel;
    setCopyButtonIcon(button, false);
  };
  button.addEventListener("pointerleave", () => {
    if (copied) leftAfterCopy = true;
  });
  button.addEventListener("pointerenter", () => {
    if (copied && leftAfterCopy) reset();
  });
  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (copied) return;
    try {
      await navigator.clipboard.writeText(source);
    } catch (error) {
      console.error("[Syntax Highlight] Failed to copy code block.", error);
      return;
    }
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    copied = true;
    leftAfterCopy = false;
    button.classList.add("is-copied");
    button.setAttribute("aria-disabled", "true");
    button.setAttribute("aria-label", copiedLabel);
    button.title = copiedLabel;
    setCopyButtonIcon(button, true);
    resetTimer = setTimeout(reset, 1000);
  });
  pre.append(button);
}

function renderRanges(
  source: string,
  container: HTMLElement,
  languageClass: string,
  ranges: readonly RenderedRange[],
  showLineNumbers: boolean,
  badge?: LanguageBadge,
  plainClass?: string,
  frameClasses: readonly string[] = [],
  locale: UiLocale = "en",
): void {
  container.replaceChildren();
  const frame = document.createElement("div");
  frame.className = "syntax-highlight-frame";
  if (frameClasses.length > 0) frame.classList.add(...frameClasses);
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  pre.className = "syntax-highlight-block";
  pre.classList.toggle("has-line-numbers", showLineNumbers);
  code.className = `${languageClass} is-loaded`;

  const sorted = [...ranges].sort(
    (left, right) => left.from - right.from || left.to - right.to,
  );
  sourceLines(source).forEach((line, index) => {
    appendLine(
      source,
      code,
      line,
      index + 1,
      sorted,
      showLineNumbers,
      plainClass,
    );
  });
  pre.append(code);
  if (badge !== undefined) {
    appendLanguageBadge(frame, pre, badge);
    appendCopyButton(pre, source, locale);
  }
  frame.append(pre);
  container.append(frame);
}

function syntaxRanges(
  languageId: string,
  tokens: readonly SyntaxToken[],
): RenderedRange[] {
  return tokens.map((token) => ({
    from: token.from,
    to: token.to,
    classes: `${tokenClass(token.categoryId)} ${tokenColorClass(languageId, token.categoryId)}`,
  }));
}

export function renderSyntaxCode(
  source: string,
  container: HTMLElement,
  runtime: LanguageRuntime,
  showLineNumbers = true,
  locale: UiLocale = "en",
): void {
  renderRanges(
    source,
    container,
    `language-${runtime.descriptor.fences[0] ?? runtime.settings.id}`,
    syntaxRanges(runtime.settings.id, runtime.tokenize(source)),
    showLineNumbers,
    {
      label: runtime.descriptor.name,
      mud: runtime.settings.id === "mud",
    },
    undefined,
    [],
    locale,
  );
}

export function renderCommonCode(
  source: string,
  container: HTMLElement,
  language: CommonLanguage,
  showLineNumbers = true,
  fence = language.fences[0] ?? language.id,
  locale: UiLocale = "en",
): void {
  const ranges = commonSemanticRanges(language, source);
  const effectiveLineNumbers =
    showLineNumbers && (language.presentation?.lineNumbers ?? true);
  const badge = language.presentation?.badge === false
    ? undefined
    : { label: language.name };
  const match = commonFenceMatch(fence);
  const frameClasses = match === undefined ? [] : presentationClassNames(match);
  renderRanges(
    source,
    container,
    `language-${language.fences[0] ?? language.id}`,
    ranges,
    effectiveLineNumbers,
    badge,
    "syntax-common-plain",
    frameClasses,
    locale,
  );
}

export function renderMudCode(
  source: string,
  container: HTMLElement,
  config?: MudHighlightConfig,
): void {
  renderRanges(
    source,
    container,
    "language-mud",
    syntaxRanges("mud", tokenizeMud(source, config)),
    true,
    { label: "Mud", mud: true },
  );
}
