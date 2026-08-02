import {
  insertNewlineAndIndent,
  toggleComment,
} from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import {
  EditorSelection,
  EditorState,
  Prec,
  type Extension,
  type SelectionRange,
} from "@codemirror/state";
import { EditorView, keymap, type Command } from "@codemirror/view";

import type { SyntaxPluginSettings } from "./settings";
import { tokenizeMud } from "./tokenizer";

export interface EditingContext {
  from: number;
  to: number;
  languageId: string;
  nativeIndentation?: boolean;
}

export type EditingContextResolver = (
  state: EditorState,
  position: number,
) => EditingContext | undefined;

interface EditProposal {
  from: number;
  to: number;
  insert: string;
  selectionFrom: number;
  selectionTo: number;
}

const PAIRS: Readonly<Record<string, string>> = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
};

const CLOSERS = new Set(Object.values(PAIRS));

const MUD_OPERATOR_CHARACTERS = new Set(":=<>!+-*/%&|^.");

const MUD_OPERATORS = new Set([
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
  "=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "<",
  ">",
  "&",
  "|",
  "^",
]);

const PREFIX_EXPRESSION_WORDS = new Set([
  "add",
  "after",
  "allowed",
  "and",
  "by",
  "destroy",
  "eventually",
  "for",
  "from",
  "given",
  "if",
  "in",
  "is",
  "not",
  "old",
  "on",
  "or",
  "otherwise",
  "remove",
  "then",
  "through",
  "to",
  "when",
  "with",
  "xor",
]);

const PARENTHESIZED_KEYWORDS = new Set([
  "after",
  "for",
  "given",
  "if",
  "otherwise",
  "then",
  "when",
  "with",
]);

const SPACING_SYMBOLS = [
  ...MUD_OPERATORS,
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  ",",
  ":",
  ";",
  ".",
].sort((left, right) => right.length - left.length);

type SpacingTokenKind =
  | "atom"
  | "comment"
  | "operator"
  | "punctuation"
  | "unknown";

interface SpacingToken {
  from: number;
  to: number;
  text: string;
  kind: SpacingTokenKind;
}

type MudLexicalMode =
  | "code"
  | "line-comment"
  | "text"
  | "character"
  | "multiline-text"
  | "multiline-comment";

function unit(settings: SyntaxPluginSettings): string {
  return settings.indentStyle === "tabs"
    ? "\t"
    : " ".repeat(settings.indentSize);
}

function lineIndent(state: EditorState, position: number): string {
  return /^[\t ]*/.exec(state.doc.lineAt(position).text)?.[0] ?? "";
}

function lineBounds(source: string, position: number): { from: number; to: number } {
  let from = position;
  let to = position;
  while (from > 0 && source[from - 1] !== "\n" && source[from - 1] !== "\r") from -= 1;
  while (to < source.length && source[to] !== "\n" && source[to] !== "\r") to += 1;
  return { from, to };
}

function previousLine(source: string, from: number): { from: number; to: number } | undefined {
  if (from === 0) return undefined;
  let end = from - 1;
  if (source[end] === "\n" && source[end - 1] === "\r") end -= 1;
  let start = end;
  while (start > 0 && source[start - 1] !== "\n" && source[start - 1] !== "\r") start -= 1;
  return { from: start, to: end };
}

function nextLine(source: string, to: number): { from: number; to: number } | undefined {
  if (to >= source.length) return undefined;
  let start = to + 1;
  if (source[to] === "\r" && source[to + 1] === "\n") start += 1;
  let end = start;
  while (end < source.length && source[end] !== "\n" && source[end] !== "\r") end += 1;
  return { from: start, to: end };
}

function delimiterOpensMultiline(
  source: string,
  position: number,
  delimiter: string,
  contextTo: number,
): boolean {
  if (!source.startsWith(delimiter, position)) return false;
  const bounds = lineBounds(source, position);
  return /^[\t ]*$/.test(
    source.slice(position + delimiter.length, Math.min(bounds.to, contextTo)),
  );
}

function delimiterClosesMultiline(
  source: string,
  position: number,
  delimiter: string,
  contextFrom: number,
  contextTo: number,
): boolean {
  if (!source.startsWith(delimiter, position)) return false;
  const bounds = lineBounds(source, position);
  return (
    source
      .slice(Math.max(bounds.from, contextFrom), Math.min(bounds.to, contextTo))
      .trim() === delimiter
  );
}

