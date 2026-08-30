import type { FormatResult, HighlightDocument } from "@r3nner/syntax-highlight-core";
import type { ChangeSpec, Extension } from "@codemirror/state";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

function safeId(value: string): string {
  return /^[a-z][a-z0-9-]*$/.test(value) ? value : "unknown";
}

export function decorationsForDocument(document: HighlightDocument): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const span of document.spans) {
    builder.add(span.from, span.to, Decoration.mark({
      class: `sh-token sh-token--${safeId(span.categoryId)}`,
    }));
  }
  return builder.finish();
}

export function formatChanges(result: FormatResult): ChangeSpec[] {
  return result.edits.map(({ from, to, insert }) => ({ from, to, insert }));
}

export function staticHighlightExtension(document: HighlightDocument): Extension {
  return EditorView.decorations.of(decorationsForDocument(document));
}
