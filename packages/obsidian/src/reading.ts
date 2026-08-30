import { highlightTree } from "@lezer/highlight";

import {
  COMMON_HIGHLIGHT_STYLE,
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

function appendLine(
  source: string,
  code: HTMLElement,
  line: SourceLine,
  lineNumber: number,
  ranges: readonly RenderedRange[],
  showLineNumbers: boolean,
): void {
  const element = document.createElement("span");
  element.className = "syntax-code-line";
  if (showLineNumbers) element.dataset.lineNumber = String(lineNumber);
  const content = document.createElement("span");
  content.className = "syntax-code-line-content";

  let cursor = line.from;
  for (const range of ranges) {
    if (range.to <= line.from || range.from >= line.to) continue;
    const from = Math.max(range.from, line.from);
    const to = Math.min(range.to, line.to);
    if (from > cursor) {
      content.append(document.createTextNode(source.slice(cursor, from)));
    }
    const token = document.createElement("span");
    token.className = range.classes;
    token.textContent = source.slice(from, to);
    content.append(token);
    cursor = to;
  }
  if (cursor < line.to) {
    content.append(document.createTextNode(source.slice(cursor, line.to)));
  }
  element.append(content);
  code.append(element);
}

function renderRanges(
  source: string,
  container: HTMLElement,
  languageClass: string,
  ranges: readonly RenderedRange[],
  showLineNumbers: boolean,
  mudBadge: boolean,
): void {
  container.replaceChildren();
  const frame = document.createElement("div");
  frame.className = "syntax-highlight-frame";
  if (mudBadge) {
    frame.classList.add("has-mud-badge");
    const badge = document.createElement("span");
    badge.className = "syntax-language-badge syntax-language-badge-mud";
    badge.title = "MUD";
    badge.setAttribute("aria-label", "Lenguaje Mud");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 34 14");
    svg.setAttribute("aria-hidden", "true");
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", "17");
    label.setAttribute("y", "11");
    label.setAttribute("text-anchor", "middle");
    label.textContent = "Mud";
    svg.append(label);
    badge.append(svg);
    frame.append(badge);
  }
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  pre.className = "syntax-highlight-block";
  pre.classList.toggle("has-line-numbers", showLineNumbers);
  code.className = languageClass;

  const sorted = [...ranges].sort(
    (left, right) => left.from - right.from || left.to - right.to,
  );
  sourceLines(source).forEach((line, index) => {
    appendLine(source, code, line, index + 1, sorted, showLineNumbers);
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
    runtime.settings.id === "mud",
  );
}

export function renderCommonCode(
  source: string,
  container: HTMLElement,
  language: CommonLanguage,
  showLineNumbers = true,
): void {
  const ranges: RenderedRange[] = [];
  const tree = language.support().language.parser.parse(source);
  highlightTree(tree, COMMON_HIGHLIGHT_STYLE, (from, to, classes) => {
    ranges.push({ from, to, classes });
  });
  renderRanges(
    source,
    container,
    `language-${language.fences[0] ?? language.id}`,
    ranges,
    showLineNumbers,
    false,
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
    true,
  );
}