function isMudCodePosition(
  source: string,
  position: number,
  context: EditingContext,
): boolean {
  let mode: MudLexicalMode = "code";
  let cursor = context.from;

  while (cursor < position && cursor < context.to) {
    const character = source[cursor] ?? "";

    if (mode === "code") {
      if (delimiterOpensMultiline(source, cursor, '"""', context.to)) {
        mode = "multiline-text";
        cursor += 3;
        continue;
      }
      if (delimiterOpensMultiline(source, cursor, "###", context.to)) {
        mode = "multiline-comment";
        cursor += 3;
        continue;
      }
      if (character === "#") {
        mode = "line-comment";
        cursor += 1;
        continue;
      }
      if (character === '"') {
        mode = "text";
        cursor += 1;
        continue;
      }
      if (character === "'") {
        mode = "character";
        cursor += 1;
        continue;
      }
      cursor += 1;
      continue;
    }

    if (mode === "line-comment") {
      if (character === "\n" || character === "\r") {
        mode = "code";
      } else if (character === "#") {
        mode = "code";
      }
      cursor += 1;
      continue;
    }

    if (mode === "text" || mode === "character") {
      const delimiter = mode === "text" ? '"' : "'";
      if (character === "\\") {
        cursor += 2;
      } else {
        if (character === delimiter || character === "\n" || character === "\r") {
          mode = "code";
        }
        cursor += 1;
      }
      continue;
    }

    const delimiter = mode === "multiline-text" ? '"""' : "###";
    if (
      delimiterClosesMultiline(
        source,
        cursor,
        delimiter,
        context.from,
        context.to,
      )
    ) {
      mode = "code";
      cursor += delimiter.length;
    } else {
      cursor += 1;
    }
  }

  return mode === "code";
}

function previousNonHorizontalSpace(
  source: string,
  position: number,
  lineFrom: number,
): number {
  let cursor = position;
  while (cursor > lineFrom && /[\t ]/.test(source[cursor - 1] ?? "")) cursor -= 1;
  return cursor - 1;
}

function nextNonHorizontalSpace(
  source: string,
  position: number,
  lineTo: number,
): number {
  let cursor = position;
  while (cursor < lineTo && /[\t ]/.test(source[cursor] ?? "")) cursor += 1;
  return cursor;
}

function horizontalSpaceStart(
  source: string,
  position: number,
  lineFrom: number,
): number {
  const previous = previousNonHorizontalSpace(source, position, lineFrom);
  return previous >= lineFrom ? previous + 1 : position;
}

function previousWord(source: string, position: number, lineFrom: number): string {
  let cursor = position;
  while (cursor > lineFrom && /[A-Za-z0-9]/.test(source[cursor - 1] ?? "")) {
    cursor -= 1;
  }
  return source.slice(cursor, position);
}

function expectsPrefixExpression(
  source: string,
  position: number,
  lineFrom: number,
): boolean {
  const previous = previousNonHorizontalSpace(source, position, lineFrom);
  if (previous < lineFrom) return true;
  const character = source[previous] ?? "";
  if ("([{,:;".includes(character) || MUD_OPERATOR_CHARACTERS.has(character)) {
    return true;
  }
  if (!/[A-Za-z0-9]/.test(character)) return false;
  return PREFIX_EXPRESSION_WORDS.has(previousWord(source, previous + 1, lineFrom));
}

function numericTokenBefore(
  source: string,
  position: number,
  lineFrom: number,
): boolean {
  let cursor = position;
  while (cursor > lineFrom && /[A-Za-z0-9_.]/.test(source[cursor - 1] ?? "")) {
    cursor -= 1;
  }
  return /^(?:r)?\d(?:[\d_]*\d)?$/.test(source.slice(cursor, position));
}

function operatorPrefix(
  source: string,
  position: number,
  lineFrom: number,
): { from: number; text: string } {
  const end = previousNonHorizontalSpace(source, position, lineFrom) + 1;
  let from = end;
  while (
    from > lineFrom &&
    end - from < 3 &&
    MUD_OPERATOR_CHARACTERS.has(source[from - 1] ?? "")
  ) {
    from -= 1;
  }
  return { from, text: source.slice(from, end) };
}

