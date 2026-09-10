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

function widgetCount(source: string, lineNumbers = true): number {
  const state = EditorState.create({ doc: source });
  const view = { state } as EditorView;
  const decorations = buildSyntaxDecorations(view, registry(), lineNumbers);
  let count = 0;
  decorations.between(0, state.doc.length, (_from, _to, decoration) => {
    if ((decoration.spec as { widget?: unknown }).widget !== undefined) count += 1;
  });
  return count;
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

  it("never adds line-number widgets to Text aliases even when globally enabled", () => {
    for (const fence of ["text", "plaintext", "txt"]) {
      const source = `\`\`\`${fence}\nuno\ndos\n\`\`\``;
      expect(widgetCount(source, true)).toBe(0);
    }
  });

  it("adds presentational line classes only to Text body lines", () => {
    const source = "before\n```text-right-justified\none two three\nfour five six\n```\nafter";
    const state = EditorState.create({ doc: source });
    const view = { state } as EditorView;
    const decorations = buildSyntaxDecorations(view, registry(), true);
    const lineClasses: Array<{ position: number; className: string }> = [];
    decorations.between(0, state.doc.length, (from, to, decoration) => {
      const attributes = (decoration.spec as { attributes?: { class?: string } }).attributes;
      if (from === to && attributes?.class?.includes("syntax-presentational")) {
        lineClasses.push({ position: from, className: attributes.class });
      }
    });

    expect(lineClasses).toHaveLength(2);
    expect(lineClasses.every(({ className }) =>
      className.includes("syntax-presentation-family-text") &&
      className.includes("syntax-presentation-align-right") &&
      className.includes("syntax-presentation-flow-justified")
    )).toBe(true);
  });

  it("suppresses line-number widgets for Markdown while keeping code languages unchanged", () => {
    expect(widgetCount("```markdown\n# one\n## two\n```", true)).toBe(0);
    expect(widgetCount("```md-right-ragged\n# one\n## two\n```", true)).toBe(0);
    expect(widgetCount("```powershell\nGet-ChildItem\nWrite-Host hi\n```", true)).toBe(2);
  });

  it("keeps line-number widgets for actual code blocks", () => {
    const source = "```bash\necho uno\necho dos\n```";
    expect(widgetCount(source, true)).toBe(2);
  });
});
