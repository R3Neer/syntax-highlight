import type { Extension, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

import {
  findCodeBlocks,
  findMudCodeBlocks,
  isCodeBlockContentPosition,
  mapCodeBlockRange,
  type MudCodeBlock,
} from "./blocks";
import { commonFenceMatch } from "./block-presentation";
import type { MudHighlightConfig } from "./config";
import {
  acceptedEditorFenceNames,
  blockBodyIntersectsVisible,
  buildEditorBlockModel,
  buildEditorBlockSemantics,
  positionIsVisible,
  rangeIntersectsVisible,
  type EditorBlockModel,
  type EditorHighlightSpan,
  type EditorVisibleRange,
  type ResolvedEditorBlock,
} from "./editor-block-model";
import type { LanguageRegistry } from "./languages";
import type { SyntaxPluginSettings } from "./settings";
import { createSmartEditingExtensions } from "./smart-edit";
import {
  tokenClass,
  tokenColorClass,
  tokenizeMud,
  type MudToken,
} from "./tokenizer";

function visibleRanges(view: EditorView): readonly EditorVisibleRange[] {
  const ranges = (
    view as EditorView & { visibleRanges?: readonly EditorVisibleRange[] }
  ).visibleRanges;
  return ranges ?? [{ from: 0, to: view.state.doc.length }];
}

function blockPhysicalTo(block: MudCodeBlock): number {
  return block.closingLineTo ?? block.to;
}

function blockIntersectsVisible(
  block: MudCodeBlock,
  ranges: readonly EditorVisibleRange[],
): boolean {
  return rangeIntersectsVisible(
    block.openingLineFrom,
    blockPhysicalTo(block),
    ranges,
  );
}

function semanticSpans(
  resolved: ResolvedEditorBlock,
  cache: Map<string, readonly EditorHighlightSpan[]>,
): readonly EditorHighlightSpan[] {
  const cached = cache.get(resolved.semanticKey);
  if (cached !== undefined) return cached;
  const spans = buildEditorBlockSemantics(resolved);
  cache.set(resolved.semanticKey, spans);
  return spans;
}

function materializeSyntaxDecorations(
  view: EditorView,
  model: EditorBlockModel,
  semanticCache: Map<string, readonly EditorHighlightSpan[]>,
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const visible = visibleRanges(view);

  for (const resolved of model.blocks) {
    const { block } = resolved;
    if (!blockIntersectsVisible(block, visible)) continue;

    for (const line of resolved.lineSemantics) {
      if (!positionIsVisible(line.from, visible)) continue;
      if (line.classes.length === 0) continue;
      ranges.push(
        Decoration.line({
          attributes: { class: line.classes.join(" ") },
        }).range(line.from),
      );
    }

    if (!blockBodyIntersectsVisible(block, visible)) continue;

    for (const span of semanticSpans(resolved, semanticCache)) {
      if (!rangeIntersectsVisible(span.from, span.to, visible)) continue;
      ranges.push(
        Decoration.mark({ class: span.className }).range(span.from, span.to),
      );
    }

    if (resolved.showLineNumbers) {
      block.bodyLines.forEach((line, index) => {
        if (!positionIsVisible(line.sourceFrom, visible)) return;
        ranges.push(
          Decoration.widget({
            widget: new CodeLineNumberWidget(index + 1),
            side: -1,
          }).range(line.sourceFrom),
        );
      });
    }
  }

  ranges.sort((left, right) => left.from - right.from || left.to - right.to);
  return Decoration.set(ranges, true);
}

export function buildSyntaxDecorations(
  view: EditorView,
  registry: LanguageRegistry,
  lineNumbers = false,
): DecorationSet {
  const model = buildEditorBlockModel(
    view.state.doc.toString(),
    registry,
    lineNumbers,
  );
  return materializeSyntaxDecorations(view, model, new Map());
}

class CodeLineNumberWidget extends WidgetType {
  constructor(private readonly number: number) {
    super();
  }

  override eq(other: CodeLineNumberWidget): boolean {
    return other.number === this.number;
  }

  override toDOM(): HTMLElement {
    const element = document.createElement("span");
    element.className = "syntax-editor-line-number";
    element.ariaHidden = "true";
    element.textContent = String(this.number);
    return element;
  }
}

function addMappedMudMark(
  ranges: Range<Decoration>[],
  block: MudCodeBlock,
  from: number,
  to: number,
  className: string,
): void {
  for (const mapped of mapCodeBlockRange(block, from, to)) {
    ranges.push(Decoration.mark({ class: className }).range(mapped.from, mapped.to));
  }
}

function addMudTokenRanges(
  ranges: Range<Decoration>[],
  token: MudToken,
  block: MudCodeBlock,
  languageId = "mud",
): void {
  addMappedMudMark(
    ranges,
    block,
    token.from,
    token.to,
    `${tokenClass(token.categoryId)} ${tokenColorClass(languageId, token.categoryId)}`,
  );
}

export function buildMudDecorations(
  view: EditorView,
  config?: MudHighlightConfig,
): DecorationSet {
  const source = view.state.doc.toString();
  const ranges: Range<Decoration>[] = [];

  for (const block of findMudCodeBlocks(source)) {
    for (const token of tokenizeMud(block.body, config)) {
      addMudTokenRanges(ranges, token, block);
    }
  }

  return Decoration.set(ranges, true);
}

export function createMudEditorHighlighter(config: MudHighlightConfig) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildMudDecorations(view, config);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged) {
          this.decorations = buildMudDecorations(update.view, config);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );
}

