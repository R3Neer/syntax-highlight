import { describe, expect, it } from "vitest";
import { NotebookDocument, notebookText } from "../src/notebook";
import { notebookEditorState } from "../src/notebook-editor";
import { EditorView } from "@codemirror/view";
import { ensureSyntaxTree } from "@codemirror/language";

const fixture = {
  nbformat: 4, nbformat_minor: 5, metadata: { kernelspec: { language: "python" }, custom: { intact: true } },
  extra: ["preserved"], cells: [
    { cell_type: "code", id: "code1", source: ["print(1)\n"], metadata: { tags: ["tag"] }, execution_count: 7,
      outputs: [{ output_type: "stream", name: "stdout", text: ["1\n"] }] },
    { cell_type: "markdown", id: "md", source: "# Title", metadata: {}, attachments: { image: { "image/png": "YWJj" } } },
    { cell_type: "raw", source: [], metadata: { format: "custom" } },
    { cell_type: "future", source: ["opaque"], vendor: { field: true } },
  ],
};
describe("notebook preservation", () => {
  it("preserves raw bytes until a source changes, including CRLF and unusual indentation", () => {
    const raw = JSON.stringify(fixture, null, 1).replace(/\n/g, "\r\n") + "\r\n";
    const doc = new NotebookDocument(raw);
    expect(doc.language).toBe("python");
    doc.setSource(0, "print(1)\n");
    expect(doc.serialize()).toBe(raw);
  });
  it("edits only cell sources and preserves outputs, execution counts, IDs, attachments and unknown fields", () => {
    const doc = new NotebookDocument(JSON.stringify(fixture));
    doc.setSource(0, "print(2)\n# end"); doc.setSource(1, "# Edited"); doc.setSource(2, "raw text");
    const actual = JSON.parse(doc.serialize());
    const expected = structuredClone(fixture);
    expected.cells[0].source = ["print(2)\n", "# end"];
    expected.cells[1].source = "# Edited";
    expected.cells[2].source = ["raw text"];
    expect(actual).toEqual(expected);
    expect(notebookText(actual.cells[0].source)).toBe("print(2)\n# end");
    expect(() => doc.setSource(3, "changed")).toThrow("not editable");
  });
  it("rejects malformed or unsupported notebook formats without creating a writable document", () => {
    for (const raw of ["{", "[]", '{"nbformat":3,"cells":[]}', '{"nbformat":4,"cells":[{"cell_type":"code","source":[12]}]}']) {
      expect(() => new NotebookDocument(raw)).toThrow();
    }
  });
  it("does not guess Python over an explicit different language", () => {
    const other = { ...fixture, metadata: { language_info: { name: "julia" } } };
    expect(new NotebookDocument(JSON.stringify(other)).language).toBe("julia");
  });
});
describe("notebook cell editing", () => {
  it("highlights Python and reports edits to the caller without executing cell code", () => {
    const edits: string[] = [];
    const parent = document.body.appendChild(document.createElement("div"));
    const view = new EditorView({ parent, state: notebookEditorState("def f():\n    return 2", "python", true, true, (text) => edits.push(text), () => {}) });
    try {
      ensureSyntaxTree(view.state, view.state.doc.length, 100); view.dispatch({});
      expect(view.dom.querySelector(".syntax-common-keyword")).not.toBeNull();
      expect(edits).toEqual([]);
      view.dispatch({ changes: { from: view.state.doc.length, insert: "\n# edit" } });
      expect(edits).toEqual(["def f():\n    return 2\n# edit"]);
    } finally { view.destroy(); parent.remove(); }
  });
  it("keeps reading mode noneditable and suppresses save callbacks on programmatic changes", () => {
    const changes: string[] = [];
    const parent = document.body.appendChild(document.createElement("div"));
    const view = new EditorView({ parent, state: notebookEditorState("x = 1", "python", false, false, (text) => changes.push(text), () => {}) });
    try {
      expect(view.contentDOM.getAttribute("contenteditable")).toBe("false");
      view.dispatch({ changes: { from: 0, to: 5, insert: "x = 2" } });
      expect(changes).toEqual([]);
    } finally { view.destroy(); parent.remove(); }
  });
});
