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

function typeText(view: EditorView, text: string): void {
  for (const character of text) {
    if (!typeCharacter(view, character)) {
      view.dispatch(view.state.replaceSelection(character));
    }
  }
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

  it("formats a block header and splits its empty braces on Enter", () => {
    const source = "thing  A{}";
    const view = editor(
      source,
      EditorSelection.create([EditorSelection.cursor(source.indexOf("}"))]),
    );
    expect(press(view, "Enter")).toBe(true);
    expect(view.state.doc.toString()).toBe("thing A {\n    \n}");
    expect(view.state.selection.main.from).toBe("thing A {\n    ".length);
  });

  it("normalizes the current MUD instruction when typing a semicolon", () => {
    const view = editor('    mut  title :Text= "Alexandria" ');
    expect(typeCharacter(view, ";")).toBe(true);
    expect(view.state.doc.toString()).toBe(
      '    mut title: Text = "Alexandria";',
    );
  });

  it("removes an interior space when skipping an automatic closer", () => {
    const source = "call(a, )";
    const view = editor(
      source,
      EditorSelection.create([EditorSelection.cursor(source.indexOf(")"))]),
    );
    expect(typeCharacter(view, ")")).toBe(true);
    expect(view.state.doc.toString()).toBe("call(a,)");
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

  it("does not auto-close apostrophes in MUD", () => {
    const view = editor("");
    typeText(view, "'");
    expect(view.state.doc.toString()).toBe("'");
  });

  it("undoes retroactive wrapping as one transaction", () => {
    const view = editor("1..4");
    expect(typeCharacter(view, ")")).toBe(true);
    expect(view.state.doc.toString()).toBe("[1..4)");
    expect(undo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("1..4");
  });

  it("adds the mandatory space before a MUD block brace", () => {
    const view = editor("expression");
    expect(typeCharacter(view, "{")).toBe(true);
    expect(view.state.doc.toString()).toBe("expression {}");
    expect(view.state.selection.main.from).toBe("expression {".length);
  });

  it("spaces commas and declaration colons", () => {
    const argumentsView = editor(
      "call(a)",
      EditorSelection.create([EditorSelection.cursor("call(a".length)]),
    );
    typeText(argumentsView, ",b");
    expect(argumentsView.state.doc.toString()).toBe("call(a, b)");

    const declaration = editor("value");
    typeText(declaration, ":Text");
    expect(declaration.state.doc.toString()).toBe("value: Text");
  });

  it("composes and spaces multi-character operators", () => {
    const assignment = editor("value");
    typeText(assignment, ":=other");
    expect(assignment.state.doc.toString()).toBe("value := other");

    const comparison = editor("left");
    typeText(comparison, "==right");
    expect(comparison.state.doc.toString()).toBe("left == right");

    const mapping = editor("Key");
    typeText(mapping, "->Value");
    expect(mapping.state.doc.toString()).toBe("Key -> Value");
  });

  it("distinguishes binary signs from prefix signs", () => {
    const binary = editor("left");
    typeText(binary, "-right");
    expect(binary.state.doc.toString()).toBe("left - right");

    const prefix = editor("then ");
    typeText(prefix, "-value");
    expect(prefix.state.doc.toString()).toBe("then -value");
  });

  it("keeps intervals, point forms and unit divisions compact", () => {
    const interval = editor("1");
    typeText(interval, "..4");
    expect(interval.state.doc.toString()).toBe("1..4");

    const point = editor("12");
    typeText(point, ":30");
    expect(point.state.doc.toString()).toBe("12:30");

    const quantity = editor("10 m");
    typeText(quantity, "/s");
    expect(quantity.state.doc.toString()).toBe("10 m/s");
  });

  it("does not insert smart spaces in text or comments", () => {
    const text = editor(
      '"ab"',
      EditorSelection.create([EditorSelection.cursor(2)]),
    );
    typeText(text, ",");
    expect(text.state.doc.toString()).toBe('"a,b"');

    const comment = editor("# expression");
    typeText(comment, "{");
    expect(comment.state.doc.toString()).toBe("# expression{}");
  });
});
