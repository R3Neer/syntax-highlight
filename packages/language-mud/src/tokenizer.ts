export interface SyntaxToken {
  from: number;
  to: number;
  categoryId: string;
  text: string;
}

export type MudToken = SyntaxToken;

import {
  DEFAULT_HIGHLIGHT_CONFIG,
  prepareHighlightConfig,
  type MudHighlightConfig,
  type PreparedHighlightConfig,
} from "./config";

interface RawToken {
  from: number;
  to: number;
  categoryId: string;
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
  const match =
    /^(?:\d(?:[\d_]*\d)?(?::\d(?:[\d_]*\d)?)+|(?:r)?(?:\d(?:[\d_]*\d)?(?:\.\d(?:[\d_]*\d)?)?|\.\d(?:[\d_]*\d)?)(?:[eE][+-]?\d(?:[\d_]*\d)?)?)/.exec(
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
  categoryId: RawToken["categoryId"],
): void {
  tokens.push({ from, to, categoryId, text: source.slice(from, to) });
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
      addRaw(tokens, source, cursor, end, "text");
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
      addRaw(tokens, source, cursor, end, "text");
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
      const categoryId = number.startsWith("r")
        ? "rumber"
        : number.includes(":")
          ? "point-literal"
          : "exact-number";
      addRaw(tokens, source, cursor, cursor + number.length, categoryId);
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
      addRaw(
        tokens,
        source,
        cursor,
        cursor + symbol.text.length,
        symbol.categoryId,
      );
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
  source: string,
  tokens: RawToken[],
  index: number,
  config: PreparedHighlightConfig,
): string | undefined {
  const token = tokens[index];
  if (token === undefined || token.categoryId !== "word") return undefined;
  const configuredKind = config.words.get(token.text);
  if (configuredKind !== undefined) return configuredKind;
  if (contextualKeyword(tokens, index, config)) {
    return config.categories.contextual;
  }

  const previous = tokens[index - 1];
  const next = tokens[index + 1];
  if (previous !== undefined && config.declarationHeads.has(previous.text)) {
    return config.categories["declaration-name"] ?? "declared-name";
  }
  if (previous?.text === "unit") {
    return config.categories["declaration-name"] ?? "declared-name";
  }
  if (isInheritedThing(tokens, index)) return "specialization-reference";
  if (isFamilyMember(source, tokens, index)) return "family-member";
  if (isTypeReference(tokens, index, config)) return "type-reference";
  if (next?.text === "(") return "invocation-name";
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
    if (token?.categoryId === "word" || token?.text === ",") {
      cursor -= 1;
      continue;
    }
    return false;
  }
  return false;
}

function isFamilyMember(
  source: string,
  tokens: RawToken[],
  index: number,
): boolean {
  const token = tokens[index];
  if (token === undefined) return false;
  const previous = tokens[index - 1]?.text;
  const next = tokens[index + 1]?.text;
  const startsMember =
    previous === "{" ||
    previous === "," ||
    onlyHorizontalSpace(source.slice(lineStart(source, token.from), token.from));
  if (!startsMember || (next !== "," && next !== "{" && next !== "}")) {
    return false;
  }

  let nestedBodies = 0;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const text = tokens[cursor]?.text;
    if (text === "}") {
      nestedBodies += 1;
    } else if (text === "{") {
      if (nestedBodies > 0) {
        nestedBodies -= 1;
      } else {
        return tokens[cursor - 2]?.text === "family";
      }
    }
  }
  return false;
}

function isMagnitudeDimensionReference(
  tokens: RawToken[],
  index: number,
  config: PreparedHighlightConfig,
): boolean {
  let assignment = -1;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const text = tokens[cursor]?.text;
    if (text === ":=") {
      assignment = cursor;
      break;
    }
    if (
      text === "{" ||
      text === "}" ||
      text === ";" ||
      (text !== undefined && config.declarationHeads.has(text))
    ) {
      return false;
    }
  }
  if (assignment < 0) return false;

  for (let cursor = assignment - 1; cursor >= 0; cursor -= 1) {
    const text = tokens[cursor]?.text;
    if (text === "{" || text === "}" || text === ";") return false;
    if (text !== undefined && config.declarationHeads.has(text)) {
      return text === "magnitude";
    }
  }
  return false;
}