function logicalBounds(
  source: string,
  position: number,
  context: EditingContext,
): { from: number; to: number } {
  let current = lineBounds(source, position);
  current = {
    from: Math.max(current.from, context.from),
    to: Math.min(current.to, context.to),
  };
  let from = current.from;
  let to = current.to;

  while (from > context.from) {
    const previous = previousLine(source, from);
    if (previous === undefined || previous.to < context.from) break;
    const text = source.slice(previous.from, previous.to).trimEnd();
    if (!/(?:,|\.\.|[=+\-*/%&|^])$/.test(text)) break;
    from = Math.max(previous.from, context.from);
  }
  while (to < context.to) {
    const text = source.slice(from, to).trimEnd();
    if (!/(?:,|\.\.|[=+\-*/%&|^])$/.test(text)) break;
    const following = nextLine(source, to);
    if (following === undefined || following.from > context.to) break;
    to = Math.min(following.to, context.to);
  }
  return { from, to };
}

function spacingNumber(source: string, offset: number): string | undefined {
  return /^(?:\d(?:[\d_]*\d)?(?::\d(?:[\d_]*\d)?)+|(?:r)?(?:\d(?:[\d_]*\d)?(?:\.\d(?:[\d_]*\d)?)?|\.\d(?:[\d_]*\d)?)(?:[eE][+-]?\d(?:[\d_]*\d)?)?)/.exec(
    source.slice(offset),
  )?.[0];
}

function scanSpacingTokens(source: string): SpacingToken[] {
  const result: SpacingToken[] = [];
  let cursor = 0;
  const push = (to: number, kind: SpacingTokenKind): void => {
    result.push({
      from: cursor,
      to,
      text: source.slice(cursor, to),
      kind,
    });
    cursor = to;
  };

  while (cursor < source.length) {
    const character = source[cursor] ?? "";
    if (/[\t ]/.test(character)) {
      cursor += 1;
      continue;
    }
    if (source.startsWith('"""', cursor) || source.startsWith("###", cursor)) {
      const delimiter = source.startsWith('"""', cursor) ? '"""' : "###";
      const close = source.indexOf(delimiter, cursor + delimiter.length);
      push(close < 0 ? source.length : close + delimiter.length, delimiter === "###" ? "comment" : "atom");
      continue;
    }
    if (character === "#") {
      const close = source.indexOf("#", cursor + 1);
      push(close < 0 ? source.length : close + 1, "comment");
      continue;
    }
    if (character === '"' || character === "'") {
      const quote = character;
      let end = cursor + 1;
      while (end < source.length) {
        if (source[end] === "\\") end += 2;
        else if (source[end] === quote) {
          end += 1;
          break;
        } else end += 1;
      }
      push(Math.min(end, source.length), "atom");
      continue;
    }
    const number = spacingNumber(source, cursor);
    if (number !== undefined) {
      push(cursor + number.length, "atom");
      continue;
    }
    const identifier = /^[A-Za-z][A-Za-z0-9]*/.exec(source.slice(cursor))?.[0];
    if (identifier !== undefined) {
      push(cursor + identifier.length, "atom");
      continue;
    }
    const symbol = SPACING_SYMBOLS.find((candidate) =>
      source.startsWith(candidate, cursor),
    );
    if (symbol !== undefined) {
      push(
        cursor + symbol.length,
        MUD_OPERATORS.has(symbol) ? "operator" : "punctuation",
      );
      continue;
    }
    push(cursor + 1, "unknown");
  }
  return result;
}

function canonicalComment(text: string): string {
  if (
    text.startsWith("###") ||
    text === "#" ||
    /^#\s/.test(text) ||
    text.startsWith("##")
  ) {
    return text;
  }
  return `# ${text.slice(1)}`;
}

function unaryOperator(tokens: readonly SpacingToken[], index: number): boolean {
  const token = tokens[index];
  if (token === undefined || !["+", "-", "!"].includes(token.text)) {
    return false;
  }
  const previous = tokens[index - 1];
  return (
    previous === undefined ||
    previous.kind === "operator" ||
    ["(", "[", "{", ",", ":", ";"].includes(previous.text) ||
    PREFIX_EXPRESSION_WORDS.has(previous.text)
  );
}

function unitOperators(source: string): Set<number> {
  return new Set(
    tokenizeMud(source)
      .filter(({ categoryId, text }) =>
        categoryId === "unit" && (text === "*" || text === "/"),
      )
      .map(({ from }) => from),
  );
}

