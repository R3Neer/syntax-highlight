import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  lineNumbers,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

interface JsonToken {
  from: number;
  to: number;
  kind: "key" | "string" | "number" | "literal" | "punctuation";
}

export function tokenizeJson(source: string): JsonToken[] {
  const result: JsonToken[] = [];
  const pattern =
    /"(?:\\.|[^"\\])*"|[-+]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?|\b(?:true|false|null)\b|[{}[\],:]/gu;
  for (const match of source.matchAll(pattern)) {
    const text = match[0];
    const from = match.index;
    const to = from + text.length;
    let kind: JsonToken["kind"];
    if (text.startsWith('"')) {
      let cursor = to;
      while (/\s/u.test(source[cursor] ?? "")) cursor += 1;
      kind = source[cursor] === ":" ? "key" : "string";
    } else if (/^(?:true|false|null)$/u.test(text)) {
      kind = "literal";
    } else if (/^[{}[\],:]$/u.test(text)) {
      kind = "punctuation";
    } else {
      kind = "number";
    }
    result.push({ from, to, kind });
  }
  return result;
}

function jsonDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const token of tokenizeJson(view.state.doc.toString())) {
    builder.add(
      token.from,
      token.to,
      Decoration.mark({ class: `syntax-json-${token.kind}` }),
    );
  }
  return builder.finish();
}

function jsonHighlighter() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = jsonDecorations(view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged) this.decorations = jsonDecorations(update.view);
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}

export function createJsonEditor(
  parent: HTMLElement,
  source: string,
  onChange: (value: string) => void,
): EditorView {
  return new EditorView({
    parent,
    state: EditorState.create({
      doc: source,
      extensions: [
        lineNumbers(),
        history(),
        jsonHighlighter(),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString());
        }),
      ],
    }),
  });
}
