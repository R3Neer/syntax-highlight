import type { SyntaxToken } from "./tokenizer";

const KEYWORDS = new Set(["module", "attributes"]);
const BUILTINS = new Set([
  "identifier",
  "int",
  "string",
  "constant",
  "object",
  "singleton",
]);

interface RawToken {
  from: number;
  to: number;
  text: string;
  rawKind: "word" | "comment" | "string" | "number" | "symbol";
}

function quotedEnd(source: string, from: number): number {
  let cursor = from + 1;
  while (cursor < source.length) {
    if (source[cursor] === "\\") cursor += 2;
    else if (source[cursor] === '"') return cursor + 1;
    else cursor += 1;
  }
  return cursor;
}

function scan(source: string): RawToken[] {
  const result: RawToken[] = [];
  let cursor = 0;
  const add = (from: number, to: number, rawKind: RawToken["rawKind"]): void => {
    result.push({ from, to, rawKind, text: source.slice(from, to) });
  };
  while (cursor < source.length) {
    const character = source[cursor] ?? "";
    if (/\s/.test(character)) {
      cursor += 1;
      continue;
    }
    if (source.startsWith("--", cursor)) {
      const lineEnd = source.indexOf("\n", cursor + 2);
      const to = lineEnd < 0 ? source.length : lineEnd;
      add(cursor, to, "comment");
      cursor = to;
      continue;
    }
    if (character === '"') {
      const to = quotedEnd(source, cursor);
      add(cursor, to, "string");
      cursor = to;
      continue;
    }
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(cursor))?.[0];
    if (identifier !== undefined) {
      add(cursor, cursor + identifier.length, "word");
      cursor += identifier.length;
      continue;
    }
    const number = /^\d+/.exec(source.slice(cursor))?.[0];
    if (number !== undefined) {
      add(cursor, cursor + number.length, "number");
      cursor += number.length;
      continue;
    }
    if ("{}()[]=|?*+,;".includes(character)) add(cursor, cursor + 1, "symbol");
    cursor += 1;
  }
  return result;
}

function wordCategory(tokens: readonly RawToken[], index: number): string {
  const token = tokens[index];
  const previous = tokens[index - 1];
  const next = tokens[index + 1];
  if (token === undefined) return "type-reference";
  if (KEYWORDS.has(token.text)) return "asdl-keyword";
  if (previous?.text === "module") return "module-name";
  if (next?.text === "=") return "defined-type";
  if (/^[A-Z]/.test(token.text)) return "constructor";
  if (BUILTINS.has(token.text)) return "builtin-type";
  if (
    previous?.rawKind === "word" &&
    previous.text !== "attributes" &&
    (next?.text === "," || next?.text === ")" || next?.text === ";")
  ) {
    return "field-name";
  }
  return "type-reference";
}

function symbolCategory(text: string): string {
  if (text === "=") return "assignment";
  if (text === "|") return "alternative";
  if ("?*+".includes(text)) return "cardinality";
  if ("{}()[]".includes(text)) return "delimiter";
  return "separator";
}

export function tokenizeAsdl(source: string): SyntaxToken[] {
  const tokens = scan(source);
  return tokens.map((token, index) => ({
    from: token.from,
    to: token.to,
    text: token.text,
    categoryId:
      token.rawKind === "word"
        ? wordCategory(tokens, index)
        : token.rawKind === "symbol"
          ? symbolCategory(token.text)
          : token.rawKind,
  }));
}
