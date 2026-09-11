import {
  commonFenceMatch,
  commonFenceNames,
  presentationClassNames,
  type CommonFenceMatch,
} from "./block-presentation";
import {
  findCodeBlocks,
  mapCodeBlockRange,
  type CodeBlockBodyLine,
  type MudCodeBlock,
} from "./blocks";
import { commonSemanticRanges } from "./common-semantic-ranges";
import type { LanguageRegistry, LanguageRuntime } from "./languages";
import { tokenClass, tokenColorClass } from "./tokenizer";

export interface EditorHighlightSpan {
  from: number;
  to: number;
  className: string;
}

export interface EditorLineSemantic {
  from: number;
  to: number;
  visibilityFrom: number;
  visibilityTo: number;
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
  const lines = new Map<
    number,
    {
      from: number;
      to: number;
      visibilityFrom: number;
      visibilityTo: number;
      classes: Set<string>;
    }
  >();

  const add = (
    from: number,
    to: number,
    visibilityFrom: number,
    visibilityTo: number,
    ...values: readonly string[]
  ): void => {
    if (values.length === 0) return;
    let line = lines.get(from);
    if (line === undefined) {
      line = {
        from,
        to,
        visibilityFrom,
        visibilityTo,
        classes: new Set<string>(),
      };
      lines.set(from, line);
    }
    for (const value of values) if (value) line.classes.add(value);
  };

  const addBodyLine = (
    line: CodeBlockBodyLine,
    ...values: readonly string[]
  ): void => {
    add(
      line.lineFrom,
      line.lineTo,
      line.sourceFrom,
      line.sourceTo,
      ...values,
    );
  };

  if (block.quoteDepth > 0) {
    add(
      block.openingLineFrom,
      block.openingLineTo,
      block.openingLineFrom,
      block.openingLineTo,
      "syntax-editor-code-source",
      "syntax-editor-code-source-opening",
    );
    for (const line of block.bodyLines) {
      addBodyLine(
        line,
        "syntax-editor-code-source",
        "syntax-editor-code-source-body",
      );
    }
    if (
      block.closingLineFrom !== undefined &&
      block.closingLineTo !== undefined
    ) {
      add(
        block.closingLineFrom,
        block.closingLineTo,
        block.closingLineFrom,
        block.closingLineTo,
        "syntax-editor-code-source",
        "syntax-editor-code-source-closing",
      );
    }
  }

  if (common !== undefined) {
    const presentation = presentationClassNames(common);
    for (const line of block.bodyLines) addBodyLine(line, ...presentation);
  }

  return [...lines.values()]
    .sort((left, right) => left.from - right.from)
    .map(({ classes, ...line }) => ({ ...line, classes: [...classes] }));
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

  for (const range of commonSemanticRanges(common!.language, block.body)) {
    if (range.from >= range.to) continue;
    spans.push(...mappedSpans(block, range.from, range.to, range.classes));
  }
  return spans;
}

export function rangeIntersectsVisible(
  from: number,
  to: number,
  visibleRanges: readonly EditorVisibleRange[],
): boolean {
  return visibleRanges.some((range) => from <= range.to && to >= range.from);
}

function rangeOverlapsMaterialized(
  from: number,
  to: number,
  range: EditorVisibleRange,
): boolean {
  if (from > to) return false;
  if (from === to) return from >= range.from && from <= range.to;
  return from < range.to && to > range.from;
}

export function lineSemanticIsMaterialized(
  line: EditorLineSemantic,
  viewport: EditorVisibleRange,
  visibleRanges: readonly EditorVisibleRange[],
): boolean {
  return (
    rangeOverlapsMaterialized(line.from, line.to, viewport) &&
    visibleRanges.some((range) =>
      rangeOverlapsMaterialized(
        line.visibilityFrom,
        line.visibilityTo,
        range,
      ),
    )
  );
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
