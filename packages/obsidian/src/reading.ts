import { highlightTree } from "@lezer/highlight";

import {
  COMMON_READING_HIGHLIGHT_STYLE,
  type CommonLanguage,
} from "./common-languages";
import type { MudHighlightConfig } from "./config";
import type { LanguageRuntime } from "./languages";
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

function appendLanguageBadge(frame: HTMLElement, badge: LanguageBadge): void {
  frame.classList.add("has-language-badge");
  const element = document.createElement("span");
  element.className = "syntax-language-badge";
  element.title = badge.mud ? "MUD" : badge.label;
  element.setAttribute("aria-label", `Lenguaje ${badge.label}`);

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

  frame.append(element);
}

function renderRanges(
  source: string,
  container: HTMLElement,
  languageClass: string,
  ranges: readonly RenderedRange[],
  showLineNumbers: boolean,
  badge?: LanguageBadge,
  plainClass?: string,
): void {
  container.replaceChildren();
  const frame = document.createElement("div");
  frame.className = "syntax-highlight-frame";
  if (badge !== undefined) appendLanguageBadge(frame, badge);
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  pre.className = "syntax-highlight-block";
  pre.classList.toggle("has-line-numbers", showLineNumbers);
  code.className = languageClass;

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
  );
}

export function renderCommonCode(
  source: string,
  container: HTMLElement,
  language: CommonLanguage,
  showLineNumbers = true,
): void {
  const ranges: RenderedRange[] = [];
  const support = language.support?.();
  if (support !== undefined) {
    const tree = support.language.parser.parse(source);
    highlightTree(tree, COMMON_READING_HIGHLIGHT_STYLE, (from, to, classes) => {
      ranges.push({ from, to, classes });
    });
  }
  const effectiveLineNumbers =
    showLineNumbers && (language.presentation?.lineNumbers ?? true);
  const badge = language.presentation?.badge === false
    ? undefined
    : { label: language.name };
  renderRanges(
    source,
    container,
    `language-${language.fences[0] ?? language.id}`,
    ranges,
    effectiveLineNumbers,
    badge,
    "syntax-common-plain",
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
