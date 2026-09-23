// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
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

function hostShapedPre(fence: string, source: string): HTMLPreElement {
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

describe("Reading View host-shaped DOM fixture", () => {
  it("rescues a simulated callout block with host copy UI and keeps the UI node", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const registry = new LanguageRegistry(settings, () => Promise.resolve(""));
    const root = document.createElement("div");
    root.className = "callout-content";
    const pre = hostShapedPre("text-center", "literal text");
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
    expect(root.querySelector(".syntax-copy-button")).toBeNull();
    expect(root.textContent).toContain("literal text");
  });

  it("keeps the native control while adding the single plugin copy control for code", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const registry = new LanguageRegistry(settings, () => Promise.resolve(""));
    const root = document.createElement("div");
    const pre = hostShapedPre("python", "print('hello')");
    const hostCopy = pre.querySelector(".copy-code-button");
    root.append(pre);

    createReadingFallbackPostProcessor((source, element, ctx, fence) =>
      renderReadingFence(registry, settings, source, element, ctx, fence, vi.fn()),
    )(root, context());

    expect(root.querySelector(".syntax-language-badge")?.textContent).toBe("Python");
    expect(root.querySelector(".copy-code-button")).toBe(hostCopy);
    expect(root.querySelectorAll(".syntax-copy-button")).toHaveLength(1);
    const style = document.createElement("style");
    style.textContent = readFileSync("packages/obsidian/styles.css", "utf8");
    document.head.append(style);
    document.body.append(root);
    try {
      expect(getComputedStyle(hostCopy!).display).toBe("none");
      expect(getComputedStyle(root.querySelector(".syntax-copy-button")!).display)
        .not.toBe("none");
    } finally {
      style.remove();
      root.remove();
    }
  });

  it("hides only its language badge when Live Preview exposes Obsidian's edit icon", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const registry = new LanguageRegistry(settings, () => Promise.resolve(""));
    const source = document.createElement("div");
    renderReadingFence(registry, settings, "print(1)", source, context(), "python", vi.fn());
    const root = document.createElement("div");
    root.className = "markdown-source-view mod-cm6";
    const host = document.createElement("div");
    host.className = "cm-preview-code-block";
    const edit = document.createElement("div");
    edit.className = "edit-block-button";
    host.append(source, edit);
    root.append(host);
    const style = document.createElement("style");
    style.textContent = readFileSync("packages/obsidian/styles.css", "utf8");
    document.head.append(style);
    document.body.append(root);
    try {
      const pre = source.querySelector(".syntax-highlight-block")!;
      expect(pre.contains(source.querySelector(".syntax-language-badge"))).toBe(true);
      expect(pre.contains(source.querySelector(".syntax-copy-button"))).toBe(true);
      expect(getComputedStyle(source.querySelector(".syntax-highlight-frame")!).paddingTop)
        .toBe("");
      expect(getComputedStyle(pre).paddingTop).not.toBe("60px");
      expect(getComputedStyle(source.querySelector(".syntax-language-badge")!).right)
        .toBe("10.4px");
      expect(getComputedStyle(source.querySelector(".syntax-copy-button")!).top)
        .toBe("29.6px");
      expect(getComputedStyle(source.querySelector(".syntax-copy-button")!).right)
        .toBe("8.8px");
      expect(style.textContent).toContain(
        ".cm-preview-code-block:has(.syntax-highlight-frame.has-language-badge):hover .syntax-language-badge",
      );
    } finally {
      style.remove();
      root.remove();
    }
  });

  it("rejects an ambiguous simulated host fixture with two direct code nodes", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const registry = new LanguageRegistry(settings, () => Promise.resolve(""));
    const root = document.createElement("div");
    const pre = hostShapedPre("text", "first");
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
