// @vitest-environment happy-dom

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildSyntaxDecorations,
  createMarkdownEditorExtensions,
} from "../src/editor";
import { LanguageRegistry } from "../src/languages";
import { DEFAULT_SETTINGS } from "../src/settings";

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

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

function mountedEditor(source: string): EditorView {
  const settings = structuredClone(DEFAULT_SETTINGS);
  const languages = new LanguageRegistry(settings, () => Promise.resolve(""));
  const parent = document.body.appendChild(document.createElement("div"));
  const state = EditorState.create({
    doc: source,
    extensions: createMarkdownEditorExtensions(languages, () => settings),
  });
  const view = new EditorView({ state, parent });
  views.push(view);
  return view;
}

function sourceLineAt(view: EditorView, lineNumber: number): HTMLElement {
  const position = view.state.doc.line(lineNumber).from;
  const { node } = view.domAtPos(position);
  const origin = node instanceof Element ? node : node.parentElement;
  const line = origin?.closest<HTMLElement>(".cm-line");
  if (line === null || line === undefined) {
    throw new Error(`Missing editor DOM line at document line ${lineNumber}`);
  }
  return line;
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

  it("materializes quoted PowerShell surface classes on actual EditorView lines", () => {
    const view = mountedEditor([
      "> [!task] PowerShell",
      "> ```powershell",
      "> $foo = 42",
      "> Write-Host $foo",
      "> ```",
    ].join("\n"));

    const opening = sourceLineAt(view, 2);
    const body = sourceLineAt(view, 3);
    const closing = sourceLineAt(view, 5);

    expect(opening.classList.contains("syntax-quoted-code-source")).toBe(true);
    expect(opening.classList.contains("HyperMD-codeblock-begin-bg")).toBe(true);
    expect(body.classList.contains("HyperMD-codeblock")).toBe(true);
    expect(body.classList.contains("HyperMD-codeblock-bg")).toBe(true);
    expect(closing.classList.contains("HyperMD-codeblock-end-bg")).toBe(true);
  });

  it("merges Text presentation and quoted host surface classes on the same DOM lines", () => {
    const view = mountedEditor([
      "> [!task] Text",
      "> ```text-center-justified",
      "> alpha beta gamma",
      "> ```",
    ].join("\n"));

    const body = sourceLineAt(view, 3);
    expect(body.classList.contains("syntax-quoted-code-source")).toBe(true);
    expect(body.classList.contains("HyperMD-codeblock-bg")).toBe(true);
    expect(body.classList.contains("syntax-presentational")).toBe(true);
    expect(body.classList.contains("syntax-presentation-align-center")).toBe(true);
    expect(body.classList.contains("syntax-presentation-flow-justified")).toBe(true);
  });
});
