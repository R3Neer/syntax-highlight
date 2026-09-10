// @vitest-environment happy-dom

import { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";

import { commonLanguageByFence } from "../src/common-languages";
import { buildSyntaxDecorations } from "../src/editor";
import { LanguageRegistry } from "../src/languages";
import { renderCommonCode } from "../src/reading";
import { DEFAULT_SETTINGS } from "../src/settings";

function registry(): LanguageRegistry {
  return new LanguageRegistry(
    structuredClone(DEFAULT_SETTINGS),
    () => Promise.resolve(""),
  );
}

function classForRenderedText(container: HTMLElement, text: string): string {
  const match = [...container.querySelectorAll<HTMLElement>(".syntax-code-line-content > span")]
    .find((element) => element.textContent === text);
  return match?.className ?? "";
}

function editorMarks(source: string): Map<string, string[]> {
  const state = EditorState.create({ doc: source });
  const view = { state } as EditorView;
  const decorations = buildSyntaxDecorations(view, registry(), true);
  const marks = new Map<string, string[]>();
  decorations.between(0, state.doc.length, (from, to, decoration) => {
    if (from === to) return;
    const className = (decoration.spec as { class?: string }).class;
    if (className === undefined) return;
    const text = source.slice(from, to);
    marks.set(text, [...(marks.get(text) ?? []), className]);
  });
  return marks;
}

describe("PowerShell semantic bridge", () => {
  it("maps PowerShell variables, numbers, operators and builtins to distinct Reading classes", () => {
    const language = commonLanguageByFence("powershell");
    expect(language).toBeDefined();
    const container = document.createElement("div");

    renderCommonCode("$foo = 42\nWrite-Host $foo", container, language!);

    expect(classForRenderedText(container, "$foo")).toContain("token variable");
    expect(classForRenderedText(container, "42")).toContain("token number");
    expect(classForRenderedText(container, "=")).toContain("token operator");
    expect(classForRenderedText(container, "Write-Host")).toContain("token builtin");
    expect(classForRenderedText(container, "Write-Host")).toContain("syntax-common-callable");
  });

  it("maps the same PowerShell semantics to CodeMirror-compatible classes inside a quoted fence", () => {
    const source = [
      "> [!task] PowerShell",
      "> ```powershell",
      "> $foo = 42",
      "> Write-Host $foo",
      "> ```",
    ].join("\n");
    const marks = editorMarks(source);

    expect(marks.get("$foo")?.some((value) => value.includes("cm-variable"))).toBe(true);
    expect(marks.get("42")?.some((value) => value.includes("cm-number"))).toBe(true);
    expect(marks.get("=")?.some((value) => value.includes("cm-operator"))).toBe(true);
    expect(marks.get("Write-Host")?.some((value) => value.includes("cm-builtin"))).toBe(true);
    expect(marks.get("Write-Host")?.some((value) => value.includes("syntax-common-callable"))).toBe(true);
  });
});