function canonicalSeparator(
  source: string,
  tokens: readonly SpacingToken[],
  index: number,
  compactUnits: ReadonlySet<number>,
): string {
  const left = tokens[index];
  const right = tokens[index + 1];
  if (left === undefined || right === undefined) return "";
  const original = source.slice(left.to, right.from);
  if (left.kind === "unknown" || right.kind === "unknown") return original;
  if (right.kind === "comment") return " ";

  if ([",", ":", ";", ")", "]"].includes(right.text)) return "";
  if (right.text === "}") return left.text === "{" ? "" : " ";
  if (["(", "["].includes(left.text)) return "";
  if (left.text === "{") return right.text === "}" ? "" : " ";
  if (
    left.text === ":" &&
    /^\d[\d_]*$/.test(tokens[index - 1]?.text ?? "") &&
    /^\d[\d_]*$/.test(right.text)
  ) {
    return "";
  }
  if ([",", ":", ";"].includes(left.text)) return " ";

  if (left.text === "." || right.text === ".") return "";
  if (left.text === ".." || right.text === "..") return "";

  if (right.text === "(") {
    return left.kind === "operator" || PARENTHESIZED_KEYWORDS.has(left.text)
      ? " "
      : "";
  }
  if (right.text === "[") return left.kind === "operator" ? " " : "";
  if (right.text === "{") return " ";

  const leftUnit = compactUnits.has(left.from);
  const rightUnit = compactUnits.has(right.from);
  if (leftUnit || rightUnit) return "";
  if (left.kind === "operator") {
    return unaryOperator(tokens, index) ? "" : " ";
  }
  if (right.kind === "operator") return " ";
  return " ";
}

export function formatMudHorizontalSpacing(source: string): string {
  const indentation = /^[\t ]*/.exec(source)?.[0] ?? "";
  const body = source.slice(indentation.length).trimEnd();
  if (body === "") return indentation;
  const tokens = scanSpacingTokens(body);
  if (tokens.length === 0) return indentation;
  const compactUnits = unitOperators(body);
  let result = indentation;
  tokens.forEach((token, index) => {
    result += token.kind === "comment" ? canonicalComment(token.text) : token.text;
    result += canonicalSeparator(body, tokens, index, compactUnits);
  });
  return result;
}

interface CandidateAnalysis {
  commas: number;
  intervals: number;
  lastBoundary: number;
  invalid: boolean;
}

function analyzeCandidate(source: string): CandidateAnalysis {
  const stack: string[] = [];
  let commas = 0;
  let intervals = 0;
  let lastBoundary = -1;
  let invalid = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";
    if (character === "#") {
      invalid = true;
      break;
    }
    if (character === '"' || character === "'") {
      const quote = character;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") index += 2;
        else if (source[index] === quote) break;
        else index += 1;
      }
      if (index >= source.length) invalid = true;
      continue;
    }
    const closer = PAIRS[character];
    if (closer !== undefined && character !== '"' && character !== "'") {
      stack.push(closer);
      continue;
    }
    if (CLOSERS.has(character)) {
      if (stack.pop() !== character) {
        invalid = true;
        break;
      }
      continue;
    }
    if (stack.length > 0) continue;
    if (character === ",") commas += 1;
    if (character === "." && source[index + 1] === ".") {
      intervals += 1;
      index += 1;
      continue;
    }
    if (
      character === "=" ||
      character === ":" ||
      character === ";" ||
      character === "{" ||
      character === "}"
    ) {
      lastBoundary = index;
    }
  }
  if (stack.length > 0) invalid = true;
  return { commas, intervals, lastBoundary, invalid };
}

function trimmedRange(
  source: string,
  from: number,
  to: number,
): { from: number; to: number; text: string } | undefined {
  const raw = source.slice(from, to);
  const left = raw.length - raw.trimStart().length;
  const right = raw.trimEnd().length;
  if (right <= left) return undefined;
  return {
    from: from + left,
    to: from + right,
    text: raw.slice(left, right),
  };
}

