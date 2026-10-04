import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { drawSelection, EditorView, keymap, lineNumbers } from "@codemirror/view";
import { COMMON_SEMANTIC_HIGHLIGHTER, commonLanguageByFence, commonLanguageSupport } from "./common-languages";

export function notebookEditorState(
  text: string, language: string, editable: boolean, numbers: boolean,
  changed: (text: string) => void, save: () => void,
): EditorState {
  const descriptor = commonLanguageByFence(language);
  const support = descriptor && commonLanguageSupport(descriptor);
  return EditorState.create({
    doc: text,
    extensions: [
      ...(support ? [support, syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER)] : []),
      ...(numbers ? [lineNumbers()] : []),
      history(), drawSelection(), bracketMatching(), EditorView.lineWrapping,
      EditorState.readOnly.of(!editable), EditorView.editable.of(editable),
      keymap.of([{ key: "Mod-s", preventDefault: true, run: () => { save(); return true; } },
        indentWithTab, ...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (editable && update.docChanged) changed(update.state.doc.toString());
      }),
    ],
  });
}