function isTypeReference(
  tokens: RawToken[],
  index: number,
  config: PreparedHighlightConfig,
): boolean {
  const previous = tokens[index - 1]?.text;
  if (isCallableReceiverType(tokens, index)) return true;
  if (
    previous === ":" ||
    previous === "to" ||
    previous === "over" ||
    previous === "is" ||
    (previous === "not" && tokens[index - 2]?.text === "is")
  ) return true;
  if (previous === "->") return true;
  if (previous === "|" && isTypeUnionPosition(tokens, index)) return true;
  if (isMagnitudeDimensionReference(tokens, index, config)) return true;

  if (previous !== ":=") return false;
  const declarationName = tokens[index - 2];
  const declarationHead = tokens[index - 3]?.text;
  return (
    declarationName?.categoryId === "word" &&
    (declarationHead === "alias" || declarationHead === "magnitude")
  );
}

function isCallableReceiverType(tokens: RawToken[], index: number): boolean {
  let opening = index - 1;
  while (
    opening >= 0 &&
    tokens[opening]?.text !== "(" &&
    tokens[opening]?.text !== "{" &&
    tokens[opening]?.text !== ";" &&
    tokens[opening]?.text !== "="
  ) {
    opening -= 1;
  }
  if (tokens[opening]?.text !== "(") return false;
  for (let cursor = opening + 1; cursor < index; cursor += 1) {
    const token = tokens[cursor];
    if (token?.categoryId !== "word" && token?.text !== "," && token?.text !== "|") {
      return false;
    }
  }
  let depth = 0;
  let closing = -1;
  for (let cursor = opening; cursor < tokens.length; cursor += 1) {
    const text = tokens[cursor]?.text;
    if (text === "(") depth += 1;
    if (text === ")") {
      depth -= 1;
      if (depth === 0) {
        closing = cursor;
        break;
      }
    }
  }
  if (closing < 0) return false;
  return (
    tokens[closing + 1]?.text === "." &&
    tokens[closing + 2]?.categoryId === "word" &&
    tokens[closing + 3]?.text === "("
  );
}

function isTypeUnionPosition(tokens: RawToken[], index: number): boolean {
  for (let cursor = index - 2; cursor >= 0; cursor -= 1) {
    const text = tokens[cursor]?.text;
    if (text === ":") return true;
    if (text === ":=") {
      return tokens[cursor - 2]?.text === "alias";
    }
    if (text === "=" || text === "{" || text === "}" || text === ";") {
      return false;
    }
  }
  return false;
}

function parseUnitFactor(tokens: RawToken[], start: number): number | undefined {
  const token = tokens[start];
  if (token?.categoryId === "word") {
    let cursor = start + 1;
    while (
      tokens[cursor]?.text === "." &&
      tokens[cursor + 1]?.categoryId === "word"
    ) {
      cursor += 2;
    }
    return cursor;
  }
  if (token?.text !== "(") return undefined;
  const end = parseUnitExpression(tokens, start + 1);
  if (end === undefined || tokens[end]?.text !== ")") return undefined;
  return end + 1;
}

function parseUnitExpression(
  tokens: RawToken[],
  start: number,
): number | undefined {
  let cursor = parseUnitFactor(tokens, start);
  if (cursor === undefined) return undefined;
  while (tokens[cursor]?.text === "*" || tokens[cursor]?.text === "/") {
    const next = parseUnitFactor(tokens, cursor + 1);
    if (next === undefined) break;
    cursor = next;
  }
  return cursor;
}