export function retroactiveWrap(
  source: string,
  position: number,
  typed: string,
  context: EditingContext,
): EditProposal | undefined {
  if (context.languageId !== "mud" || !["[", "(", "]", ")"].includes(typed)) {
    return undefined;
  }
  const logical = logicalBounds(source, position, context);
  const opening = typed === "[" || typed === "(";
  let candidate = trimmedRange(
    source,
    opening ? position : logical.from,
    opening ? logical.to : position,
  );
  if (candidate === undefined) return undefined;

  let analysis = analyzeCandidate(candidate.text);
  if (!opening && analysis.lastBoundary >= 0) {
    candidate = trimmedRange(
      source,
      candidate.from + analysis.lastBoundary + 1,
      candidate.to,
    );
    if (candidate === undefined) return undefined;
    analysis = analyzeCandidate(candidate.text);
  }
  if (analysis.invalid || analysis.lastBoundary >= 0) return undefined;

  const interval = analysis.intervals === 1 && analysis.commas === 0;
  const collection = analysis.intervals === 0 && analysis.commas > 0;
  if (!interval && !collection) return undefined;
  if (collection && (typed === "(" || typed === ")")) return undefined;

  const prefix = opening ? typed : "[";
  const suffix = opening ? "]" : typed;
  const insert = `${prefix}${candidate.text}${suffix}`;
  return {
    from: candidate.from,
    to: candidate.to,
    insert,
    selectionFrom: opening ? 1 : insert.length,
    selectionTo: opening ? 1 : insert.length,
  };
}

function blockDelimiterProposal(
  state: EditorState,
  position: number,
  typed: string,
  context: EditingContext,
  settings: SyntaxPluginSettings,
): EditProposal | undefined {
  if (context.languageId !== "mud") return undefined;
  const delimiter = typed === "#" ? "###" : typed === '"' ? '"""' : undefined;
  if (
    delimiter === undefined ||
    position < 2 ||
    state.sliceDoc(position - 2, position) !== typed.repeat(2)
  ) {
    return undefined;
  }
  const line = state.doc.lineAt(position);
  const before = state.sliceDoc(line.from, position - 2);
  const after = state.sliceDoc(position, line.to);
  if (!/^[\t ]*$/.test(before) || !/^[\t ]*$/.test(after)) return undefined;
  const indentation = before;
  const inner = indentation + unit(settings);
  const insert = `${delimiter}\n${inner}\n${indentation}${delimiter}`;
  return {
    from: position - 2,
    to: position,
    insert,
    selectionFrom: delimiter.length + 1 + inner.length,
    selectionTo: delimiter.length + 1 + inner.length,
  };
}

function braceSpacingProposal(
  state: EditorState,
  range: SelectionRange,
  context: EditingContext,
  autoClose: boolean,
): EditProposal | undefined {
  const source = state.doc.toString();
  if (!isMudCodePosition(source, range.from, context)) return undefined;
  const line = state.doc.lineAt(range.from);
  const previous = source[range.from - 1] ?? "";
  if (
    range.from === line.from ||
    /\s/.test(previous) ||
    "([{.".includes(previous)
  ) {
    return undefined;
  }
  const insert = autoClose ? " {}" : " {";
  return {
    from: range.from,
    to: range.to,
    insert,
    selectionFrom: 2,
    selectionTo: 2,
  };
}

function punctuationSpacingProposal(
  state: EditorState,
  range: SelectionRange,
  typed: string,
  context: EditingContext,
): EditProposal | undefined {
  if (typed !== "," && typed !== ":") return undefined;
  const source = state.doc.toString();
  if (!isMudCodePosition(source, range.from, context)) return undefined;
  const line = state.doc.lineAt(range.from);
  if (
    typed === ":" &&
    numericTokenBefore(source, range.from, line.from)
  ) {
    return undefined;
  }
  const from = horizontalSpaceStart(source, range.from, line.from);
  let to = nextNonHorizontalSpace(source, range.from, line.to);
  let insert = `${typed} `;
  if (typed === ":" && source[to] === "=") {
    to += 1;
    to = nextNonHorizontalSpace(source, to, line.to);
    insert = ":= ";
  }
  return {
    from,
    to,
    insert,
    selectionFrom: insert.length,
    selectionTo: insert.length,
  };
}

function terminatorSpacingProposal(
  state: EditorState,
  range: SelectionRange,
  context: EditingContext,
): EditProposal | undefined {
  const source = state.doc.toString();
  if (!isMudCodePosition(source, range.from, context)) return undefined;
  const line = state.doc.lineAt(range.from);
  const bounds = logicalBounds(source, range.from, context);
  const from = Math.max(bounds.from, line.from);
  const afterSpaces = nextNonHorizontalSpace(source, range.from, line.to);
  const hasFollowingToken = afterSpaces < line.to;
  const insert =
    formatMudHorizontalSpacing(state.sliceDoc(from, range.from) + ";") +
    (hasFollowingToken ? " " : "");
  return {
    from,
    to: afterSpaces,
    insert,
    selectionFrom: insert.length,
    selectionTo: insert.length,
  };
}

