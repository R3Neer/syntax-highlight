export type MudTokenKind =
  | "comment"
  | "keyword"
  | "builtin"
  | "constant"
  | "declaration"
  | "type"
  | "function"
  | "string"
  | "character"
  | "number"
  | "operator"
  | "brace"
  | "parenthesis"
  | "bracket"
  | "punctuation";

export interface MudToken {
  from: number;
  to: number;
  kind: MudTokenKind;
  text: string;
}

import {
  DEFAULT_HIGHLIGHT_CONFIG,
  prepareHighlightConfig,
  type MudHighlightConfig,
  type PreparedHighlightConfig,
} from "./config";

interface RawToken {
  from: number;
  to: number;
  kind: MudTokenKind | "word";
  text: string;
}

const DEFAULT_PREPARED_CONFIG = prepareHighlightConfig(DEFAULT_HIGHLIGHT_CONFIG);
const PREPARED_CONFIGS = new WeakMap<object, PreparedHighlightConfig>();

function preparedConfig(config: MudHighlightConfig): PreparedHighlightConfig {
  if (config === DEFAULT_HIGHLIGHT_CONFIG) return DEFAULT_PREPARED_CONFIG;
  const cached = PREPARED_CONFIGS.get(config);
  if (cached !== undefined) return cached;
  const prepared = prepareHighlightConfig(config);
  PREPARED_CONFIGS.set(config, prepared);
  return prepared;
}

function lineEnd(source: string, offset: number): number {
  const lf = source.indexOf("\n", offset);
  const cr = source.indexOf("\r", offset);
  if (lf < 0) return cr < 0 ? source.length : cr;
  if (cr < 0) return lf;
  return Math.min(lf, cr);
}

function lineStart(source: string, offset: number): number {
  for (let index = offset - 1; index >= 0; index -= 1) {
    if (source[index] === "\n" || source[index] === "\r") return index + 1;
  }
  return 0;
}

function onlyHorizontalSpace(value: string): boolean {
  return /^[\t ]*$/.test(value);
}

function isBlockOpener(source: string, offset: number, delimiter: string): boolean {
  const end = lineEnd(source, offset + delimiter.length);
  return onlyHorizontalSpace(source.slice(offset + delimiter.length, end));
}

function findBlockClose(source: string, offset: number, delimiter: string): number {
  let cursor = lineEnd(source, offset + delimiter.length);
  while (cursor < source.length) {
    if (source[cursor] === "\r" && source[cursor + 1] === "\n") cursor += 2;
    else cursor += 1;
    const end = lineEnd(source, cursor);
    const line = source.slice(cursor, end);
    if (line.trim() === delimiter) {
      return cursor + line.lastIndexOf(delimiter) + delimiter.length;
    }
    cursor = end;
  }
  return source.length;
}

function scanQuoted(source: string, offset: number, quote: string): number {
  let cursor = offset + quote.length;
  while (cursor < source.length) {
    const character = source[cursor];
    if (character === "\n" || character === "\r") return cursor;
    if (character === "\\") {
      cursor += 2;
      continue;
    }
    if (character === quote) return cursor + quote.length;
    cursor += 1;
  }
  return cursor;
}

function numericMatch(source: string, offset: number): string | undefined {
  const value = source.slice(offset);
  const match = /^(?:r)?(?:\d(?:[\d_]*\d)?(?:\.\d(?:[\d_]*\d)?)?|\.\d(?:[\d_]*\d)?)(?:[eE][+-]?\d(?:[\d_]*\d)?)?/.exec(
    value,
  );
  return match?.[0];
}

function identifierMatch(source: string, offset: number): string | undefined {
  return /^[A-Za-z][A-Za-z0-9]*/.exec(source.slice(offset))?.[0];
}

function addRaw(
  tokens: RawToken[],
  source: string,
  from: number,
  to: number,
  kind: RawToken["kind"],
): void {
  tokens.push({ from, to, kind, text: source.slice(from, to) });
}

