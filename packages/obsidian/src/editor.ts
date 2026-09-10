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

import { findCodeBlocks, findMudCodeBlocks } from "./blocks";
import {
  COMMON_EDITOR_HIGHLIGHT_STYLE,
  commonLanguageByFence,
  commonLanguages,
} from "./common-languages";
import type { MudHighlightConfig } from "./config";
import type { LanguageRegistry } from "./languages";
import type { SyntaxPluginSettings } from "./settings";
import { createSmartEditingExtensions } from "./smart-edit";
import {
  tokenClass,
  tokenColorClass,
  tokenizeMud,
  type MudToken,
} from "./tokenizer";

function addTokenRanges(
  ranges: Range<Decoration>[],
  token: MudToken,
  base: number,
  languageId = "mud",
): void {
  let segmentStart = token.from;
  for (let index = token.from; index <= token.to; index += 1) {
    const character = index < token.to ? token.text[index - token.from] : "\n";
    if (character !== "\n" && character !== "\r") continue;
    if (index > segmentStart) {
      ranges.push(
        Decoration.mark({
          class: `${tokenClass(token.categoryId)} ${tokenColorClass(languageId, token.categoryId)}`,
        }).range(base + segmentStart, base + index),
      );
    }
    if (character === "\r" && token.text[index - token.from + 1] === "\n") {
      index += 1;
    }
    segmentStart = index + 1;
  }
}

function addPlainCommonRanges(
  ranges: Range<Decoration>[],
  source: string,
  base: number,
): void {
  let segmentStart = 0;
  for (let index = 0; index <= source.length; index += 1) {
    const character = index < source.length ? source[index] : "\n";
    if (character !== "\n" && character !== "\r") continue;
    if (index > segmentStart) {
      ranges.push(
        Decoration.mark({ class: "syntax-common-plain" }).range(
          base + segmentStart,
          base + index,
        ),
      );
    }
    if (character === "\r" && source[index + 1] === "\n") index += 1;
    segmentStart = index + 1;
  }
}

function addCommonLanguageRanges(
  ranges: Range<Decoration>[],
  source: string,
  base: number,
  fence: string,
): void {
  const language = commonLanguageByFence(fence);
  if (language === undefined) return;
  const support = language.support?.();
  if (support === undefined) {
    addPlainCommonRanges(ranges, source, base);
    return;
  }
  const tree = support.language.parser.parse(source);
  highlightTree(tree, COMMON_EDITOR_HIGHLIGHT_STYLE, (from, to, classes) => {
    if (from >= to) return;
    ranges.push(
      Decoration.mark({ class: classes }).range(base + from, base + to),
    );
  });
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
      ...commonLanguages().flatMap(({ fences: aliases }) => aliases),
    ].map((fence) => fence.toLocaleLowerCase()),
  );
  for (const block of findCodeBlocks(source, fences)) {
    const body = source.slice(block.from, block.to);
    const runtime = registry.byFence(block.language);
    if (runtime !== undefined) {
      for (const token of runtime.tokenize(body)) {
        addTokenRanges(ranges, token, block.from, runtime.settings.id);
      }
    } else {
      addCommonLanguageRanges(ranges, body, block.from, block.language);
    }
    if (lineNumbers) {
      let line = view.state.doc.lineAt(block.from);
      let number = 1;
      while (line.from < block.to || (number === 1 && line.from === block.to)) {
        ranges.push(
          Decoration.widget({
            widget: new CodeLineNumberWidget(number),
            side: -1,
          }).range(line.from),
        );
        if (line.to >= block.to || line.number >= view.state.doc.lines) break;
        line = view.state.doc.line(line.number + 1);
        number += 1;
      }
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
    const body = source.slice(block.from, block.to);
    for (const token of tokenizeMud(body, config)) {
      addTokenRanges(ranges, token, block.from);
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
        ...commonLanguages().flatMap(({ fences }) => fences),
      ].map((fence) => fence.toLocaleLowerCase()),
    );
  return [
    createEditorHighlighter(registry, getSettings),
    ...createSmartEditingExtensions(
      (state, position) => {
        const block = findCodeBlocks(state.doc.toString(), accepted()).find(
          ({ from, to }) => position >= from && position <= to,
        );
        if (block === undefined) return undefined;
        const languageId =
          registry.byFence(block.language)?.settings.id ??
          commonLanguageByFence(block.language)?.id;
        return languageId === undefined
          ? undefined
          : { from: block.from, to: block.to, languageId };
      },
      getSettings,
    ),
  ];
}
