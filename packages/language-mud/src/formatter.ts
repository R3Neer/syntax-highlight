import { minimalEdit, type FormatResult } from "@r3neer/syntax-highlight-core";

import {
  DEFAULT_HIGHLIGHT_CONFIG,
  type MudHighlightConfig,
} from "./config";
import { tokenizeMud } from "./tokenizer";

type Kind = "atom" | "comment" | "operator" | "punctuation" | "unknown";
interface Token { from: number; to: number; text: string; kind: Kind }

const PREFIX_WORDS = new Set([
  "add", "after", "allowed", "and", "by", "destroy", "eventually", "for",
  "from", "given", "if", "in", "is", "not", "old", "on", "or",
  "otherwise", "remove", "then", "through", "to", "when", "with", "xor",
]);
const PARENTHESIZED = new Set([
  "after", "for", "given", "if", "otherwise", "then", "when", "with",
]);
const COMPACT = new Set([".", "..", "~"]);
const PREFIX = new Set(["+", "-", "!"]);

function operatorSet(config: MudHighlightConfig): Set<string> {
  const category = config.categories["operator-symbol"];
  return new Set(category === undefined ? [] : config.symbols[category] ?? []);
}

function numberAt(source: string, offset: number): string | undefined {
  return /^(?:\d(?:[\d_]*\d)?(?::\d(?:[\d_]*\d)?)+|(?:r)?(?:\d(?:[\d_]*\d)?(?:\.\d(?:[\d_]*\d)?)?|\.\d(?:[\d_]*\d)?)(?:[eE][+-]?\d(?:[\d_]*\d)?)?)/.exec(source.slice(offset))?.[0];
}

function scan(source: string, config: MudHighlightConfig): Token[] {
  const operators = operatorSet(config);
  const punctuation = Object.entries(config.symbols)
    .filter(([category]) => category !== config.categories["operator-symbol"])
    .flatMap(([, values]) => values);
  const symbols = [...new Set([...operators, ...punctuation, ".", "~"])]
    .sort((left, right) => right.length - left.length);
  const result: Token[] = [];
  let cursor = 0;
  const push = (to: number, kind: Kind): void => {
    result.push({ from: cursor, to, text: source.slice(cursor, to), kind });
    cursor = to;
  };
  while (cursor < source.length) {
    const character = source[cursor] ?? "";
    if (/[\t ]/.test(character)) { cursor += 1; continue; }
    if (source.startsWith('"""', cursor) || source.startsWith("###", cursor)) {
      const delimiter = source.startsWith('"""', cursor) ? '"""' : "###";
      const close = source.indexOf(delimiter, cursor + 3);
      push(close < 0 ? source.length : close + 3, delimiter === "###" ? "comment" : "atom");
      continue;
    }
    if (character === "#") {
      const close = source.indexOf("#", cursor + 1);
      push(close < 0 ? source.length : close + 1, "comment");
      continue;
    }
    if (character === '"' || character === "'") {
      let end = cursor + 1;
      while (end < source.length) {
        if (source[end] === "\\") end += 2;
        else if (source[end] === character) { end += 1; break; }
        else end += 1;
      }
      push(Math.min(end, source.length), "atom");
      continue;
    }
    const number = numberAt(source, cursor);
    if (number !== undefined) { push(cursor + number.length, "atom"); continue; }
    const identifier = /^[A-Za-z][A-Za-z0-9]*/.exec(source.slice(cursor))?.[0];
    if (identifier !== undefined) { push(cursor + identifier.length, "atom"); continue; }
    const symbol = symbols.find((candidate) => source.startsWith(candidate, cursor));
    if (symbol !== undefined) {
      push(cursor + symbol.length, operators.has(symbol) || symbol === "~" ? "operator" : "punctuation");
      continue;
    }
    push(cursor + 1, "unknown");
  }
  return result;
}

function unary(tokens: readonly Token[], index: number): boolean {
  const token = tokens[index];
  if (token === undefined || !PREFIX.has(token.text)) return false;
  const previous = tokens[index - 1];
  return previous === undefined || previous.kind === "operator" ||
    ["(", "[", "{", ",", ":", ";"].includes(previous.text) ||
    PREFIX_WORDS.has(previous.text);
}

function compactUnits(source: string): Set<number> {
  return new Set(tokenizeMud(source)
    .filter(({ categoryId, text }) => categoryId === "unit" && (text === "*" || text === "/"))
    .map(({ from }) => from));
}

function separator(
  source: string,
  tokens: readonly Token[],
  index: number,
  unitOperators: ReadonlySet<number>,
): string {
  const left = tokens[index];
  const right = tokens[index + 1];
  if (left === undefined || right === undefined) return "";
  const original = source.slice(left.to, right.from);
  if (left.kind === "unknown" || right.kind === "unknown") return original;
  if (right.kind === "comment") return " ";
  if (COMPACT.has(left.text) || COMPACT.has(right.text)) return "";
  if ([",", ":", ";", ")", "]"].includes(right.text)) return "";
  if (right.text === "}") return left.text === "{" ? "" : " ";
  if (["(", "["].includes(left.text)) return "";
  if (left.text === "{") return right.text === "}" ? "" : " ";
  if (left.text === ":" && /^\d[\d_]*$/.test(tokens[index - 1]?.text ?? "") && /^\d[\d_]*$/.test(right.text)) return "";
  if ([",", ":", ";"].includes(left.text)) return " ";
  if (right.text === "(") return left.kind === "operator" || PARENTHESIZED.has(left.text) ? " " : "";
  if (right.text === "[") return left.kind === "operator" ? " " : "";
  if (right.text === "{") return " ";
  if (unitOperators.has(left.from) || unitOperators.has(right.from)) return "";
  if (left.kind === "operator") return unary(tokens, index) ? "" : " ";
  if (right.kind === "operator") return " ";
  return " ";
}

export function formatMudHorizontalSpacing(
  source: string,
  config: MudHighlightConfig = DEFAULT_HIGHLIGHT_CONFIG,
): string {
  const indentation = /^[\t ]*/.exec(source)?.[0] ?? "";
  const body = source.slice(indentation.length).trimEnd();
  if (body === "") return indentation;
  const tokens = scan(body, config);
  const units = compactUnits(body);
  let result = indentation;
  tokens.forEach((token, index) => {
    result += token.text;
    result += separator(body, tokens, index, units);
  });
  return result;
}

export function formatMud(
  source: string,
  config: MudHighlightConfig = DEFAULT_HIGHLIGHT_CONFIG,
): FormatResult {
  const formatted = source
    .split(/(\r\n|\n|\r)/)
    .map((part, index) => index % 2 === 0 ? formatMudHorizontalSpacing(part, config) : part)
    .join("");
  return { source, formatted, edits: minimalEdit(source, formatted), diagnostics: [] };
}
