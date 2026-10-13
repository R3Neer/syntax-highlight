// @vitest-environment happy-dom

import { history, undo } from "@codemirror/commands";
import { EditorSelection, EditorState, Prec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMarkdownEditorExtensions } from "../src/editor";
import { LanguageRegistry } from "../src/languages";
import { DEFAULT_SETTINGS } from "../src/settings";
import { createSmartEditingExtensions } from "../src/smart-edit";

const views: EditorView[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

function editor(source: string, selection: EditorSelection, inCode = true, autoClose = true, markdown = false) {
  const nativePairing = vi.fn((view: EditorView, from: number, to: number, text: string) => {
    if (text !== "_" && text !== "*") return false;
    view.dispatch({
      changes: { from, to, insert: `${text}${view.state.sliceDoc(from, to)}${text}` },
      selection: EditorSelection.cursor(from + 1),
    });
    return true;
  });
  const settings = { ...structuredClone(DEFAULT_SETTINGS), autoClose };
  const view = new EditorView({
    parent: document.body.appendChild(document.createElement("div")),
    state: EditorState.create({
      doc: source,
      selection,
      extensions: [
        history(),
        EditorState.allowMultipleSelections.of(true),
        // Simulate the host handling input before ordinary plugin handlers.
        Prec.high(EditorView.inputHandler.of(nativePairing)),
        ...(markdown ? createMarkdownEditorExtensions(
          new LanguageRegistry(settings, () => Promise.resolve("")), () => settings,
        ) : createSmartEditingExtensions(
          (state) => inCode ? { from: 0, to: state.doc.length, languageId: "mud" } : undefined,
          () => settings,
        )),
      ],
    }),
  });
  views.push(view);
  return { view, nativePairing };
}

function typeCharacter(view: EditorView, character: string) {
  const { from, to } = view.state.selection.main;
  return view.state.facet(EditorView.inputHandler).some((handler) =>
    handler(view, from, to, character, () => view.state.update({ changes: { from, to, insert: character } })),
  );
}

describe.each(["_", "*"])("literal %s input before host Markdown pairing", (character) => {
  it.each([true, false])("inserts one literal character with autoClose=%s", (autoClose) => {
    const { view, nativePairing } = editor("", EditorSelection.single(0), true, autoClose);
    expect(typeCharacter(view, character)).toBe(true);
    expect(view.state.doc.toString()).toBe(character);
    expect(view.state.selection.main.head).toBe(1);
    expect(nativePairing).not.toHaveBeenCalled();
    expect(typeCharacter(view, character)).toBe(true);
    expect(view.state.doc.toString()).toBe(character.repeat(2));
    expect(view.state.selection.main.head).toBe(2);
  });

  it("replaces selected code and supports undo", () => {
    const { view, nativePairing } = editor("name", EditorSelection.single(0, 4));
    typeCharacter(view, character);
    expect(view.state.doc.toString()).toBe(character);
    expect(view.state.selection.main.head).toBe(1);
    expect(nativePairing).not.toHaveBeenCalled();
    expect(undo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("name");
  });

  it("inserts at every cursor and preserves the main selection", () => {
    const { view } = editor("a b", EditorSelection.create([
      EditorSelection.cursor(0), EditorSelection.cursor(2),
    ], 1));
    typeCharacter(view, character);
    expect(view.state.doc.toString()).toBe(`${character}a ${character}b`);
    expect(view.state.selection.ranges.map((range) => range.head)).toEqual([1, 4]);
    expect(view.state.selection.mainIndex).toBe(1);
  });

  it("leaves ordinary Markdown pairing to the host", () => {
    const { view, nativePairing } = editor("", EditorSelection.single(0), false);
    typeCharacter(view, character);
    expect(view.state.doc.toString()).toBe(character.repeat(2));
    expect(view.state.selection.main.head).toBe(1);
    expect(nativePairing).toHaveBeenCalledOnce();
  });

  it.each(["mud", "python", "unrecognised-language", "", "markdown", "text"])(
    "handles actual Markdown fences labelled '%s'", (language) => {
      const source = "```" + language + "\nvalue\n```";
      const position = source.indexOf("value");
      const { view, nativePairing } = editor(source, EditorSelection.single(position), true, true, true);
      typeCharacter(view, character);
      expect(view.state.doc.toString()).toBe(source.slice(0, position) + character + source.slice(position));
      expect(view.state.selection.main.head).toBe(position + 1);
      expect(nativePairing).not.toHaveBeenCalled();
    },
  );

  it.each(["> ~~~unknown\n> value\n> ~~~", "```\nvalue"])(
    "handles quoted and unfinished fences", (source) => {
      const position = source.indexOf("value");
      const { view, nativePairing } = editor(source, EditorSelection.single(position), true, true, true);
      typeCharacter(view, character);
      expect(view.state.doc.toString()).toBe(source.slice(0, position) + character + source.slice(position));
      expect(nativePairing).not.toHaveBeenCalled();
    },
  );

  it("does not intercept prose adjacent to a code fence", () => {
    const source = "before\n```unknown\nvalue\n```\nafter";
    const { view, nativePairing } = editor(source, EditorSelection.single(source.length), true, true, true);
    typeCharacter(view, character);
    expect(view.state.doc.toString()).toBe(source + character.repeat(2));
    expect(nativePairing).toHaveBeenCalledOnce();
  });
});
