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

const BODY = [
  "$foo = 42",
  '$message = "hello"',
  "Write-Host $foo",
  "# comment",
].join("\n");

describe("PowerShell semantic bridge", () => {
  it("maps PowerShell semantic categories to distinct Reading roles", () => {
    const language = commonLanguageByFence("powershell");
    expect(language).toBeDefined();
    const container = document.createElement("div");

    renderCommonCode(BODY, container, language!);

    expect(classForRenderedText(container, "$foo")).toContain("syntax-common-variable");
    expect(classForRenderedText(container, "42")).toContain("syntax-common-number");
    expect(classForRenderedText(container, "=")).toContain("syntax-common-operator");
    expect(classForRenderedText(container, '"hello"')).toContain("syntax-common-string");
    expect(classForRenderedText(container, "# comment")).toContain("syntax-common-comment");
    expect(classForRenderedText(container, "Write-Host")).toContain("syntax-common-callable");
    expect(classForRenderedText(container, "$foo")).not.toContain("token ");
  });

  it("maps the same PowerShell semantics to plugin roles inside a quoted fence", () => {
    const source = [
      "> [!task] PowerShell",
      "> ```powershell",
      ...BODY.split("\n").map((line) => `> ${line}`),
      "> ```",
    ].join("\n");
    const marks = editorMarks(source);

    expect(marks.get("$foo")?.some((value) => value.includes("syntax-common-variable"))).toBe(true);
    expect(marks.get("42")?.some((value) => value.includes("syntax-common-number"))).toBe(true);
    expect(marks.get("=")?.some((value) => value.includes("syntax-common-operator"))).toBe(true);
    expect(marks.get('"hello"')?.some((value) => value.includes("syntax-common-string"))).toBe(true);
    expect(marks.get("# comment")?.some((value) => value.includes("syntax-common-comment"))).toBe(true);
    expect(marks.get("Write-Host")?.some((value) => value.includes("syntax-common-callable"))).toBe(true);
    expect(
      [...marks.values()].flat().some((value) => /(?:^|\s)cm-/.test(value)),
    ).toBe(false);
  });
});
