// @vitest-environment happy-dom

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

import { createMarkdownEditorExtensions } from "../src/editor";
import { LanguageRegistry } from "../src/languages";
import { DEFAULT_SETTINGS } from "../src/settings";

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

function editor(): EditorView {
  const settings = structuredClone(DEFAULT_SETTINGS);
  const registry = new LanguageRegistry(settings, () => Promise.resolve(""));
  const parent = document.body.appendChild(document.createElement("div"));
  const state = EditorState.create({
    doc: "> [!task]\n> ```text-center\n> hello\n> ```",
    extensions: createMarkdownEditorExtensions(registry, () => settings),
  });
  const view = new EditorView({ state, parent });
  views.push(view);
  return view;
}

function renderedEmbed(fence: string, source: string): HTMLElement {
  const embed = document.createElement("div");
  embed.className = "cm-embed-block cm-callout";
  const pre = document.createElement("pre");
  pre.className = `language-${fence}`;
  const code = document.createElement("code");
  code.className = `language-${fence} is-loaded`;
  code.textContent = source;
  const copy = document.createElement("button");
  copy.className = "copy-code-button";
  copy.textContent = "Copy";
  pre.append(code, copy);
  embed.append(pre);
  return embed;
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

describe("Live Preview bridge EditorView integration", () => {
  it("processes a rendered callout widget inserted into the real editor DOM", async () => {
    const view = editor();
    view.dom.append(renderedEmbed("text-center", "hello"));

    await settle();

    expect(view.dom.querySelector(".syntax-highlight-frame")).not.toBeNull();
    expect(view.dom.querySelector(".syntax-presentation-align-center")).not.toBeNull();
    expect(view.dom.querySelector(".syntax-language-badge")).toBeNull();
    expect(view.dom.querySelector("[data-line-number]")).toBeNull();
    expect(view.dom.querySelector(".copy-code-button")?.textContent).toBe("Copy");
  });

  it("processes a recreated widget after CodeMirror-style removal", async () => {
    const view = editor();
    const first = renderedEmbed("text", "first");
    view.dom.append(first);
    await settle();
    expect(view.dom.querySelector(".syntax-highlight-frame")?.textContent).toContain("first");

    first.remove();
    view.dom.append(renderedEmbed("powershell", "Write-Host second"));
    await settle();

    expect(view.dom.querySelectorAll(".syntax-highlight-frame")).toHaveLength(1);
    expect(view.dom.querySelector(".syntax-language-badge-text")?.textContent)
      .toBe("PowerShell");
    expect(view.dom.textContent).toContain("second");
  });
});
