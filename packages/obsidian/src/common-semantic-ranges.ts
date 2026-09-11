import { StringStream } from "@codemirror/language";
import { highlightTree } from "@lezer/highlight";

import {
  COMMON_SEMANTIC_HIGHLIGHTER,
  commonLanguageSupport,
  commonStreamTagsForStyle,
  type CommonLanguage,
  type CommonStreamEngine,
} from "./common-languages";

export interface CommonSemanticRange {
  from: number;
  to: number;
  classes: string;
}

export interface CommonSemanticOptions {
  tabSize?: number;
  indentUnit?: number;
}

const MAX_ZERO_LENGTH_TOKEN_STEPS = 10;

function semanticClassForStyle(
  engine: CommonStreamEngine,
  style: string | null,
): string | undefined {
  const resolved = commonStreamTagsForStyle(engine, style);
  if (resolved.length === 0) return undefined;
  return COMMON_SEMANTIC_HIGHLIGHTER.style(resolved) ?? undefined;
}

function treeSemanticRanges(
  language: CommonLanguage,
  source: string,
): CommonSemanticRange[] {
  const support = commonLanguageSupport(language);
  if (support === undefined) return [];
  const tree = support.language.parser.parse(source);
  const ranges: CommonSemanticRange[] = [];
  highlightTree(tree, COMMON_SEMANTIC_HIGHLIGHTER, (from, to, classes) => {
    if (from >= to || !classes) return;
    ranges.push({ from, to, classes });
  });
  return ranges;
}

function plainSemanticRanges(source: string): CommonSemanticRange[] {
  const ranges: CommonSemanticRange[] = [];
  let lineFrom = 0;

  while (lineFrom < source.length) {
    let lineTo = lineFrom;
    while (
      lineTo < source.length &&
      source[lineTo] !== "\n" &&
      source[lineTo] !== "\r"
    ) {
      lineTo += 1;
    }
    if (lineFrom < lineTo) {
      ranges.push({
        from: lineFrom,
        to: lineTo,
        classes: "syntax-common-plain",
      });
    }
    if (lineTo >= source.length) break;
    lineFrom =
      source[lineTo] === "\r" && source[lineTo + 1] === "\n"
        ? lineTo + 2
        : lineTo + 1;
  }

  return ranges;
}

function readAdvancingStyle(
  engine: CommonStreamEngine,
  stream: StringStream,
  state: unknown,
): { style: string | null; advanced: boolean } {
  stream.start = stream.pos;
  for (let attempt = 0; attempt < MAX_ZERO_LENGTH_TOKEN_STEPS; attempt += 1) {
    const style = engine.parser.token(stream, state);
    if (stream.pos > stream.start) return { style, advanced: true };
  }
  return { style: null, advanced: false };
}

function streamSemanticRanges(
  engine: CommonStreamEngine,
  source: string,
  options: CommonSemanticOptions,
): CommonSemanticRange[] {
  const tabSize = options.tabSize ?? 4;
  const indentUnit = options.indentUnit ?? 2;
  const state = engine.startState(indentUnit);
  const ranges: CommonSemanticRange[] = [];
  let lineFrom = 0;

  // Match StreamLanguage's parser boundary: blankLine is invoked for empty
  // lines that occupy input positions, not for the virtual line after a final
  // line break or for a zero-length document.
  while (lineFrom < source.length) {
    let lineTo = lineFrom;
    while (
      lineTo < source.length &&
      source[lineTo] !== "\n" &&
      source[lineTo] !== "\r"
    ) {
      lineTo += 1;
    }

    const line = source.slice(lineFrom, lineTo);
    if (line.length === 0) {
      engine.parser.blankLine?.(state, indentUnit);
    } else {
      const stream = new StringStream(line, tabSize, indentUnit);
      while (!stream.eol()) {
        const tokenFrom = stream.pos;
        const { style, advanced } = readAdvancingStyle(
          engine,
          stream,
          state,
        );
        if (!advanced) break;
        const classes = semanticClassForStyle(engine, style);
        if (classes !== undefined && tokenFrom < stream.pos) {
          ranges.push({
            from: lineFrom + tokenFrom,
            to: lineFrom + stream.pos,
            classes,
          });
        }
      }
    }

    if (lineTo >= source.length) break;
    lineFrom =
      source[lineTo] === "\r" && source[lineTo + 1] === "\n"
        ? lineTo + 2
        : lineTo + 1;
  }

  return ranges;
}

export function commonSemanticRanges(
  language: CommonLanguage,
  source: string,
  options: CommonSemanticOptions = {},
): CommonSemanticRange[] {
  switch (language.engine.kind) {
    case "tree":
      return treeSemanticRanges(language, source);
    case "stream":
      return streamSemanticRanges(language.engine, source, options);
    case "plain":
      return plainSemanticRanges(source);
  }
}
