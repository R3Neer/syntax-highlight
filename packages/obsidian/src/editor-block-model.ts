import { highlightTree } from "@lezer/highlight";

import {
  commonFenceMatch,
  commonFenceNames,
  presentationClassNames,
  type CommonFenceMatch,
} from "./block-presentation";
import {
  findCodeBlocks,
  mapCodeBlockRange,
  type MudCodeBlock,
} from "./blocks";
import {
  COMMON_EDITOR_HIGHLIGHT_STYLE,
  parseCommonLanguageTree,
} from "./common-languages";
import type { LanguageRegistry, LanguageRuntime } from "./languages";
import { tokenClass, tokenColorClass } from "./tokenizer";

export interface EditorHighlightSpan {
  from: number;
  to: number;
  className: string;
}

export interface EditorLineSemantic {
  from: number;
  classes: readonly string[];
}

export interface EditorVisibleRange {
  from: number;
  to: number;
}

export interface ResolvedEditorBlock {
  block: MudCodeBlock;
  runtime?: LanguageRuntime;
  common?: CommonFenceMatch;
  semanticKey: string;
  showLineNumbers: boolean;
  lineSemantics: readonly EditorLineSemantic[];
}

export interface EditorBlockModel {
  source: string;
  blocks: readonly ResolvedEditorBlock[];
}

export function acceptedEditorFenceNames(
  registry: LanguageRegistry,
): Set<string> {
  return new Set(
    [
      ...registry.enabled().flatMap(({ descriptor }) => descriptor.fences),
      ...commonFenceNames(),
    ].map((fence) => fence.toLocaleLowerCase()),
  );
}

function semanticKey(
  block: MudCodeBlock,
  runtime: LanguageRuntime | undefined,
  common: CommonFenceMatch | undefined,
): string {
  const languageRevision = runtime === undefined
    ? `common:${common?.language.id ?? block.language}`
    : `runtime:${runtime.settings.id}:${runtime.revision}`;
  return `${languageRevision}:${block.openingLineFrom}:${block.to}`;
}

function lineSemantics(
  block: MudCodeBlock,
  common: CommonFenceMatch | undefined,
): EditorLineSemantic[] {
  const classes = new Map<number, Set<string>>();
  const add = (from: number, ...values: readonly string[]): void => {
    if (values.length === 0) return;
    const line = classes.get(from) ?? new Set<string>();
    for (const value of values) if (value) line.add(value);
    classes.set(from, line);
  };

  if (block.quoteDepth > 0) {
    add(
      block.openingLineFrom,
      "syntax-editor-code-source",
      "syntax-editor-code-source-opening",
    );
    for (const line of block.bodyLines) {
      add(
        line.lineFrom,
        "syntax-editor-code-source",
        "syntax-editor-code-source-body",
      );
    }
    if (block.closingLineFrom !== undefined) {
      add(
        block.closingLineFrom,
        "syntax-editor-code-source",
        "syntax-editor-code-source-closing",
      );
    }
  }

  if (common !== undefined) {
    const presentation = presentationClassNames(common);
    for (const line of block.bodyLines) add(line.lineFrom, ...presentation);
  }

  return [...classes.entries()]
    .sort(([left], [right]) => left - right)
    .map(([from, values]) => ({ from, classes: [...values] }));
}

export function buildEditorBlockModel(
  source: string,
  registry: LanguageRegistry,
  lineNumbers: boolean,
): EditorBlockModel {
  const blocks: ResolvedEditorBlock[] = [];
  for (const block of findCodeBlocks(source, acceptedEditorFenceNames(registry))) {
    const runtime = registry.byFence(block.language);
    const common = runtime === undefined ? commonFenceMatch(block.language) : undefined;
    if (runtime === undefined && common === undefined) continue;

    blocks.push({
      block,
      runtime,
      common,
      semanticKey: semanticKey(block, runtime, common),
      showLineNumbers:
        lineNumbers &&
        (runtime !== undefined || common?.language.presentation?.lineNumbers !== false),
      lineSemantics: lineSemantics(block, common),
    });
  }
  return { source, blocks };
}

function mappedSpans(
  block: MudCodeBlock,
  from: number,
  to: number,
  className: string,
): EditorHighlightSpan[] {
  return mapCodeBlockRange(block, from, to).map((mapped) => ({
    from: mapped.from,
    to: mapped.to,
    className,
  }));
}

export function buildEditorBlockSemantics(
  resolved: ResolvedEditorBlock,
): EditorHighlightSpan[] {
  const { block, runtime, common } = resolved;
  const spans: EditorHighlightSpan[] = [];

  if (runtime !== undefined) {
    for (const token of runtime.tokenize(block.body)) {
      spans.push(
        ...mappedSpans(
          block,
          token.from,
          token.to,
          `${tokenClass(token.categoryId)} ${tokenColorClass(runtime.settings.id, token.categoryId)}`,
        ),
      );
    }
    return spans;
  }

  const language = common!.language;
  const tree = parseCommonLanguageTree(language, block.body);
  if (tree === undefined) {
    for (const line of block.bodyLines) {
      if (line.sourceFrom >= line.sourceTo) continue;
      spans.push({
        from: line.sourceFrom,
        to: line.sourceTo,
        className: "syntax-common-plain",
      });
    }
    return spans;
  }

  highlightTree(tree, COMMON_EDITOR_HIGHLIGHT_STYLE, (from, to, className) => {
    if (from >= to) return;
    spans.push(...mappedSpans(block, from, to, className));
  });
  return spans;
}

export function rangeIntersectsVisible(
  from: number,
  to: number,
  visibleRanges: readonly EditorVisibleRange[],
): boolean {
  return visibleRanges.some((range) => from <= range.to && to >= range.from);
}

export function blockBodyIntersectsVisible(
  block: MudCodeBlock,
  visibleRanges: readonly EditorVisibleRange[],
): boolean {
  return rangeIntersectsVisible(block.from, block.to, visibleRanges);
}

export function positionIsVisible(
  position: number,
  visibleRanges: readonly EditorVisibleRange[],
): boolean {
  return visibleRanges.some(
    (range) => position >= range.from && position <= range.to,
  );
}
