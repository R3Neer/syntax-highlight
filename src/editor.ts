import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

import { findMudCodeBlocks } from "./blocks";
import { tokenClass, tokenizeMud, type MudToken } from "./tokenizer";

function addTokenRanges(
  builder: RangeSetBuilder<Decoration>,
  token: MudToken,
  base: number,
): void {
  let segmentStart = token.from;
  for (let index = token.from; index <= token.to; index += 1) {
    const character = index < token.to ? token.text[index - token.from] : "\n";
    if (character !== "\n" && character !== "\r") continue;
    if (index > segmentStart) {
      builder.add(
        base + segmentStart,
        base + index,
        Decoration.mark({ class: tokenClass(token.kind) }),
      );
    }
    if (character === "\r" && token.text[index - token.from + 1] === "\n") {
      index += 1;
    }
    segmentStart = index + 1;
  }
}

export function buildMudDecorations(view: EditorView): DecorationSet {
  const source = view.state.doc.toString();
  const builder = new RangeSetBuilder<Decoration>();

  for (const block of findMudCodeBlocks(source)) {
    const body = source.slice(block.from, block.to);
    for (const token of tokenizeMud(body)) addTokenRanges(builder, token, block.from);
  }

  return builder.finish();
}

export const mudEditorHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildMudDecorations(view);
    }

    update(update: ViewUpdate): void {
      if (update.docChanged) this.decorations = buildMudDecorations(update.view);
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
);
