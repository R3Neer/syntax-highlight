import { StringStream } from "@codemirror/language";
import { highlightTree, tags, type Tag } from "@lezer/highlight";

import {
  COMMON_SEMANTIC_HIGHLIGHT_STYLE,
  commonLanguageSupport,
  effectiveCommonStreamTokenTable,
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

type PublicTagValue =
  | Tag
  | readonly Tag[]
  | ((tag: Tag) => Tag);

type PublicTagTable = Record<string, PublicTagValue | undefined>;

const PUBLIC_TAGS = tags as unknown as PublicTagTable;
const MAX_ZERO_LENGTH_TOKEN_STEPS = 10;

function asTags(value: Tag | readonly Tag[]): readonly Tag[] {
  return Array.isArray(value) ? value : [value as Tag];
}

function resolveStyleName(
  styleName: string,
  tokenTable: Readonly<Record<string, Tag | readonly Tag[]>>,
): readonly Tag[] {
  const parts = styleName.split(".").filter(Boolean);
  if (parts.length === 0) return [];

  const baseName = parts[0]!;
  const explicitBase = tokenTable[baseName];
  const publicBase = PUBLIC_TAGS[baseName];
  let resolved: readonly Tag[];

  if (explicitBase !== undefined) {
    resolved = asTags(explicitBase);
  } else if (publicBase !== undefined && typeof publicBase !== "function") {
    resolved = asTags(publicBase);
  } else {
    return [];
  }

  for (const modifierName of parts.slice(1)) {
    const modifier = PUBLIC_TAGS[modifierName];
    if (typeof modifier !== "function") return [];
    resolved = resolved.map((tag) => modifier(tag));
  }

  return resolved;
}

function tagsForStyle(
  style: string,
  tokenTable: Readonly<Record<string, Tag | readonly Tag[]>>,
): readonly Tag[] {
  const result = new Set<Tag>();
  for (const styleName of style.trim().split(/\s+/)) {
    if (!styleName) continue;
    for (const tag of resolveStyleName(styleName, tokenTable)) result.add(tag);
  }
  return [...result];
}

function semanticClassForStyle(
  style: string | null,
  tokenTable: Readonly<Record<string, Tag | readonly Tag[]>>,
): string | undefined {
  if (style === null) return undefined;
  const resolved = tagsForStyle(style, tokenTable);
  if (resolved.length === 0) return undefined;
  return COMMON_SEMANTIC_HIGHLIGHT_STYLE.style(resolved) ?? undefined;
}

function treeSemanticRanges(
  language: CommonLanguage,
  source: string,
): CommonSemanticRange[] {
  const support = commonLanguageSupport(language);
  if (support === undefined) return [];
  const tree = support.language.parser.parse(source);
  const ranges: CommonSemanticRange[] = [];
  highlightTree(tree, COMMON_SEMANTIC_HIGHLIGHT_STYLE, (from, to, classes) => {
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

function readAdvancingStyle<State>(
  engine: CommonStreamEngine,
  stream: StringStream,
  state: State,
): { style: string | null; advanced: boolean } {
  stream.start = stream.pos;
  for (let attempt = 0; attempt < MAX_ZERO_LENGTH_TOKEN_STEPS; attempt += 1) {
    const style = engine.parser.token(stream, state as unknown);
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
  const state = engine.parser.startState?.(indentUnit) ?? (true as unknown);
  const tokenTable = effectiveCommonStreamTokenTable(engine);
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
        const classes = semanticClassForStyle(style, tokenTable);
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
