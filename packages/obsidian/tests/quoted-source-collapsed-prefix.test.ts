// @vitest-environment happy-dom

import {
  EditorState,
  StateField,
  type Extension,
  type Text,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
} from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

import { buildEditorBlockModel } from "../src/editor-block-model";
import { createEditorHighlighter } from "../src/editor";
import { LanguageRegistry } from "../src/languages";
import { DEFAULT_SETTINGS } from "../src/settings";

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

function settings() {
  const value = structuredClone(DEFAULT_SETTINGS);
  value.markdownEditor = true;
  value.lineNumbers = true;
  return value;
}

function quotedPrefixRanges(doc: Text): DecorationSet {
  const ranges = [];
  for (let number = 1; number <= doc.lines; number += 1) {
    const line = doc.line(number);
    if (line.text.startsWith("> ")) {
      ranges.push(Decoration.replace({}).range(line.from, line.from + 2));
    } else if (line.text === ">") {
      ranges.push(Decoration.replace({}).range(line.from, line.from + 1));
    }
  }
  return Decoration.set(ranges, true);
}

function prefixReplacementField() {
  return StateField.define<DecorationSet>({
    create: (state) => quotedPrefixRanges(state.doc),
    update: (value, transaction) =>
      transaction.docChanged ? quotedPrefixRanges(transaction.newDoc) : value,
    provide: (field) => EditorView.decorations.from(field),
  });
}

function fullLineReplacementField(text: string) {
  return StateField.define<DecorationSet>({
    create(state) {
      const ranges = [];
      for (let number = 1; number <= state.doc.lines; number += 1) {
        const line = state.doc.line(number);
        if (line.text === text) {
          ranges.push(Decoration.replace({}).range(line.from, line.to));
        }
      }
      return Decoration.set(ranges, true);
    },
    update: (value) => value,
    provide: (field) => EditorView.decorations.from(field),
  });
}

function mount(
  source: string,
  extraExtensions: readonly Extension[],
): { view: EditorView; languages: LanguageRegistry } {
  const currentSettings = settings();
  const languages = new LanguageRegistry(
    currentSettings,
    () => Promise.resolve(""),
  );
  const parent = document.body.appendChild(document.createElement("div"));
  const view = new EditorView({
    state: EditorState.create({
      doc: source,
      extensions: [
        ...extraExtensions,
        createEditorHighlighter(languages, () => currentSettings),
      ],
    }),
    parent,
  });
  views.push(view);
  return { view, languages };
}

function positionVisible(view: EditorView, position: number): boolean {
  return view.visibleRanges.some(
    ({ from, to }) => position >= from && position < to,
  );
}

function rangesOverlap(
  view: EditorView,
  from: number,
  to: number,
): boolean {
  return view.visibleRanges.some(
    (range) => from < range.to && to > range.from,
  );
}

function lineContaining(view: EditorView, text: string): HTMLElement {
  const line = [...view.dom.querySelectorAll<HTMLElement>(".cm-line")]
    .find((candidate) => candidate.textContent?.includes(text));
  if (line === undefined) throw new Error(`Missing rendered line containing ${text}`);
  return line;
}

describe("quoted source with collapsed Markdown prefixes", () => {
  it("materializes quoted surface from viewport even when lineFrom is hidden", () => {
    const source = [
      "> [!task] PowerShell",
      "> ```powershell",
      "> $foo = 42",
      "> Write-Host $foo",
      "> ```",
      "",
      "> [!note] Text",
      "> ```text-center-justified",
      "> alpha beta gamma",
      "> ```",
    ].join("\n");
    const { view, languages } = mount(source, [prefixReplacementField()]);
    const model = buildEditorBlockModel(source, languages, true);
    const powershell = model.blocks.find(
      ({ block }) => block.language === "powershell",
    )!;
    const body = powershell.block.bodyLines[0]!;

    expect(positionVisible(view, body.lineFrom)).toBe(false);
    expect(body.lineFrom).toBeGreaterThanOrEqual(view.viewport.from);
    expect(body.lineFrom).toBeLessThanOrEqual(view.viewport.to);
    expect(rangesOverlap(view, body.sourceFrom, body.sourceTo)).toBe(true);

    const psLine = lineContaining(view, "$foo = 42");
    expect(psLine.classList.contains("syntax-editor-code-source")).toBe(true);
    expect(psLine.classList.contains("syntax-editor-code-source-body")).toBe(true);
    expect(psLine.querySelector(".syntax-common-variable")).not.toBeNull();
    expect(psLine.querySelector(".syntax-editor-line-number")).not.toBeNull();
    for (const token of psLine.querySelectorAll<HTMLElement>("[class*='syntax-common-']")) {
      expect(token.textContent).not.toContain(">");
    }

    const textLine = lineContaining(view, "alpha beta gamma");
    expect(textLine.classList.contains("syntax-editor-code-source")).toBe(true);
    expect(textLine.classList.contains("syntax-presentational")).toBe(true);
    expect(textLine.classList.contains("syntax-presentation-align-center")).toBe(true);
    expect(textLine.classList.contains("syntax-presentation-flow-justified")).toBe(true);
  });

  it("does not add source surface to a fully replaced quoted body line", () => {
    const hidden = "> $foo = 42";
    const source = [
      "> [!task] PowerShell",
      "> ```powershell",
      hidden,
      "> ```",
    ].join("\n");
    const { view } = mount(source, [fullLineReplacementField(hidden)]);

    expect(
      view.dom.querySelectorAll(".cm-line.syntax-editor-code-source-body"),
    ).toHaveLength(0);
  });

  it("keeps surface on a logically blank quoted body line when only its prefix is hidden", () => {
    const source = [
      "> [!task] PowerShell",
      "> ```powershell",
      "> ",
      "> ```",
    ].join("\n");
    const { view, languages } = mount(source, [prefixReplacementField()]);
    const model = buildEditorBlockModel(source, languages, true);
    const body = model.blocks[0]!.block.bodyLines[0]!;

    expect(body.sourceFrom).toBe(body.sourceTo);
    expect(
      view.dom.querySelectorAll(".cm-line.syntax-editor-code-source-body"),
    ).toHaveLength(1);
  });

  it("does not add quoted source surface to a top-level block", () => {
    const source = [
      "```powershell",
      "$foo = 42",
      "```",
    ].join("\n");
    const { view } = mount(source, [prefixReplacementField()]);

    expect(view.dom.querySelector(".cm-line.syntax-editor-code-source")).toBeNull();
  });
});
