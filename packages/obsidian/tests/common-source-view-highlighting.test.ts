// @vitest-environment happy-dom

import { syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

import {
  COMMON_SEMANTIC_HIGHLIGHTER,
  commonLanguageByFence,
  commonLanguageSupport,
} from "../src/common-languages";

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

function mountedCommonEditor(fence: string, doc: string): EditorView {
  const language = commonLanguageByFence(fence);
  if (language === undefined) throw new Error(`Missing language ${fence}`);
  const support = commonLanguageSupport(language);
  if (support === undefined) throw new Error(`Missing support ${fence}`);
  const parent = document.body.appendChild(document.createElement("div"));
  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        support,
        syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER),
      ],
    }),
    parent,
  });
  views.push(view);
  return view;
}

function visibleClasses(view: EditorView): string {
  return [...view.dom.querySelectorAll<HTMLElement>("[class*='syntax-common-']")]
    .map((element) => element.className)
    .join(" ");
}

describe("native common SourceView highlighting", () => {
  it("highlights PowerShell through StreamLanguage support and the shared semantic highlighter", () => {
    const view = mountedCommonEditor(
      "powershell",
      ['$foo = 42', 'Write-Host "$foo"', '# comment'].join("\n"),
    );
    const classes = visibleClasses(view);

    expect(classes).toContain("syntax-common-variable");
    expect(classes).toContain("syntax-common-number");
    expect(classes).toContain("syntax-common-operator");
    expect(classes).toContain("syntax-common-callable");
    expect(classes).toContain("syntax-common-string");
    expect(classes).toContain("syntax-common-comment");
  });

  it("keeps a tree-backed language on the same semantic highlighter", () => {
    const view = mountedCommonEditor(
      "bash",
      ['name="world"', 'echo "$name"', '# comment'].join("\n"),
    );
    const classes = visibleClasses(view);

    expect(classes).toContain("syntax-common-string");
    expect(classes).toContain("syntax-common-variable");
    expect(classes).toContain("syntax-common-comment");
  });
});