function closingSpacingProposal(
  state: EditorState,
  range: SelectionRange,
  typed: string,
  context: EditingContext,
  settings: SyntaxPluginSettings,
): EditProposal | undefined {
  if (!["}", "]", ")"].includes(typed)) return undefined;
  const source = state.doc.toString();
  if (!isMudCodePosition(source, range.from, context)) return undefined;
  const line = state.doc.lineAt(range.from);
  const prefix = state.sliceDoc(line.from, range.from);
  if (/^[\t ]*$/.test(prefix)) return undefined;

  const from = horizontalSpaceStart(source, range.from, line.from);
  const previous = previousNonHorizontalSpace(source, from, line.from);
  const previousCharacter = previous >= line.from ? source[previous] ?? "" : "";
  const leading = typed === "}" && previousCharacter !== "{" ? " " : "";
  const skipsExisting =
    settings.autoClose && state.sliceDoc(range.from, range.from + 1) === typed;
  const insert = leading + (skipsExisting ? "" : typed);
  return {
    from,
    to: range.from,
    insert,
    selectionFrom: insert.length + (skipsExisting ? 1 : 0),
    selectionTo: insert.length + (skipsExisting ? 1 : 0),
  };
}

function operatorSpacingProposal(
  state: EditorState,
  range: SelectionRange,
  typed: string,
  context: EditingContext,
): EditProposal | undefined {
  if (!MUD_OPERATOR_CHARACTERS.has(typed) || typed === ":") return undefined;
  const source = state.doc.toString();
  if (!isMudCodePosition(source, range.from, context)) return undefined;
  const line = state.doc.lineAt(range.from);
  const prefix = operatorPrefix(source, range.from, line.from);
  const compound = `${prefix.text}${typed}`;
  const combines = prefix.text.length > 0 && MUD_OPERATORS.has(compound);
  const operator = combines
    ? compound
    : MUD_OPERATORS.has(typed)
      ? typed
      : undefined;
  if (operator === undefined) return undefined;
  if ((operator === "*" || operator === "/") && !combines) return undefined;

  const operatorFrom = combines ? prefix.from : range.from;
  if (
    (operator === "+" || operator === "-") &&
    !combines &&
    expectsPrefixExpression(source, operatorFrom, line.from)
  ) {
    return undefined;
  }

  const from = horizontalSpaceStart(source, operatorFrom, line.from);
  const to = nextNonHorizontalSpace(source, range.from, line.to);
  if (operator === "..") {
    return {
      from,
      to,
      insert: operator,
      selectionFrom: operator.length,
      selectionTo: operator.length,
    };
  }

  const previous = previousNonHorizontalSpace(source, operatorFrom, line.from);
  const previousCharacter = previous >= line.from ? source[previous] ?? "" : "";
  const leadingSpace =
    previous >= line.from &&
    !"([{,:;".includes(previousCharacter) &&
    !MUD_OPERATOR_CHARACTERS.has(previousCharacter)
      ? " "
      : "";
  const insert = `${leadingSpace}${operator} `;
  return {
    from,
    to,
    insert,
    selectionFrom: insert.length,
    selectionTo: insert.length,
  };
}

function smartSpacingProposal(
  state: EditorState,
  range: SelectionRange,
  typed: string,
  context: EditingContext,
  autoClose: boolean,
): EditProposal | undefined {
  if (context.languageId !== "mud" || !range.empty) return undefined;
  if (typed === "{") {
    return braceSpacingProposal(state, range, context, autoClose);
  }
  if (typed === ";") {
    return terminatorSpacingProposal(state, range, context);
  }
  return (
    punctuationSpacingProposal(state, range, typed, context) ??
    operatorSpacingProposal(state, range, typed, context)
  );
}

