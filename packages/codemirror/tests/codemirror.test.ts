import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { decorationsForDocument, formatChanges } from "../src";

describe("CodeMirror adapter", () => {
  it("creates ranges and format changes without depending on Obsidian", () => {
    const decorations = decorationsForDocument({
      schemaVersion: 1,
      languageId: "demo",
      languageVersion: "1.0.0",
      source: "word",
      spans: [{ from: 0, to: 4, categoryId: "keyword" }],
      diagnostics: [],
    });
    const state = EditorState.create({ doc: "word" });
    expect(decorations.size).toBe(1);
    expect(state.update({ changes: formatChanges({
      source: "word",
      formatted: "word!",
      edits: [{ from: 4, to: 4, insert: "!" }],
      diagnostics: [],
    }) }).state.doc.toString()).toBe("word!");
  });
});
