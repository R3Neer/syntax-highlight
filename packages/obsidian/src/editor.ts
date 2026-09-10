import type { Extension, Range } from "@codemirror/state";
import { highlightTree } from "@lezer/highlight";
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
import {
  commonFenceMatch,
  commonFenceNames,
  presentationClassNames,
  type CommonFenceMatch,
} from "./block-presentation";
import {
  COMMON_EDITOR_HIGHLIGHT_STYLE,
  type CommonLanguage,
} from "./common-languages";
import type { MudHighlightConfig } from "./config";
import type { LanguageRegistry } from "./languages";
import { createLivePreviewEmbeddedBlockExtension } from "./live-preview-host";
import type { SyntaxPluginSettings } from "./settings";
import { createSmartEditingExtensions } from "./smart-edit";
import {
  tokenClass,
  tokenColorClass,
  tokenizeMud,
  type MudToken,
} from "./tokenizer";

function addMappedMark(
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

function addTokenRanges(
  ranges: Range<Decoration>[],
  token: MudToken,
  block: MudCodeBlock,
  languageId = "mud",
): void {
  addMappedMark(
    ranges,
    block,
    token.from,
    token.to,
    `${tokenClass(token.categoryId)} ${tokenColorClass(languageId, token.categoryId)}`,
  );
}

function addPlainCommonRanges(
  ranges: Range<Decoration>[],
  block: MudCodeBlock,
): void {
  for (const line of block.bodyLines) {
    if (line.sourceFrom >= line.sourceTo) continue;
    ranges.push(
      Decoration.mark({ class: "syntax-common-plain" }).range(
        line.sourceFrom,
        line.sourceTo,
      ),
    );
  }
}

function addCommonLanguageRanges(
  ranges: Range<Decoration>[],
  block: MudCodeBlock,
  language: CommonLanguage,
): void {
  const support = language.support?.();
  if (support === undefined) {
    addPlainCommonRanges(ranges, block);
    return;
  }
  const tree = support.language.parser.parse(block.body);
  highlightTree(tree, COMMON_EDITOR_HIGHLIGHT_STYLE, (from, to, classes) => {
    if (from >= to) return;
    addMappedMark(ranges, block, from, to, classes);
  });
}

function addPresentationLineRanges(
  ranges: Range<Decoration>[],
  block: MudCodeBlock,
  match: CommonFenceMatch,
): void {
  const classes = presentationClassNames(match).join(" ");
  if (!classes) return;
  for (const line of block.bodyLines) {
    ranges.push(
      Decoration.line({ attributes: { class: classes } }).range(line.lineFrom),
    );
  }
}

export function buildSyntaxDecorations(
  view: EditorView,
  registry: LanguageRegistry,
  lineNumbers = false,
): DecorationSet {
  const source = view.state.doc.toString();
  const ranges: Range<Decoration>[] = [];
  const fences = new Set(
    [
      ...registry
        .enabled()
        .flatMap(({ descriptor }) => descriptor.fences),
      ...commonFenceNames(),
    ].map((fence) => fence.toLocaleLowerCase()),
  );
  for (const block of findCodeBlocks(source, fences)) {
    const runtime = registry.byFence(block.language);
    const common = runtime === undefined ? commonFenceMatch(block.language) : undefined;
    if (runtime !== undefined) {
      for (const token of runtime.tokenize(block.body)) {
        addTokenRanges(ranges, token, block, runtime.settings.id);
      }
    } else if (common !== undefined) {
      addCommonLanguageRanges(ranges, block, common.language);
      addPresentationLineRanges(ranges, block, common);
    }
    if (
      lineNumbers &&
      (runtime !== undefined || common?.language.presentation?.lineNumbers !== false)
    ) {
      block.bodyLines.forEach((line, index) => {
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

export function buildMudDecorations(
  view: EditorView,
  config?: MudHighlightConfig,
): DecorationSet {
  const source = view.state.doc.toString();
  const ranges: Range<Decoration>[] = [];

  for (const block of findMudCodeBlocks(source)) {
    for (const token of tokenizeMud(block.body, config)) {
      addTokenRanges(ranges, token, block);
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
      private revision = "";

      constructor(private readonly view: EditorView) {
        this.revision = this.currentRevision();
        const settings = getSettings();
        this.decorations = settings.markdownEditor
          ? buildSyntaxDecorations(view, registry, settings.lineNumbers)
          : Decoration.none;
        this.unsubscribe = registry.subscribe(() => {
          this.view.dispatch({});
        });
      }

      update(update: ViewUpdate): void {
        const revision = this.currentRevision();
        const settings = getSettings();
        if (!settings.markdownEditor) {
          this.decorations = Decoration.none;
        } else if (update.docChanged || revision !== this.revision) {
          this.revision = revision;
          this.decorations = buildSyntaxDecorations(
            update.view,
            registry,
            settings.lineNumbers,
          );
        }
      }

      destroy(): void {
        this.unsubscribe();
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
  const accepted = (): Set<string> =>
    new Set(
      [
        ...registry.enabled().flatMap(({ descriptor }) => descriptor.fences),
        ...commonFenceNames(),
      ].map((fence) => fence.toLocaleLowerCase()),
    );
  return [
    createEditorHighlighter(registry, getSettings),
    createLivePreviewEmbeddedBlockExtension(registry, getSettings),
    ...createSmartEditingExtensions(
      (state, position) => {
        const block = findCodeBlocks(state.doc.toString(), accepted()).find(
          (candidate) => isCodeBlockContentPosition(candidate, position),
        );
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