function typedProposal(
  state: EditorState,
  range: SelectionRange,
  typed: string,
  context: EditingContext,
  settings: SyntaxPluginSettings,
): EditProposal | undefined {
  if (!range.empty) {
    if (!settings.autoClose) return undefined;
    const close = PAIRS[typed];
    if (close === undefined) return undefined;
    const selected = state.sliceDoc(range.from, range.to);
    return {
      from: range.from,
      to: range.to,
      insert: `${typed}${selected}${close}`,
      selectionFrom: 1,
      selectionTo: 1 + selected.length,
    };
  }

  if (settings.autoClose) {
    const block = blockDelimiterProposal(
      state,
      range.from,
      typed,
      context,
      settings,
    );
    if (block !== undefined) return block;
  }

  if (settings.autoClose) {
    const retrospective = retroactiveWrap(
      state.doc.toString(),
      range.from,
      typed,
      context,
    );
    if (retrospective !== undefined) return retrospective;
  }

  const closing = closingSpacingProposal(
    state,
    range,
    typed,
    context,
    settings,
  );
  if (closing !== undefined) return closing;

  if (
    settings.autoClose &&
    CLOSERS.has(typed) &&
    state.sliceDoc(range.from, range.from + 1) === typed
  ) {
    return {
      from: range.from,
      to: range.from,
      insert: "",
      selectionFrom: 1,
      selectionTo: 1,
    };
  }

  const line = state.doc.lineAt(range.from);
  const prefix = state.sliceDoc(line.from, range.from);
  if (
    settings.autoClose &&
    ["}", "]", ")"].includes(typed) &&
    /^[\t ]*$/.test(prefix)
  ) {
    const indentation = lineIndent(state, range.from);
    const reduced = indentation.endsWith(unit(settings))
      ? indentation.slice(0, -unit(settings).length)
      : indentation;
    return {
      from: line.from,
      to: range.from,
      insert: `${reduced}${typed}`,
      selectionFrom: reduced.length + 1,
      selectionTo: reduced.length + 1,
    };
  }

  const spacing = smartSpacingProposal(
    state,
    range,
    typed,
    context,
    settings.autoClose,
  );
  if (spacing !== undefined) return spacing;
  if (!settings.autoClose) return undefined;

  const close = PAIRS[typed];
  if (close === undefined || (typed === "#" && context.languageId === "mud")) {
    return undefined;
  }
  if (
    (typed === '"' || typed === "'") &&
    (/[A-Za-z0-9_]/.test(state.sliceDoc(range.from - 1, range.from)) ||
      /[A-Za-z0-9_]/.test(state.sliceDoc(range.from, range.from + 1)))
  ) {
    return undefined;
  }
  if (
    (typed === '"' || typed === "'") &&
    /(?:^|[^\\])(?:\\\\)*\\$/.test(state.sliceDoc(line.from, range.from))
  ) {
    return undefined;
  }

  return {
    from: range.from,
    to: range.to,
    insert: `${typed}${close}`,
    selectionFrom: 1,
    selectionTo: 1,
  };
}

function dispatchProposals(view: EditorView, proposals: EditProposal[]): boolean {
  const ordered = [...proposals].sort((left, right) => left.from - right.from);
  for (let index = 1; index < ordered.length; index += 1) {
    if ((ordered[index - 1]?.to ?? 0) > (ordered[index]?.from ?? 0)) return false;
  }
  let delta = 0;
  const ranges: SelectionRange[] = [];
  for (const proposal of ordered) {
    const base = proposal.from + delta;
    ranges.push(
      EditorSelection.range(
        base + proposal.selectionFrom,
        base + proposal.selectionTo,
      ),
    );
    delta += proposal.insert.length - (proposal.to - proposal.from);
  }
  view.dispatch({
    changes: ordered.map(({ from, to, insert }) => ({ from, to, insert })),
    selection: EditorSelection.create(ranges),
    userEvent: "input.type",
    scrollIntoView: true,
  });
  return true;
}

