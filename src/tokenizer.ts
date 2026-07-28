export type MudTokenKind =
  | "comment"
  | "keyword"
  | "builtin"
  | "constant"
  | "declaration"
  | "property"
  | "function"
  | "string"
  | "character"
  | "number"
  | "operator"
  | "punctuation";

export interface MudToken {
  from: number;
  to: number;
  kind: MudTokenKind;
  text: string;
}

interface RawToken {
  from: number;
  to: number;
  kind: MudTokenKind | "word";
  text: string;
}

const HARD_KEYWORDS = new Set([
  "using",
  "thing",
  "as",
  "alias",
  "family",
  "magnitude",
  "rule",
  "action",
  "look",
  "message",
  "test",
  "for",
  "on",
  "given",
  "when",
  "changes",
  "if",
  "then",
  "after",
  "with",
  "otherwise",
  "mut",
  "unique",
  "ordered",
  "create",
  "destroy",
  "add",
  "remove",
  "from",
  "each",
  "by",
  "through",
  "exists",
  "forall",
  "count",
  "sum",
  "min",
  "max",
]);

const WORD_OPERATORS = new Set([
  "to",
  "eventually",
  "allowed",
  "old",
  "is",
  "in",
  "not",
  "and",
  "or",
  "xor",
  "implies",
  "iff",
  "intersection",
  "union",
  "except",
]);

const BUILTINS = new Set([
  "Text",
  "Character",
  "Bool",
  "Natural",
  "Integer",
  "Number",
  "Rumber",
  "Money",
  "Rand",
]);

const CONSTANTS = new Set(["true", "false", "empty"]);
const DECLARATION_HEADS = new Set([
  "thing",
  "alias",
  "family",
  "magnitude",
  "rule",
  "action",
  "look",
  "message",
  "test",
]);
const MULTI_OPERATORS = [
  "<=>",
  ":=",
  "->",
  "..",
  "==",
  "!=",
  "<=",
  ">=",
  "=>",
  "+=",
  "-=",
  "*=",
  "/=",
];
const OPERATOR_CHARACTERS = new Set([
  "=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "<",
  ">",
  "!",
  "&",
  "|",
  "^",
]);
const PUNCTUATION = new Set(["{", "}", "(", ")", "[", "]", ",", ".", ":", ";"]);

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

function scanRaw(source: string): RawToken[] {
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

    const multiOperator = MULTI_OPERATORS.find((operator) =>
      source.startsWith(operator, cursor),
    );
    if (multiOperator !== undefined) {
      addRaw(tokens, source, cursor, cursor + multiOperator.length, "operator");
      cursor += multiOperator.length;
      continue;
    }

    if (OPERATOR_CHARACTERS.has(character)) {
      addRaw(tokens, source, cursor, cursor + 1, "operator");
      cursor += 1;
      continue;
    }

    if (PUNCTUATION.has(character)) {
      addRaw(tokens, source, cursor, cursor + 1, "punctuation");
      cursor += 1;
      continue;
    }

    cursor += 1;
  }

  return tokens;
}

function contextualKeyword(tokens: RawToken[], index: number): boolean {
  const token = tokens[index];
  if (token === undefined) return false;
  const previous = tokens[index - 1]?.text;
  const next = tokens[index + 1]?.text;

  switch (token.text) {
    case "abstract":
      return next === "thing";
    case "always":
      return next === "rule";
    case "start":
      return next === "with";
    case "point":
      return next === "over";
    case "over":
      return previous === "point";
    case "root":
      return next === "unit";
    case "unit":
      return previous === "root" || next === ":=";
    case "cycle":
      return next === ")";
    default:
      return false;
  }
}

function classifyWord(tokens: RawToken[], index: number): MudTokenKind | undefined {
  const token = tokens[index];
  if (token === undefined || token.kind !== "word") return undefined;
  if (BUILTINS.has(token.text)) return "builtin";
  if (CONSTANTS.has(token.text)) return "constant";
  if (WORD_OPERATORS.has(token.text)) return "operator";
  if (HARD_KEYWORDS.has(token.text) || contextualKeyword(tokens, index)) {
    return "keyword";
  }

  const previous = tokens[index - 1];
  const next = tokens[index + 1];
  if (previous !== undefined && DECLARATION_HEADS.has(previous.text)) {
    return "declaration";
  }
  if (next?.text === ":") return "property";
  if (next?.text === "(") return "function";
  return undefined;
}

export function tokenizeMud(source: string): MudToken[] {
  const raw = scanRaw(source);
  const result: MudToken[] = [];

  raw.forEach((token, index) => {
    const kind = token.kind === "word" ? classifyWord(raw, index) : token.kind;
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
