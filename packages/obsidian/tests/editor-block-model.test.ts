// @vitest-environment happy-dom

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildEditorBlockModel,
  buildEditorBlockSemantics,
} from "../src/editor-block-model";
import {
  buildSyntaxDecorations,
  createEditorHighlighter,
} from "../src/editor";
import { LanguageRegistry } from "../src/languages";
import { DEFAULT_SETTINGS } from "../src/settings";

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

function settings() {
  return structuredClone(DEFAULT_SETTINGS);
}

function registry() {
  return new LanguageRegistry(settings(), () => Promise.resolve(""));
}

function fakeView(source: string, from: number, to: number): EditorView {
  const state = EditorState.create({ doc: source });
  return {
    state,
    visibleRanges: [{ from, to }],
    dom: document.createElement("div"),
  } as unknown as EditorView;
}

function tomlRuntime(languages: LanguageRegistry) {
  const runtime = languages.byFence("toml");
  if (runtime === undefined) throw new Error("Expected built-in TOML runtime");
  return runtime;
}

describe("Markdown editor block model", () => {
  it("discovers top-level and quoted blocks without DOM ownership", () => {
    const source = [
      "```toml",
      "top = 1",
      "```",
      "",
      "> [!task] quoted",
      "> ```powershell",
      "> $foo = 42",
      "> ```",
    ].join("\n");

    const model = buildEditorBlockModel(source, registry(), true);

    expect(model.blocks).toHaveLength(2);
    expect(model.blocks[0]?.block.quoteDepth).toBe(0);
    expect(model.blocks[1]?.block.quoteDepth).toBe(1);
    expect(model.blocks[1]?.block.body).toBe("$foo = 42");
  });

  it("does not tokenize a configured block outside the supplied viewport", () => {
    const source = [
      "```toml",
      "first = 1",
      "```",
      "",
      "padding",
      "padding",
      "padding",
      "",
      "```toml",
      "second = 2",
      "```",
    ].join("\n");
    const languages = registry();
    const runtime = tomlRuntime(languages);
    const tokenize = vi.spyOn(runtime, "tokenize");
    const firstBlockEnd = source.indexOf("```", 3) + 3;

    buildSyntaxDecorations(
      fakeView(source, 0, firstBlockEnd),
      languages,
      true,
    );

    expect(tokenize).toHaveBeenCalledTimes(1);
    expect(tokenize).toHaveBeenCalledWith("first = 1");
  });

  it("parses the complete logical body when the viewport intersects only its middle", () => {
    const source = [
      "```toml",
      "first = 1",
      "second = 2",
      "third = 3",
      "```",
    ].join("\n");
    const languages = registry();
    const runtime = tomlRuntime(languages);
    const tokenize = vi.spyOn(runtime, "tokenize");
    const middle = source.indexOf("second = 2") + 2;

    buildSyntaxDecorations(
      fakeView(source, middle, middle + 3),
      languages,
      true,
    );

    expect(tokenize).toHaveBeenCalledTimes(1);
    expect(tokenize).toHaveBeenCalledWith(
      ["first = 1", "second = 2", "third = 3"].join("\n"),
    );
  });

  it("consolidates quoted surface and presentation into one line semantic", () => {
    const source = [
      "> [!task] Text",
      "> ```text-center-justified",
      "> alpha beta gamma",
      "> ```",
    ].join("\n");
    const model = buildEditorBlockModel(source, registry(), true);
    const resolved = model.blocks[0];
    expect(resolved).toBeDefined();

    const bodyFrom = resolved!.block.bodyLines[0]!.lineFrom;
    const bodySemantics = resolved!.lineSemantics.filter(({ from }) => from === bodyFrom);

    expect(bodySemantics).toHaveLength(1);
    expect(bodySemantics[0]?.classes).toEqual(expect.arrayContaining([
      "syntax-editor-code-source",
      "syntax-editor-code-source-body",
      "syntax-presentational",
      "syntax-presentation-align-center",
      "syntax-presentation-flow-justified",
    ]));
  });

  it("maps quoted semantic spans onto code text without including quote prefixes", () => {
    const source = [
      "> [!task] PowerShell",
      "> ```powershell",
      "> $foo = 42",
      "> Write-Host $foo",
      "> ```",
    ].join("\n");
    const model = buildEditorBlockModel(source, registry(), true);
    const spans = buildEditorBlockSemantics(model.blocks[0]!);

    expect(spans.length).toBeGreaterThan(0);
    for (const span of spans) {
      expect(source.slice(span.from, span.to)).not.toContain(">");
      expect(span.from).toBeGreaterThanOrEqual(
        model.blocks[0]!.block.bodyLines[0]!.sourceFrom,
      );
    }
  });
});

describe("Markdown editor semantic cache", () => {
  it("reuses semantics across selection updates and invalidates them on document changes", () => {
    const source = ["```toml", "value = 1", "```"].join("\n");
    const currentSettings = settings();
    const languages = new LanguageRegistry(currentSettings, () => Promise.resolve(""));
    const runtime = tomlRuntime(languages);
    const tokenize = vi.spyOn(runtime, "tokenize");
    const parent = document.body.appendChild(document.createElement("div"));
    const view = new EditorView({
      state: EditorState.create({
        doc: source,
        extensions: [createEditorHighlighter(languages, () => currentSettings)],
      }),
      parent,
    });
    views.push(view);

    expect(tokenize).toHaveBeenCalledTimes(1);

    view.dispatch({ selection: { anchor: source.indexOf("value") } });
    expect(tokenize).toHaveBeenCalledTimes(1);

    const one = view.state.doc.toString().indexOf("1");
    view.dispatch({ changes: { from: one, to: one + 1, insert: "2" } });
    expect(tokenize).toHaveBeenCalledTimes(2);
    expect(tokenize).toHaveBeenLastCalledWith("value = 2");
  });

  it("invalidates cached semantics when a language runtime revision changes", async () => {
    const source = ["```toml", "value = 1", "```"].join("\n");
    const currentSettings = settings();
    const languages = new LanguageRegistry(currentSettings, () => Promise.resolve(""));
    const runtime = tomlRuntime(languages);
    const tokenize = vi.spyOn(runtime, "tokenize");
    const parent = document.body.appendChild(document.createElement("div"));
    const view = new EditorView({
      state: EditorState.create({
        doc: source,
        extensions: [createEditorHighlighter(languages, () => currentSettings)],
      }),
      parent,
    });
    views.push(view);

    expect(tokenize).toHaveBeenCalledTimes(1);
    await languages.reload(runtime.settings.id);

    expect(tokenize).toHaveBeenCalledTimes(2);
  });
});