function smartEnter(
  resolver: EditingContextResolver,
  getSettings: () => SyntaxPluginSettings,
): Command {
  return (view) => {
    const settings = getSettings();
    const contexts = view.state.selection.ranges.map((range) =>
      range.empty ? resolver(view.state, range.from) : undefined,
    );
    if (
      contexts.length > 0 &&
      contexts.every((context) => context?.nativeIndentation === true)
    ) {
      return insertNewlineAndIndent(view);
    }
    const proposals: EditProposal[] = [];
    for (const [index, range] of view.state.selection.ranges.entries()) {
      if (!range.empty) return false;
      const context = contexts[index];
      if (context === undefined) return false;
      const line = view.state.doc.lineAt(range.from);
      const before = view.state.sliceDoc(line.from, range.from);
      const after = view.state.sliceDoc(range.from, line.to);
      const indentation = /^[\t ]*/.exec(before)?.[0] ?? "";
      const trimmed = before.trimStart();

      if (
        context.languageId === "mud" &&
        settings.continueLineComments &&
        /^#(?!##)(?: )?$/.test(trimmed) &&
        after.trim() === ""
      ) {
        proposals.push({
          from: line.from,
          to: range.from,
          insert: indentation,
          selectionFrom: indentation.length,
          selectionTo: indentation.length,
        });
        continue;
      }
      if (
        context.languageId === "mud" &&
        settings.continueLineComments &&
        /^#(?!##)/.test(trimmed)
      ) {
        const insert = `\n${indentation}# `;
        proposals.push({
          from: range.from,
          to: range.from,
          insert,
          selectionFrom: insert.length,
          selectionTo: insert.length,
        });
        continue;
      }

      const left = view.state.sliceDoc(Math.max(context.from, range.from - 3), range.from);
      const right = view.state.sliceDoc(range.from, Math.min(context.to, range.from + 3));
      const triple =
        context.languageId === "mud" &&
        ((left.endsWith('"""') && right.startsWith('"""')) ||
          (left.endsWith("###") && right.startsWith("###")));
      if (triple) {
        const insert = `\n${indentation}${unit(settings)}\n${indentation}`;
        proposals.push({
          from: range.from,
          to: range.from,
          insert,
          selectionFrom: 1 + indentation.length + unit(settings).length,
          selectionTo: 1 + indentation.length + unit(settings).length,
        });
        continue;
      }

      const source = view.state.doc.toString();
      const formattedBefore =
        context.languageId === "mud" &&
        isMudCodePosition(source, range.from, context)
          ? formatMudHorizontalSpacing(before)
          : before;
      const immediateLeft = view.state.sliceDoc(range.from - 1, range.from);
      const immediateRight = view.state.sliceDoc(range.from, range.from + 1);
      if (PAIRS[immediateLeft] === immediateRight) {
        const inner = indentation + unit(settings);
        const insert = `${formattedBefore}\n${inner}\n${indentation}`;
        proposals.push({
          from: line.from,
          to: range.from,
          insert,
          selectionFrom: formattedBefore.length + 1 + inner.length,
          selectionTo: formattedBefore.length + 1 + inner.length,
        });
        continue;
      }

      const continuation =
        /(?:[({[]|,|:=|=>|->|\.\.|[=+\-*/%&|^])[\t ]*$/.test(
          formattedBefore,
        );
      const nextIndent = continuation ? indentation + unit(settings) : indentation;
      const insert = `${formattedBefore}\n${nextIndent}`;
      proposals.push({
        from: line.from,
        to: range.from,
        insert,
        selectionFrom: insert.length,
        selectionTo: insert.length,
      });
    }
    return dispatchProposals(view, proposals);
  };
}

function deletePair(
  resolver: EditingContextResolver,
): Command {
  return (view) => {
    const proposals: EditProposal[] = [];
    for (const range of view.state.selection.ranges) {
      if (!range.empty || resolver(view.state, range.from) === undefined) return false;
      const left = view.state.sliceDoc(range.from - 1, range.from);
      const right = view.state.sliceDoc(range.from, range.from + 1);
      if (PAIRS[left] !== right) return false;
      proposals.push({
        from: range.from - 1,
        to: range.from + 1,
        insert: "",
        selectionFrom: 0,
        selectionTo: 0,
      });
    }
    return dispatchProposals(view, proposals);
  };
}

export function createSmartEditingExtensions(
  resolver: EditingContextResolver,
  getSettings: () => SyntaxPluginSettings,
): Extension[] {
  const settings = getSettings();
  return [
    EditorState.tabSize.of(settings.indentSize),
    indentUnit.of(unit(settings)),
    EditorState.languageData.of((state, position) => {
      const context = resolver(state, position);
      return context?.languageId === "mud"
        ? [{ commentTokens: { line: "#", block: { open: "###", close: "###" } } }]
        : [];
    }),
    EditorView.inputHandler.of((view, _from, _to, text) => {
      if (text.length !== 1) return false;
      const proposals: EditProposal[] = [];
      for (const range of view.state.selection.ranges) {
        const context = resolver(view.state, range.from);
        if (context === undefined || range.to > context.to) return false;
        const proposal = typedProposal(
          view.state,
          range,
          text,
          context,
          getSettings(),
        );
        if (proposal === undefined) return false;
        proposals.push(proposal);
      }
      return dispatchProposals(view, proposals);
    }),
    Prec.highest(
      keymap.of([
        { key: "Enter", run: smartEnter(resolver, getSettings) },
        { key: "Backspace", run: deletePair(resolver) },
        { key: "Mod-/", run: toggleComment },
      ]),
    ),
  ];
}
