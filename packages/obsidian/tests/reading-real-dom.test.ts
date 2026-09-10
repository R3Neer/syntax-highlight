// @vitest-environment happy-dom

import type { MarkdownPostProcessorContext } from "obsidian";
import { describe, expect, it, vi } from "vitest";

import { LanguageRegistry } from "../src/languages";
import {
  createReadingFallbackPostProcessor,
  renderReadingFence,
} from "../src/reading-host";
import { DEFAULT_SETTINGS } from "../src/settings";

function context(): MarkdownPostProcessorContext {
  return {
    docId: "test",
    sourcePath: "note.md",
    frontmatter: null,
    addChild: vi.fn(),
    getSectionInfo: vi.fn(() => null),
  } as unknown as MarkdownPostProcessorContext;
}

function realisticPre(fence: string, source: string): HTMLPreElement {
  const pre = document.createElement("pre");
  pre.className = `language-${fence}`;
  pre.tabIndex = 0;
  const code = document.createElement("code");
  code.className = `language-${fence} is-loaded`;
  code.textContent = source;
  const copy = document.createElement("button");
  copy.className = "copy-code-button";
  copy.textContent = "Copy";
  pre.append(code, copy);
  return pre;
}

describe("Reading View realistic Obsidian DOM", () => {
  it("rescues a callout block with host copy UI and keeps the UI node", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const registry = new LanguageRegistry(settings, () => Promise.resolve(""));
    const root = document.createElement("div");
    root.className = "callout-content";
    const pre = realisticPre("text-center", "literal text");
    const copy = pre.querySelector(".copy-code-button");
    root.append(pre);

    const processor = createReadingFallbackPostProcessor(
      (source, element, ctx, fence) =>
        renderReadingFence(
          registry,
          settings,
          source,
          element,
          ctx,
          fence,
          vi.fn(),
        ),
    );
    processor(root, context());

    expect(root.querySelector(".syntax-highlight-frame")).not.toBeNull();
    expect(root.querySelector(".syntax-presentation-align-center")).not.toBeNull();
    expect(root.querySelector(".syntax-language-badge")).toBeNull();
    expect(root.querySelector("[data-line-number]")).toBeNull();
    expect(root.querySelector(".copy-code-button")).toBe(copy);
    expect(root.textContent).toContain("literal text");
  });

  it("rejects truly ambiguous host DOM with two direct code nodes", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const registry = new LanguageRegistry(settings, () => Promise.resolve(""));
    const root = document.createElement("div");
    const pre = realisticPre("text", "first");
    const second = document.createElement("code");
    second.className = "language-text";
    second.textContent = "second";
    pre.append(second);
    root.append(pre);
    const before = root.innerHTML;

    createReadingFallbackPostProcessor((source, element, ctx, fence) =>
      renderReadingFence(registry, settings, source, element, ctx, fence, vi.fn()),
    )(root, context());

    expect(root.innerHTML).toBe(before);
    expect(root.querySelector(".syntax-highlight-frame")).toBeNull();
  });
});
