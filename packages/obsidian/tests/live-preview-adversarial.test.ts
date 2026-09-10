// @vitest-environment happy-dom

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

import { createMarkdownEditorExtensions } from "../src/editor";
import { LanguageRegistry } from "../src/languages";
import {
  LivePreviewRenderedBlockBridge,
} from "../src/live-preview-host";
import { renderResolvedFence } from "../src/reading-host";
import { DEFAULT_SETTINGS, loadSettings } from "../src/settings";

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

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

function bridgeFor(
  root: HTMLElement,
  settings = structuredClone(DEFAULT_SETTINGS),
): LivePreviewRenderedBlockBridge {
  const registry = new LanguageRegistry(settings, () => Promise.resolve(""));
  return new LivePreviewRenderedBlockBridge(root, (source, element, fence) =>
    renderResolvedFence(registry, settings, source, element, fence),
  );
}

function editorWithSettings(settings: typeof DEFAULT_SETTINGS): EditorView {
  const registry = new LanguageRegistry(settings, () => Promise.resolve(""));
  const parent = document.body.appendChild(document.createElement("div"));
  const state = EditorState.create({
    doc: "> [!note]\n> body",
    extensions: createMarkdownEditorExtensions(registry, () => settings),
  });
  const view = new EditorView({ state, parent });
  views.push(view);
  return view;
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

describe("Live Preview adversarial host matrix", () => {
  it("renders nested Markdown presentation while retaining Markdown syntax", () => {
    const root = document.createElement("div");
    root.append(renderedEmbed("markdown-center-ragged", "# Heading\n**bold**"));
    const bridge = bridgeFor(root);

    bridge.scan();

    const frame = root.querySelector(".syntax-highlight-frame");
    expect(frame?.classList.contains("syntax-presentation-family-markdown")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-align-center")).toBe(true);
    expect(root.querySelector(".syntax-language-badge")).toBeNull();
    expect(root.querySelector("[data-line-number]")).toBeNull();
    expect(root.querySelector('[class*="syntax-common-"]')).not.toBeNull();
    expect(root.querySelector(".copy-code-button")?.textContent).toBe("Copy");
  });

  it("renders a configured TOML profile through the widget bridge", () => {
    const root = document.createElement("div");
    root.append(renderedEmbed("toml", "[server]\nport = 8080"));
    const bridge = bridgeFor(root);

    bridge.scan();

    expect(root.querySelector(".syntax-language-badge-text")?.textContent).toBe("TOML");
    expect(root.querySelectorAll("[data-line-number]")).toHaveLength(2);
    expect(root.querySelector('[class*="syntax-color-toml-"]')).not.toBeNull();
  });

  it("keeps MUD unavailable in common profile and enables it only in MUD profile", () => {
    const commonRoot = document.createElement("div");
    const commonEmbed = renderedEmbed("mud", "thing World {}");
    commonRoot.append(commonEmbed);
    const before = commonEmbed.innerHTML;
    bridgeFor(commonRoot).scan();
    expect(commonEmbed.innerHTML).toBe(before);
    expect(commonRoot.querySelector(".syntax-highlight-frame")).toBeNull();

    const mudSettings = loadSettings({
      ...structuredClone(DEFAULT_SETTINGS),
      languages: [
        ...structuredClone(DEFAULT_SETTINGS.languages),
        { id: "mud", enabled: true },
      ],
    });
    const mudRoot = document.createElement("div");
    mudRoot.append(renderedEmbed("mud", "thing World {}"));
    bridgeFor(mudRoot, mudSettings).scan();

    expect(mudRoot.querySelector(".syntax-language-badge-mud")).not.toBeNull();
    expect(mudRoot.querySelector('[class*="syntax-color-mud-"]')).not.toBeNull();
  });

  it("leaves rendered widgets native when Markdown editor highlighting is disabled", async () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.markdownEditor = false;
    const view = editorWithSettings(settings);
    const embed = renderedEmbed("text-center", "native when disabled");
    view.dom.append(embed);
    const before = embed.innerHTML;

    await settle();

    expect(embed.innerHTML).toBe(before);
    expect(view.dom.querySelector(".syntax-highlight-frame")).toBeNull();
  });

  it("preserves arbitrary auxiliary host controls and their event listeners", () => {
    const root = document.createElement("div");
    const embed = renderedEmbed("text", "controls");
    const pre = embed.querySelector("pre")!;
    const menu = document.createElement("button");
    menu.className = "host-menu";
    let clicks = 0;
    menu.addEventListener("click", () => clicks += 1);
    pre.append(menu);
    const copy = pre.querySelector(".copy-code-button")!;
    root.append(embed);

    bridgeFor(root).scan();

    expect(root.querySelector(".host-menu")).toBe(menu);
    expect(root.querySelector(".copy-code-button")).toBe(copy);
    menu.click();
    expect(clicks).toBe(1);
  });

  it("reacts when Obsidian classifies an already-mounted widget after insertion", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const embed = document.createElement("div");
    embed.className = "cm-embed-block cm-callout";
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = "classified later";
    pre.append(code);
    embed.append(pre);
    root.append(embed);
    const bridge = bridgeFor(root);
    bridge.start();

    code.className = "language-text-center is-loaded";
    await settle();

    expect(root.querySelector(".syntax-highlight-frame")?.textContent)
      .toContain("classified later");
    expect(root.querySelector(".syntax-presentation-align-center")).not.toBeNull();
    bridge.dispose();
    root.remove();
  });
});