function scanRaw(source: string, config: PreparedHighlightConfig): RawToken[] {
  const tokens: RawToken[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const character = source[cursor] ?? "";
    if (/\s/.test(character)) {
      cursor += 1;
      continue;
    }

    if (
      source.startsWith('"""', cursor) &&
      isBlockOpener(source, cursor, '"""')
    ) {
      const end = findBlockClose(source, cursor, '"""');
      addRaw(tokens, source, cursor, end, "string");
      cursor = end;
      continue;
    }

    if (
      source.startsWith("###", cursor) &&
      isBlockOpener(source, cursor, "###")
    ) {
      const end = findBlockClose(source, cursor, "###");
      addRaw(tokens, source, cursor, end, "comment");
      cursor = end;
      continue;
    }

    if (character === "#") {
      const end = lineEnd(source, cursor + 1);
      const explicitClose = source.indexOf("#", cursor + 1);
      const tokenEnd =
        explicitClose >= 0 && explicitClose < end ? explicitClose + 1 : end;
      addRaw(tokens, source, cursor, tokenEnd, "comment");
      cursor = tokenEnd;
      continue;
    }

    if (character === '"') {
      const end = scanQuoted(source, cursor, '"');
      addRaw(tokens, source, cursor, end, "string");
      cursor = end;
      continue;
    }

    if (character === "'") {
      const end = scanQuoted(source, cursor, "'");
      addRaw(tokens, source, cursor, end, "character");
      cursor = end;
      continue;
    }

    const number = numericMatch(source, cursor);
    if (
      number !== undefined &&
      (character !== "r" || number.length > 1) &&
      !(cursor > 0 && /[A-Za-z0-9]/.test(source[cursor - 1] ?? ""))
    ) {
      addRaw(tokens, source, cursor, cursor + number.length, "number");
      cursor += number.length;
      continue;
    }

    const identifier = identifierMatch(source, cursor);
    if (identifier !== undefined) {
      addRaw(tokens, source, cursor, cursor + identifier.length, "word");
      cursor += identifier.length;
      continue;
    }

    const symbol = config.symbols.find(({ text }) =>
      source.startsWith(text, cursor),
    );
    if (symbol !== undefined) {
      addRaw(tokens, source, cursor, cursor + symbol.text.length, symbol.kind);
      cursor += symbol.text.length;
      continue;
    }

    cursor += 1;
  }

  return tokens;
}

function contextualKeyword(
  tokens: RawToken[],
  index: number,
  config: PreparedHighlightConfig,
): boolean {
  const token = tokens[index];
  if (token === undefined) return false;
  const previous = tokens[index - 1]?.text;
  const next = tokens[index + 1]?.text;

  return config.contextualKeywords.some(
    (entry) =>
      entry.word === token.text &&
      (entry.previous === undefined || entry.previous === previous) &&
      (entry.next === undefined || entry.next === next),
  );
}

function classifyWord(
  tokens: RawToken[],
  index: number,
  config: PreparedHighlightConfig,
): MudTokenKind | undefined {
  const token = tokens[index];
  if (token === undefined || token.kind !== "word") return undefined;
  const configuredKind = config.words.get(token.text);
  if (configuredKind !== undefined) return configuredKind;
  if (contextualKeyword(tokens, index, config)) return "keyword";

  const previous = tokens[index - 1];
  const next = tokens[index + 1];
  if (previous !== undefined && config.declarationHeads.has(previous.text)) {
    return "declaration";
  }
  if (isInheritedThing(tokens, index)) return "declaration";
  if (isTypeReference(tokens, index)) return "type";
  if (next?.text === "(") return "function";
  return undefined;
}

function isInheritedThing(tokens: RawToken[], index: number): boolean {
  let cursor = index - 1;
  if (tokens[cursor]?.text === "as") return true;
  if (tokens[cursor]?.text !== ",") return false;
  cursor -= 1;

  while (cursor >= 0) {
    const token = tokens[cursor];
    if (token?.text === "as") return true;
    if (token?.kind === "word" || token?.text === ",") {
      cursor -= 1;
      continue;
    }
    return false;
  }
  return false;
}

function isTypeReference(tokens: RawToken[], index: number): boolean {
  const previous = tokens[index - 1]?.text;
  if (previous === ":" || previous === "to" || previous === "over") return true;
  if (previous === "->") return true;

  if (previous !== ":=") return false;
  const declarationName = tokens[index - 2];
  const declarationHead = tokens[index - 3]?.text;
  return (
    declarationName?.kind === "word" &&
    (declarationHead === "alias" || declarationHead === "magnitude")
  );
}

export function tokenizeMud(
  source: string,
  config: MudHighlightConfig = DEFAULT_HIGHLIGHT_CONFIG,
): MudToken[] {
  const prepared = preparedConfig(config);
  const raw = scanRaw(source, prepared);
  const result: MudToken[] = [];

  raw.forEach((token, index) => {
    const kind =
      token.kind === "word" ? classifyWord(raw, index, prepared) : token.kind;
    if (kind !== undefined) result.push({ ...token, kind });
  });

  return result;
}

export function tokenClass(kind: MudTokenKind): string {
  return `mud-token-${kind}`;
}

export function sourceLineStart(source: string, offset: number): number {
  return lineStart(source, offset);
}
