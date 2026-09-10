import { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";

import { buildSyntaxDecorations } from "../src/editor";
import { LanguageRegistry } from "../src/languages";
import { DEFAULT_SETTINGS } from "../src/settings";

function registry(): LanguageRegistry {
  return new LanguageRegistry(
    structuredClone(DEFAULT_SETTINGS),
    () => Promise.resolve(""),
  );
}

describe("plain Text blocks in Markdown editing", () => {
  it("marks only Text block body lines with the theme-aware plain class", () => {
    const source = "before\n```text\nalpha\nbeta & gamma\n```\nafter";
    const state = EditorState.create({ doc: source });
    const view = { state } as EditorView;
    const decorations = buildSyntaxDecorations(view, registry());
    const spans: Array<{ text: string; className: string }> = [];

    decorations.between(0, state.doc.length, (from, to, decoration) => {
      const className = (decoration.spec as { class?: string }).class;
      if (className !== undefined) {
        spans.push({ text: source.slice(from, to), className });
      }
    });

    expect(spans).toEqual([
      { text: "alpha", className: "syntax-common-plain" },
      { text: "beta & gamma", className: "syntax-common-plain" },
    ]);
  });

  it("applies the same treatment to plaintext and txt aliases", () => {
    for (const fence of ["plaintext", "txt"]) {
      const source = `\`\`\`${fence}\nliteral <not syntax>\n\`\`\``;
      const state = EditorState.create({ doc: source });
      const view = { state } as EditorView;
      const decorations = buildSyntaxDecorations(view, registry());
      const texts: string[] = [];

      decorations.between(0, state.doc.length, (from, to, decoration) => {
        if ((decoration.spec as { class?: string }).class === "syntax-common-plain") {
          texts.push(source.slice(from, to));
        }
      });

      expect(texts).toEqual(["literal <not syntax>"]);
    }
  });
});
