// @vitest-environment happy-dom

import { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";

import { commonSemanticRanges } from "../src/common-semantic-ranges";
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

function semanticRoles(className: string): string[] {
  return className
    .split(/\s+/)
    .filter((value) => value.startsWith("syntax-common-"));
}

function expectedRoles(fence: string, source: string): Set<string> {
  const language = commonLanguageByFence(fence);
  if (language === undefined) throw new Error(`Missing ${fence}`);
  return new Set(
    commonSemanticRanges(language, source)
      .flatMap(({ classes }) => semanticRoles(classes)),
  );
}

function renderedRoles(fence: string, source: string): Set<string> {
  const language = commonLanguageByFence(fence)!;
  const container = document.createElement("div");
  renderCommonCode(source, container, language);
  return new Set(
    [...container.querySelectorAll<HTMLElement>("[class*='syntax-common-']")]
      .flatMap((element) => semanticRoles(element.className)),
  );
}

function quotedEditorMarks(fence: string, body: string) {
  const source = [
    "> [!task] Common",
    `> \`\`\`${fence}`,
    ...body.split("\n").map((line) => `> ${line}`),
    "> ```",
  ].join("\n");
  const state = EditorState.create({ doc: source });
  const view = { state } as EditorView;
  const decorations = buildSyntaxDecorations(view, registry(), true);
  const marks: Array<{ from: number; to: number; text: string; classes: string }> = [];

  decorations.between(0, state.doc.length, (from, to, decoration) => {
    if (from === to) return;
    const classes = (decoration.spec as { class?: string }).class;
    if (classes === undefined || !classes.includes("syntax-common-")) return;
    marks.push({ from, to, text: source.slice(from, to), classes });
  });
  return { source, marks };
}

describe("common semantic consumers", () => {
  it("keeps Bash semantic roles aligned between the semantic engine and rendered DOM", () => {
    const body = ['name="world"', 'echo "$name"', "# comment"].join("\n");

    expect(renderedRoles("bash", body)).toEqual(expectedRoles("bash", body));
  });

  it("maps the same Bash roles into quoted Markdown source without decorating quote prefixes", () => {
    const body = ['name="world"', 'echo "$name"', "# comment"].join("\n");
    const expected = expectedRoles("bash", body);
    const { source, marks } = quotedEditorMarks("bash", body);
    const actual = new Set(
      marks.flatMap(({ classes }) => semanticRoles(classes)),
    );

    expect(actual).toEqual(expected);
    expect(marks.length).toBeGreaterThan(0);
    for (const mark of marks) {
      expect(mark.text).not.toContain("\n>");
      expect(mark.text.startsWith(">") || mark.text.startsWith(" >")).toBe(false);
      expect(source.slice(mark.from, mark.to)).toBe(mark.text);
    }
  });

  it("does not add Prism or CodeMirror compatibility classes in either manual consumer", () => {
    const body = 'echo "$HOME"';
    const language = commonLanguageByFence("bash")!;
    const container = document.createElement("div");
    renderCommonCode(body, container, language);
    const renderedClasses = [...container.querySelectorAll<HTMLElement>("span")]
      .map((element) => element.className)
      .join(" ");
    const { marks } = quotedEditorMarks("bash", body);
    const editorClasses = marks.map(({ classes }) => classes).join(" ");

    expect(renderedClasses).not.toMatch(/(?:^|\s)token\s/);
    expect(editorClasses).not.toMatch(/(?:^|\s)cm-/);
  });
});
