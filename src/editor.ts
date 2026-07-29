import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

import { findCodeBlocks, findMudCodeBlocks } from "./blocks";
import type { MudHighlightConfig } from "./config";
import type { LanguageRegistry } from "./languages";
import {
  tokenClass,
  tokenColorClass,
  tokenizeMud,
  type MudToken,
} from "./tokenizer";

function addTokenRanges(
  builder: RangeSetBuilder<Decoration>,
  token: MudToken,
  base: number,
  languageId = "mud",
): void {
  let segmentStart = token.from;
  for (let index = token.from; index <= token.to; index += 1) {
    const character = index < token.to ? token.text[index - token.from] : "\n";
    if (character !== "\n" && character !== "\r") continue;
    if (index > segmentStart) {
      builder.add(
        base + segmentStart,
        base + index,
        Decoration.mark({
          class: `${tokenClass(token.categoryId)} ${tokenColorClass(languageId, token.categoryId)}`,
        }),
      );
    }
    if (character === "\r" && token.text[index - token.from + 1] === "\n") {
      index += 1;
    }
    segmentStart = index + 1;
  }
}

export function buildSyntaxDecorations(
  view: EditorView,
  registry: LanguageRegistry,
): DecorationSet {
  const source = view.state.doc.toString();
  const builder = new RangeSetBuilder<Decoration>();
  const fences = new Set(
    registry
      .enabled()
      .flatMap(({ descriptor }) =>
        descriptor.fences.map((fence) => fence.toLocaleLowerCase()),
      ),
  );
  for (const block of findCodeBlocks(source, fences)) {
    const runtime = registry.byFence(block.language);
    if (runtime === undefined) continue;
    const body = source.slice(block.from, block.to);
    for (const token of runtime.tokenize(body)) {
      addTokenRanges(builder, token, block.from, runtime.settings.id);
    }
  }
  return builder.finish();
}

export function buildMudDecorations(
  view: EditorView,
  config?: MudHighlightConfig,
): DecorationSet {
  const source = view.state.doc.toString();
  const builder = new RangeSetBuilder<Decoration>();

  for (const block of findMudCodeBlocks(source)) {
    const body = source.slice(block.from, block.to);
    for (const token of tokenizeMud(body, config)) {
      addTokenRanges(builder, token, block.from);
    }
  }

  return builder.finish();
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

export function createEditorHighlighter(registry: LanguageRegistry) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private readonly unsubscribe: () => void;
      private revision = "";

      constructor(private readonly view: EditorView) {
        this.revision = this.currentRevision();
        this.decorations = buildSyntaxDecorations(view, registry);
        this.unsubscribe = registry.subscribe(() => {
          this.view.dispatch({});
        });
      }

      update(update: ViewUpdate): void {
        const revision = this.currentRevision();
        if (update.docChanged || revision !== this.revision) {
          this.revision = revision;
          this.decorations = buildSyntaxDecorations(update.view, registry);
        }
      }

      destroy(): void {
        this.unsubscribe();
      }

      private currentRevision(): string {
        return registry
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
