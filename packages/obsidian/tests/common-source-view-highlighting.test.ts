// @vitest-environment happy-dom

import { ensureSyntaxTree, syntaxHighlighting } from "@codemirror/language";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, highlightActiveLine } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

import {
  COMMON_SEMANTIC_HIGHLIGHTER,
  commonLanguageByFence,
  commonLanguageSupport,
} from "../src/common-languages";
import { SyntaxContrastManager } from "../src/contrast-manager";
import {
  MINIMUM_TEXT_CONTRAST,
  contrastRatioCss,
} from "../src/contrast";

const views: EditorView[] = [];
const contrastManagers: SyntaxContrastManager[] = [];

afterEach(() => {
  for (const manager of contrastManagers.splice(0)) manager.dispose();
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
  document.head
    .querySelectorAll("[data-source-contrast-test], [data-syntax-highlight-source-contrast]")
    .forEach((element) => element.remove());
});

function mountedCommonEditor(fence: string, doc: string): EditorView {
  const language = commonLanguageByFence(fence);
  if (language === undefined) throw new Error(`Missing language ${fence}`);
  const support = commonLanguageSupport(language);
  if (support === undefined) throw new Error(`Missing support ${fence}`);
  const parent = document.body.appendChild(document.createElement("div"));
  parent.className = "syntax-source-editor";
  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        support,
        syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER),
        highlightActiveLine(),
      ],
    }),
    parent,
  });
  ensureSyntaxTree(view.state, view.state.doc.length, 100);
  view.dispatch({});
  views.push(view);
  return view;
}

async function settleEditor(): Promise<void> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function expectVisibleKeywordContrast(view: EditorView): void {
  const lines = [...view.dom.querySelectorAll<HTMLElement>(".cm-line")];
  expect(lines.length).toBeGreaterThanOrEqual(2);
  let keywordCount = 0;
  for (const line of lines) {
    const keyword = line.querySelector<HTMLElement>(".syntax-common-keyword");
    if (keyword === null) continue;
    keywordCount += 1;
    const background = line.classList.contains("cm-activeLine")
      ? "rgb(215, 210, 190)"
      : "rgb(221, 216, 199)";
    expect(contrastRatioCss(getComputedStyle(keyword).color, background))
      .toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST - 0.01);
    expect(keyword.style.getPropertyValue("color")).toBe("");
    expect(keyword.hasAttribute("data-syntax-contrast-adjusted")).toBe(false);
  }
  expect(keywordCount).toBeGreaterThanOrEqual(2);
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

  it("keeps source contrast across focus, cursor movement, and CodeMirror redraws", async () => {
    const style = document.createElement("style");
    style.dataset.sourceContrastTest = "true";
    style.textContent = `
      .syntax-source-editor .cm-editor,
      .syntax-source-editor .cm-content {
        background: rgb(221, 216, 199);
        color: rgb(229, 192, 123);
      }
      .syntax-source-editor .cm-activeLine {
        background: rgb(215, 210, 190);
      }
      .syntax-source-editor .syntax-common-keyword {
        color: rgb(229, 192, 123);
      }
    `;
    document.head.append(style);
    const view = mountedCommonEditor(
      "bash",
      ["if true; then echo one; fi", "if false; then echo two; fi"].join("\n"),
    );
    const manager = new SyntaxContrastManager();
    contrastManagers.push(manager);
    manager.start();
    await settleEditor();
    expectVisibleKeywordContrast(view);

    view.focus();
    await settleEditor();
    expectVisibleKeywordContrast(view);

    view.dispatch({
      selection: EditorSelection.cursor(view.state.doc.line(2).from),
    });
    await settleEditor();
    expect(view.dom.querySelector<HTMLElement>(".cm-activeLine")?.textContent)
      .toContain("if false");
    expectVisibleKeywordContrast(view);

    view.dispatch({ changes: { from: 0, insert: "if true; then echo zero; fi\n" } });
    await settleEditor();
    expectVisibleKeywordContrast(view);

  });
});
