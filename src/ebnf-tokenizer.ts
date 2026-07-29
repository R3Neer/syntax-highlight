import type { SyntaxToken, SyntaxTokenKind } from "./tokenizer";

const IDENTIFIER_START = /[A-Za-z]/;
const IDENTIFIER_PART = /[A-Za-z0-9-]/;
const DIGIT = /[0-9]/;
const UPPER_TERMINAL = /^[A-Z][A-Z0-9_]*$/;
const OPERATORS = [
  "<=>",
  "::=",
  ":=",
  "->",
  "..",
  "=>",
  "==",
  "!=",
  "<=",
  ">=",
  "+=",
  "-=",
  "*=",
  "/=",
  "|",
  ",",
  ";",
  "=",
];

function isDefinition(text: string, start: number, end: number): boolean {
  let after = end;
  while (text[after] === " " || text[after] === "\t") after += 1;
  if (text.startsWith("::=", after)) return true;
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const startsLine = text.slice(lineStart, start).trim() === "";
  const endsLine =
    after === text.length || text[after] === "\r" || text[after] === "\n";
  return startsLine && endsLine;
}

function token(
  source: string,
  kind: SyntaxTokenKind,
  from: number,
  to: number,
): SyntaxToken {
  return { kind, from, to, text: source.slice(from, to) };
}

export function tokenizeEbnf(source: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let position = 0;
  while (position < source.length) {
    const start = position;
    if (source.startsWith("(*", position)) {
      const closing = source.indexOf("*)", position + 2);
      position = closing < 0 ? source.length : closing + 2;
      tokens.push(token(source, "comment", start, position));
      continue;
    }
    if (source[position] === '"') {
      position += 1;
      let escaped = false;
      while (position < source.length) {
        const character = source[position];
        position += 1;
        if (character === '"' && !escaped) break;
        escaped = character === "\\" && !escaped;
        if (character !== "\\") escaped = false;
      }
      tokens.push(token(source, "string", start, position));
      continue;
    }
    if (source[position] === "?") {
      const closing = source.indexOf("?", position + 1);
      position = closing < 0 ? source.length : closing + 1;
      tokens.push(token(source, "meta", start, position));
      continue;
    }
    if (IDENTIFIER_START.test(source[position] ?? "")) {
      position += 1;
      while (
        position < source.length &&
        IDENTIFIER_PART.test(source[position] ?? "")
      ) {
        position += 1;
      }
      const value = source.slice(start, position);
      const kind: SyntaxTokenKind = isDefinition(
        source,
        start,
        position,
      )
        ? "definition"
        : UPPER_TERMINAL.test(value)
          ? "terminal"
          : "reference";
      tokens.push(token(source, kind, start, position));
      continue;
    }
    if (DIGIT.test(source[position] ?? "")) {
      position += 1;
      while (position < source.length && DIGIT.test(source[position] ?? "")) {
        position += 1;
      }
      tokens.push(token(source, "number", start, position));
      continue;
    }
    const operator = OPERATORS.find((candidate) =>
      source.startsWith(candidate, position),
    );
    if (operator !== undefined) {
      position += operator.length;
      tokens.push(token(source, "operator", start, position));
      continue;
    }
    if ("()[]{}".includes(source[position] ?? "")) {
      position += 1;
      tokens.push(token(source, "bracket", start, position));
      continue;
    }
    position += 1;
  }
  return tokens;
}