export function createEditorHighlighter(
  registry: LanguageRegistry,
  getSettings: () => SyntaxPluginSettings,
) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private readonly unsubscribe: () => void;
      private readonly semanticCache = new Map<
        string,
        readonly EditorHighlightSpan[]
      >();
      private model: EditorBlockModel;
      private revision = "";

      constructor(private readonly view: EditorView) {
        const settings = getSettings();
        this.revision = this.currentRevision();
        this.model = buildEditorBlockModel(
          view.state.doc.toString(),
          registry,
          settings.lineNumbers,
        );
        this.decorations = settings.markdownEditor
          ? materializeSyntaxDecorations(view, this.model, this.semanticCache)
          : Decoration.none;
        this.unsubscribe = registry.subscribe(() => {
          this.view.dispatch({});
        });
      }

      update(update: ViewUpdate): void {
        const nextRevision = this.currentRevision();
        const settings = getSettings();
        const modelChanged = update.docChanged || nextRevision !== this.revision;

        if (modelChanged) {
          this.revision = nextRevision;
          this.semanticCache.clear();
          this.model = buildEditorBlockModel(
            update.state.doc.toString(),
            registry,
            settings.lineNumbers,
          );
        }

        if (!settings.markdownEditor) {
          this.decorations = Decoration.none;
          return;
        }

        if (modelChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = materializeSyntaxDecorations(
            update.view,
            this.model,
            this.semanticCache,
          );
        }
      }

      destroy(): void {
        this.unsubscribe();
        this.semanticCache.clear();
      }

      private currentRevision(): string {
        const settings = getSettings();
        return `${settings.markdownEditor}:${settings.lineNumbers}:` + registry
          .enabled()
          .map(({ settings, revision }) => `${settings.id}:${revision}`)
          .join("|");
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );
}

export function createMarkdownEditorExtensions(
  registry: LanguageRegistry,
  getSettings: () => SyntaxPluginSettings,
): Extension[] {
  return [
    createEditorHighlighter(registry, getSettings),
    ...createSmartEditingExtensions(
      (state, position) => {
        const block = findCodeBlocks(
          state.doc.toString(),
          acceptedEditorFenceNames(registry),
        ).find((candidate) => isCodeBlockContentPosition(candidate, position));
        if (block === undefined) return undefined;
        const languageId =
          registry.byFence(block.language)?.settings.id ??
          commonFenceMatch(block.language)?.language.id;
        return languageId === undefined
          ? undefined
          : {
              from: block.bodyLines[0]?.sourceFrom ?? block.from,
              to: block.bodyLines.at(-1)?.sourceTo ?? block.to,
              languageId,
              nativeIndentation: block.quoteDepth > 0,
            };
      },
      getSettings,
    ),
  ];
}
