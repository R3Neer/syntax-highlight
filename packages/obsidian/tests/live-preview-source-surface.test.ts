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

function lineClasses(source: string): Map<number, string[]> {
  const state = EditorState.create({ doc: source });
  const view = { state } as EditorView;
  const decorations = buildSyntaxDecorations(view, registry(), true);
  const result = new Map<number, string[]>();
  decorations.between(0, state.doc.length, (from, to, decoration) => {
    if (from !== to) return;
    const className = (decoration.spec as { attributes?: { class?: string } })
      .attributes?.class;
    if (className === undefined) return;
    result.set(from, [...(result.get(from) ?? []), className]);
  });
  return result;
}

function joinedAt(classes: Map<number, string[]>, position: number): string {
  return (classes.get(position) ?? []).join(" ");
}

describe("Live Preview quoted source surface", () => {
  it("adds the host code-block surface contract to quoted opening, body and closing lines", () => {
    const source = [
      "> [!task] PowerShell",
      "> ```powershell",
      "> $foo = 42",
      "> Write-Host $foo",
      "> ```",
    ].join("\n");
    const state = EditorState.create({ doc: source });
    const classes = lineClasses(source);

    const opening = joinedAt(classes, state.doc.line(2).from);
    const body1 = joinedAt(classes, state.doc.line(3).from);
    const body2 = joinedAt(classes, state.doc.line(4).from);
    const closing = joinedAt(classes, state.doc.line(5).from);

    expect(opening).toContain("syntax-quoted-code-source");
    expect(opening).toContain("HyperMD-codeblock");
    expect(opening).toContain("HyperMD-codeblock-begin-bg");

    for (const body of [body1, body2]) {
      expect(body).toContain("syntax-quoted-code-source");
      expect(body).toContain("HyperMD-codeblock");
      expect(body).toContain("HyperMD-codeblock-bg");
    }

    expect(closing).toContain("syntax-quoted-code-source");
    expect(closing).toContain("HyperMD-codeblock");
    expect(closing).toContain("HyperMD-codeblock-end-bg");
  });

  it("does not duplicate host surface decorations on top-level fences", () => {
    const source = [
      "```powershell",
      "$foo = 42",
      "Write-Host $foo",
      "```",
    ].join("\n");
    const classes = [...lineClasses(source).values()].flat().join(" ");

    expect(classes).not.toContain("syntax-quoted-code-source");
    expect(classes).not.toContain("HyperMD-codeblock-bg");
  });
});
