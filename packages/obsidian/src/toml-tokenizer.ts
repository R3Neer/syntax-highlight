import type { SyntaxToken } from "./tokenizer";

type Context = "array" | "inline-table";

const DATE_TIME = /^(?:\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})?)?|\d{2}:\d{2}:\d{2}(?:\.\d+)?)/;
const NUMBER = /^[+-]?(?:inf|nan|0x[0-9A-Fa-f](?:_?[0-9A-Fa-f])*|0o[0-7](?:_?[0-7])*|0b[01](?:_?[01])*|\d(?:_?\d)*(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d(?:_?\d)*)?)/;
const BARE_KEY = /^[A-Za-z0-9_-]+/;

function add(
  result: SyntaxToken[],
  source: string,
  from: number,
  to: number,
  categoryId: string,
): void {
  result.push({ from, to, categoryId, text: source.slice(from, to) });
}

function quotedEnd(source: string, from: number): number {
  const triple = source.startsWith(source[from]?.repeat(3) ?? "", from);
  const delimiter = triple ? source.slice(from, from + 3) : source[from] ?? "";
  const escaped = delimiter[0] === '"';
  let cursor = from + delimiter.length;
  while (cursor < source.length) {
    if (escaped && source[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (source.startsWith(delimiter, cursor)) return cursor + delimiter.length;
    if (!triple && (source[cursor] === "\n" || source[cursor] === "\r")) {
      return cursor;
    }
    cursor += 1;
  }
  return source.length;
}

function tableHeaderEnd(source: string, from: number): number {
  const width = source.startsWith("[[", from) ? 2 : 1;
  const closing = "]".repeat(width);
  let cursor = from + width;
  let quote = "";
  while (cursor < source.length) {
    const character = source[cursor] ?? "";
    if (!quote && (character === '"' || character === "'")) {
      quote = character;
      cursor += 1;
      continue;
    }
    if (quote) {
      if (quote === '"' && character === "\\") {
        cursor += 2;
        continue;
      }
      if (character === quote) quote = "";
      cursor += 1;
      continue;
    }
    if (source.startsWith(closing, cursor)) return cursor + width;
    if (character === "\n" || character === "\r") return cursor;
    cursor += 1;
  }
  return source.length;
}

function valueMatch(pattern: RegExp, source: string, from: number): string | undefined {
  return pattern.exec(source.slice(from))?.[0];
}

export function tokenizeToml(source: string): SyntaxToken[] {
  const result: SyntaxToken[] = [];
  const contexts: Context[] = [];
  let cursor = 0;
  let atLineStart = true;
  let keyPosition = true;

  while (cursor < source.length) {
    const character = source[cursor] ?? "";
    if (character === "\n" || character === "\r") {
      if (character === "\r" && source[cursor + 1] === "\n") cursor += 1;
      cursor += 1;
      atLineStart = true;
      if (contexts.length === 0) keyPosition = true;
      continue;
    }
    if (character === " " || character === "\t") {
      cursor += 1;
      continue;
    }
    if (atLineStart && contexts.length === 0 && character === "[") {
      const end = tableHeaderEnd(source, cursor);
      add(result, source, cursor, end, "table-header");
      cursor = end;
      atLineStart = false;
      keyPosition = false;
      continue;
    }
    atLineStart = false;
    if (character === "#") {
      const lf = source.indexOf("\n", cursor + 1);
      const cr = source.indexOf("\r", cursor + 1);
      const ends = [lf, cr].filter((offset) => offset >= 0);
      const end = ends.length === 0 ? source.length : Math.min(...ends);
      add(result, source, cursor, end, "comment");
      cursor = end;
      continue;
    }
    if (character === '"' || character === "'") {
      const end = quotedEnd(source, cursor);
      add(result, source, cursor, end, keyPosition ? "quoted-key" : "string");
      cursor = end;
      continue;
    }
    if (keyPosition) {
      const key = valueMatch(BARE_KEY, source, cursor);
      if (key !== undefined) {
        add(result, source, cursor, cursor + key.length, "bare-key");
        cursor += key.length;
        continue;
      }
    } else {
      const dateTime = valueMatch(DATE_TIME, source, cursor);
      if (dateTime !== undefined) {
        add(result, source, cursor, cursor + dateTime.length, "date-time");
        cursor += dateTime.length;
        continue;
      }
      const boolean = /^(?:true|false)(?![A-Za-z0-9_-])/.exec(
        source.slice(cursor),
      )?.[0];
      if (boolean !== undefined) {
        add(result, source, cursor, cursor + boolean.length, "boolean");
        cursor += boolean.length;
        continue;
      }
      const number = valueMatch(NUMBER, source, cursor);
      if (number !== undefined) {
        add(result, source, cursor, cursor + number.length, "number");
        cursor += number.length;
        continue;
      }
    }
    if (character === "=") {
      add(result, source, cursor, cursor + 1, "assignment");
      keyPosition = false;
      cursor += 1;
      continue;
    }
    if (character === "{") {
      add(result, source, cursor, cursor + 1, "delimiter");
      contexts.push("inline-table");
      keyPosition = true;
      cursor += 1;
      continue;
    }
    if (character === "[") {
      add(result, source, cursor, cursor + 1, "delimiter");
      contexts.push("array");
      keyPosition = false;
      cursor += 1;
      continue;
    }
    if (character === "}" || character === "]") {
      add(result, source, cursor, cursor + 1, "delimiter");
      contexts.pop();
      keyPosition = false;
      cursor += 1;
      continue;
    }
    if (character === "," || character === ".") {
      add(result, source, cursor, cursor + 1, "separator");
      if (character === ",") {
        keyPosition = contexts.at(-1) === "inline-table";
      }
      cursor += 1;
      continue;
    }
    cursor += 1;
  }
  return result;
}
