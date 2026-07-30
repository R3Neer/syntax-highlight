// @vitest-environment happy-dom

import { defaultKeymap, history, undo } from "@codemirror/commands";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "../src/settings";
import { createSmartEditingExtensions } from "../src/smart-edit";

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

function editor(
  documentText: string,
  selection: EditorSelection = EditorSelection.create([
    EditorSelection.cursor(documentText.length),
  ]),
): EditorView {
  const settings = structuredClone(DEFAULT_SETTINGS);
  const parent = document.body.appendChild(document.createElement("div"));
  const state = EditorState.create({
    doc: documentText,
    selection,
    extensions: [
      history(),
      EditorState.allowMultipleSelections.of(true),
      keymap.of(defaultKeymap),
      ...createSmartEditingExtensions(
        (current) => ({
          from: 0,
          to: current.doc.length,
          languageId: "mud",
        }),
        () => settings,
      ),
    ],
  });
  const view = new EditorView({ state, parent });
  views.push(view);
  return view;
}

function typeCharacter(view: EditorView, character: string): boolean {
  const range = view.state.selection.main;
  return view.state
    .facet(EditorView.inputHandler)
    .some((handler) =>
      handler(view, range.from, range.to, character, () =>
        view.state.update({
          changes: { from: range.from, to: range.to, insert: character },
        }),
      ),
    );
}

function press(view: EditorView, key: string): boolean {
  for (const bindings of view.state.facet(keymap)) {
    const binding = bindings.find((candidate) => candidate.key === key);
    if (binding?.run?.(view)) return true;
  }
  return false;
}

describe("smart editing integration", () => {
  it("closes ordinary pairs and deletes an empty pair together", () => {
    const view = editor("");
    expect(typeCharacter(view, "{")).toBe(true);
    expect(view.state.doc.toString()).toBe("{}");
    expect(view.state.selection.main.from).toBe(1);
    expect(press(view, "Backspace")).toBe(true);
    expect(view.state.doc.toString()).toBe("");
  });

  it("indents inside an empty pair before Obsidian's default Enter", () => {
    const view = editor("");
    expect(typeCharacter(view, "{")).toBe(true);
    expect(press(view, "Enter")).toBe(true);
    expect(view.state.doc.toString()).toBe("{\n    \n}");
    expect(view.state.selection.main.from).toBe(6);
  });

  it("creates MUD multiline string and comment skeletons", () => {
    const strings = editor("");
    expect(typeCharacter(strings, '"')).toBe(true);
    expect(typeCharacter(strings, '"')).toBe(true);
    expect(typeCharacter(strings, '"')).toBe(true);
    expect(strings.state.doc.toString()).toBe('"""\n    \n"""');

    const comments = editor("");
    for (const character of "###") {
      if (!typeCharacter(comments, character)) {
        comments.dispatch(
          comments.state.replaceSelection(character),
        );
      }
    }
    expect(comments.state.doc.toString()).toBe("###\n    \n###");
  });

  it("continues and exits an empty MUD line comment", () => {
    const view = editor("# note");
    expect(press(view, "Enter")).toBe(true);
    expect(view.state.doc.toString()).toBe("# note\n# ");
    expect(press(view, "Enter")).toBe(true);
    expect(view.state.doc.toString()).toBe("# note\n");
  });

  it("wraps every independent selection", () => {
    const selection = EditorSelection.create([
      EditorSelection.range(0, 1),
      EditorSelection.range(2, 3),
    ]);
    const view = editor("a b", selection);
    expect(typeCharacter(view, '"')).toBe(true);
    expect(view.state.doc.toString()).toBe('"a" "b"');
    expect(view.state.selection.ranges).toHaveLength(2);
  });

  it("undoes retroactive wrapping as one transaction", () => {
    const view = editor("1..4");
    expect(typeCharacter(view, ")")).toBe(true);
    expect(view.state.doc.toString()).toBe("[1..4)");
    expect(undo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("1..4");
  });
});