function markUnitRange(
  tokens: RawToken[],
  from: number,
  to: number,
  result: Set<number>,
): void {
  for (let index = from; index < to; index += 1) {
    const token = tokens[index];
    if (
      token?.categoryId === "word" ||
      token?.text === "." ||
      token?.text === "*" ||
      token?.text === "/"
    ) {
      result.add(index);
    }
  }
}

function beginsOnSameLine(
  source: string,
  anchor: RawToken,
  firstUnitToken: RawToken | undefined,
): boolean {
  return (
    firstUnitToken !== undefined &&
    !/[\r\n]/.test(source.slice(anchor.to, firstUnitToken.from))
  );
}

function unitTokenIndices(
  source: string,
  tokens: RawToken[],
): ReadonlySet<number> {
  const result = new Set<number>();
  tokens.forEach((token, index) => {
    if (
      token.categoryId === "exact-number" ||
      token.categoryId === "rumber" ||
      token.categoryId === "point-literal"
    ) {
      const start = index + 1;
      if (!beginsOnSameLine(source, token, tokens[start])) return;
      const end = parseUnitExpression(tokens, start);
      if (end !== undefined) markUnitRange(tokens, start, end, result);
      return;
    }

    if (token.text === "in") {
      const start = index + 1;
      if (!beginsOnSameLine(source, token, tokens[start])) return;
      const end = parseUnitExpression(tokens, start);
      if (end === undefined) return;
      const isCompound = tokens
        .slice(start, end)
        .some((part) => part.text === "*" || part.text === "/");
      if (isCompound) markUnitRange(tokens, start, end, result);
    }
  });
  return result;
}

export function tokenizeMud(
  source: string,
  config: MudHighlightConfig = DEFAULT_HIGHLIGHT_CONFIG,
): MudToken[] {
  const prepared = preparedConfig(config);
  const raw = scanRaw(source, prepared);
  const units = unitTokenIndices(source, raw);
  const result: MudToken[] = [];

  raw.forEach((token, index) => {
    const categoryId =
      units.has(index)
        ? "unit"
        : token.categoryId === "word"
        ? classifyWord(source, raw, index, prepared)
        : token.categoryId === "character"
          ? undefined
          : token.categoryId;
    if (categoryId !== undefined) {
      result.push({
        from: token.from,
        to: token.to,
        text: token.text,
        categoryId,
      });
    }
  });

  return result;
}

export function tokenizeGrammar(
  source: string,
  config: MudHighlightConfig,
): SyntaxToken[] {
  const prepared = preparedConfig(config);
  const raw = scanRaw(source, prepared);
  const result: SyntaxToken[] = [];
  raw.forEach((token, index) => {
    const categoryId =
      token.categoryId === "word"
        ? prepared.words.get(token.text) ??
          (contextualKeyword(raw, index, prepared)
            ? prepared.categories.contextual
            : prepared.declarationHeads.has(raw[index - 1]?.text ?? "")
              ? prepared.categories["declaration-name"]
              : raw[index + 1]?.text === "("
                ? "invocation"
                : undefined)
        : token.categoryId === "text"
          ? "string"
          : token.categoryId === "character"
            ? "character"
            : token.categoryId === "exact-number" ||
                token.categoryId === "rumber" ||
                token.categoryId === "point-literal"
              ? "number"
              : token.categoryId;
    if (categoryId !== undefined) {
      result.push({
        from: token.from,
        to: token.to,
        text: token.text,
        categoryId,
      });
    }
  });
  return result;
}

function safeId(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, "-");
}

export function tokenClass(categoryId: string): string {
  return `syntax-token-${safeId(categoryId)}`;
}

export function tokenColorClass(
  languageId: string,
  categoryId: string,
): string {
  return `syntax-color-${safeId(languageId)}-${safeId(categoryId)}`;
}

export function sourceLineStart(source: string, offset: number): number {
  return lineStart(source, offset);
}
