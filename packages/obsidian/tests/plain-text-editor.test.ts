import { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";

import { buildMudDecorations, buildSyntaxDecorations } from "../src/editor";
import { LanguageRegistry } from "../src/languages";
import { DEFAULT_SETTINGS } from "../src/settings";

function registry(): LanguageRegistry {
  return new LanguageRegistry(
    structuredClone(DEFAULT_SETTINGS),
    () => Promise.resolve(""),
  );
}

function widgetPositions(source: string, lineNumbers = true): number[] {
  const state = EditorState.create({ doc: source });
  const view = { state } as EditorView;
  const decorations = buildSyntaxDecorations(view, registry(), lineNumbers);
  const positions: number[] = [];
  decorations.between(0, state.doc.length, (from, _to, decoration) => {
    if ((decoration.spec as { widget?: unknown }).widget !== undefined) positions.push(from);
  });
  return positions;
}

function widgetCount(source: string, lineNumbers = true): number {
  return widgetPositions(source, lineNumbers).length;
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

  it("applies Text presentation inside blockquotes without styling quote markers", () => {
    const source = [
      "> [!note]",
      "> ```text-center-justified",
      "> alpha beta",
      "> gamma delta",
      "> ```",
    ].join("\n");
    const state = EditorState.create({ doc: source });
    const view = { state } as EditorView;
    const decorations = buildSyntaxDecorations(view, registry(), true);
    const plainTexts: string[] = [];
    const presentationLines: number[] = [];

    decorations.between(0, state.doc.length, (from, to, decoration) => {
      const spec = decoration.spec as {
        class?: string;
        attributes?: { class?: string };
      };
      if (spec.class === "syntax-common-plain") plainTexts.push(source.slice(from, to));
      if (from === to && spec.attributes?.class?.includes("syntax-presentational")) {
        presentationLines.push(from);
      }
    });

    expect(plainTexts).toEqual(["alpha beta", "gamma delta"]);
    expect(plainTexts.every((text) => !text.includes(">"))).toBe(true);
    expect(presentationLines).toHaveLength(2);
    expect(widgetCount(source, true)).toBe(0);
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

  it("highlights parser-backed code inside callouts and anchors numbers after the quote prefix", () => {
    const source = [
      "> [!example]",
      "> ```powershell",
      "> $items = Get-ChildItem",
      "> Write-Host $items",
      "> ```",
    ].join("\n");
    const state = EditorState.create({ doc: source });
    const view = { state } as EditorView;
    const decorations = buildSyntaxDecorations(view, registry(), true);
    const highlighted: string[] = [];

    decorations.between(0, state.doc.length, (from, to, decoration) => {
      const className = (decoration.spec as { class?: string }).class;
      if (className?.includes("syntax-common-")) highlighted.push(source.slice(from, to));
    });

    expect(highlighted.length).toBeGreaterThan(0);
    expect(highlighted.every((text) => !text.includes(">"))).toBe(true);
    const positions = widgetPositions(source, true);
    expect(positions).toHaveLength(2);
    expect(positions.map((position) => source.slice(position - 2, position))).toEqual([
      "> ",
      "> ",
    ]);
  });

  it("maps MUD highlighting through quoted bodies without coloring quote markers", () => {
    const source = [
      "> ```mud",
      "> thing World {}",
      "> rule Ready { true }",
      "> ```",
    ].join("\n");
    const state = EditorState.create({ doc: source });
    const view = { state } as EditorView;
    const decorations = buildMudDecorations(view);
    const marked: string[] = [];

    decorations.between(0, state.doc.length, (from, to, decoration) => {
      if ((decoration.spec as { class?: string }).class !== undefined) {
        marked.push(source.slice(from, to));
      }
    });

    expect(marked.length).toBeGreaterThan(0);
    expect(marked.every((text) => !text.includes(">"))).toBe(true);
  });
});
