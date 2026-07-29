import type { SyntaxToken, SyntaxTokenKind } from "./tokenizer";

const KEYWORDS = new Set(["module", "attributes"]);
const BUILTINS = new Set([
  "identifier",
  "int",
  "string",
  "constant",
  "object",
  "singleton",
]);

function add(
  result: SyntaxToken[],
  source: string,
  from: number,
  to: number,
  kind: SyntaxTokenKind,
): void {
  result.push({ from, to, kind, text: source.slice(from, to) });
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

export function tokenizeAsdl(source: string): SyntaxToken[] {
  const result: SyntaxToken[] = [];
  let cursor = 0;
  let expectModuleName = false;

  while (cursor < source.length) {
    const character = source[cursor] ?? "";
    if (/\s/.test(character)) {
      cursor += 1;
      continue;
    }
    if (source.startsWith("--", cursor)) {
      const lineEnd = source.indexOf("\n", cursor + 2);
      const to = lineEnd < 0 ? source.length : lineEnd;
      add(result, source, cursor, to, "comment");
      cursor = to;
      continue;
    }
    if (character === '"') {
      const to = quotedEnd(source, cursor);
      add(result, source, cursor, to, "string");
      cursor = to;
      continue;
    }
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(
      source.slice(cursor),
    )?.[0];
    if (identifier !== undefined) {
      const to = cursor + identifier.length;
      const tail = source.slice(to);
      let kind: SyntaxTokenKind;
      if (KEYWORDS.has(identifier)) {
        kind = "keyword";
        expectModuleName = identifier === "module";
      } else if (expectModuleName) {
        kind = "declaration";
        expectModuleName = false;
      } else if (BUILTINS.has(identifier)) {
        kind = "builtin";
      } else if (/^\s*=/.test(tail)) {
        kind = "definition";
      } else if (/^[A-Z]/.test(identifier)) {
        kind = "declaration";
      } else {
        kind = "reference";
      }
      add(result, source, cursor, to, kind);
      cursor = to;
      continue;
    }
    const number = /^\d+/.exec(source.slice(cursor))?.[0];
    if (number !== undefined) {
      add(result, source, cursor, cursor + number.length, "number");
      cursor += number.length;
      continue;
    }
    if ("{}()[]".includes(character)) {
      add(result, source, cursor, cursor + 1, "bracket");
    } else if ("=|?*+".includes(character)) {
      add(result, source, cursor, cursor + 1, "operator");
    } else if (",;".includes(character)) {
      add(result, source, cursor, cursor + 1, "punctuation");
    }
    cursor += 1;
  }
  return result;
}
