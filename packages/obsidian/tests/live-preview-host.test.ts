// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";

import { LanguageRegistry } from "../src/languages";
import {
  LIVE_PREVIEW_HOST_ATTRIBUTE,
  LivePreviewRenderedBlockBridge,
  collectLivePreviewRenderedCodeBlocks,
} from "../src/live-preview-host";
import { renderResolvedFence } from "../src/reading-host";
import { DEFAULT_SETTINGS } from "../src/settings";

function registry(): LanguageRegistry {
  return new LanguageRegistry(
    structuredClone(DEFAULT_SETTINGS),
    () => Promise.resolve(""),
  );
}

function codeBlock(fence: string, source: string, withCopyButton = true): HTMLPreElement {
  const pre = document.createElement("pre");
  pre.className = `language-${fence}`;
  pre.tabIndex = 0;
  const code = document.createElement("code");
  code.className = `language-${fence} is-loaded`;
  code.textContent = source;
  pre.append(code);
  if (withCopyButton) {
    const copy = document.createElement("button");
    copy.className = "copy-code-button";
    copy.textContent = "Copy";
    pre.append(copy);
  }
  return pre;
}

function embed(...children: Node[]): HTMLElement {
  const root = document.createElement("div");
  root.className = "cm-embed-block cm-callout";
  root.append(...children);
  return root;
}

function actualBridge(root: HTMLElement): LivePreviewRenderedBlockBridge {
  const settings = structuredClone(DEFAULT_SETTINGS);
  const languages = registry();
  return new LivePreviewRenderedBlockBridge(root, (source, element, fence) =>
    renderResolvedFence(languages, settings, source, element, fence),
  );
}

async function flushMutations(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

describe("Live Preview rendered-block candidate detection", () => {
  it("finds realistic Obsidian code DOM with is-loaded and copy UI", () => {
    const editor = document.createElement("div");
    editor.append(embed(codeBlock("text-center", "hello")));

    const candidates = collectLivePreviewRenderedCodeBlocks(editor);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.fence).toBe("text-center");
    expect(candidates[0]?.source).toBe("hello");
  });

  it("ignores identical-looking blocks outside cm-embed-block", () => {
    const editor = document.createElement("div");
    editor.append(codeBlock("text", "top-level native"));

    expect(collectLivePreviewRenderedCodeBlocks(editor)).toEqual([]);
  });

  it("rejects ambiguous pre nodes containing multiple direct code children", () => {
    const pre = codeBlock("text", "first", false);
    const second = document.createElement("code");
    second.className = "language-text";
    second.textContent = "second";
    pre.append(second);
    const editor = document.createElement("div");
    editor.append(embed(pre));

    expect(collectLivePreviewRenderedCodeBlocks(editor)).toEqual([]);
  });
});

describe("Live Preview rendered-block bridge", () => {
  it("renders Text presentation inside a callout and preserves host copy UI", () => {
    const editor = document.createElement("div");
    editor.append(embed(codeBlock("text-right-justified", "uno dos\ntres")));
    const bridge = actualBridge(editor);

    bridge.scan();

    const host = editor.querySelector(`[${LIVE_PREVIEW_HOST_ATTRIBUTE}]`);
    expect(host).not.toBeNull();
    const frame = editor.querySelector(".syntax-highlight-frame");
    expect(frame?.classList.contains("syntax-presentation-family-text")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-align-right")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-flow-justified")).toBe(true);
    expect(editor.querySelector(".syntax-language-badge")).toBeNull();
    expect(editor.querySelector("[data-line-number]")).toBeNull();
    expect(editor.querySelector(".copy-code-button")?.textContent).toBe("Copy");
    expect(editor.textContent).toContain("uno dos");
    expect(editor.textContent).toContain("tres");
  });

  it("renders PowerShell through the real common renderer", () => {
    const editor = document.createElement("div");
    editor.append(embed(codeBlock("powershell", "$x = Get-ChildItem\n# comment")));
    const bridge = actualBridge(editor);

    bridge.scan();

    expect(editor.querySelector(".syntax-language-badge-text")?.textContent)
      .toBe("PowerShell");
    expect(editor.querySelectorAll("[data-line-number]")).toHaveLength(2);
    expect(editor.querySelector(".token.comment")?.textContent).toBe("# comment");
  });

  it("leaves unknown languages and their host UI byte-for-byte untouched", () => {
    const editor = document.createElement("div");
    const original = codeBlock("unknown-x", "raw <&>\nvalue");
    const container = embed(original);
    editor.append(container);
    const before = container.innerHTML;
    const bridge = actualBridge(editor);

    bridge.scan();

    expect(container.innerHTML).toBe(before);
    expect(container.querySelector("pre")).toBe(original);
  });

  it("is idempotent across repeated scans", () => {
    const editor = document.createElement("div");
    editor.append(embed(codeBlock("text-center", "once")));
    const bridge = actualBridge(editor);

    bridge.scan();
    bridge.scan();
    bridge.scan();

    expect(editor.querySelectorAll(`[${LIVE_PREVIEW_HOST_ATTRIBUTE}]`)).toHaveLength(1);
    expect(editor.querySelectorAll(".syntax-highlight-frame")).toHaveLength(1);
  });

  it("isolates a throwing block and continues with healthy siblings", () => {
    const editor = document.createElement("div");
    const broken = codeBlock("text", "broken");
    const healthy = codeBlock("text", "healthy");
    editor.append(embed(broken, healthy));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const bridge = new LivePreviewRenderedBlockBridge(editor, (source, element) => {
      if (source === "broken") throw new Error("boom");
      element.textContent = source;
      return true;
    });

    try {
      bridge.scan();
      expect(editor.textContent).toContain("broken");
      expect(editor.querySelector("pre")?.textContent).toContain("broken");
      expect(editor.querySelector(`[${LIVE_PREVIEW_HOST_ATTRIBUTE}]`)?.textContent)
        .toBe("healthy");
      expect(errorSpy).toHaveBeenCalledTimes(1);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("observes a widget inserted after start", async () => {
    const editor = document.createElement("div");
    document.body.append(editor);
    const bridge = actualBridge(editor);
    bridge.start();

    editor.append(embed(codeBlock("text-center", "late")));
    await flushMutations();

    expect(editor.querySelector(".syntax-highlight-frame")?.textContent).toContain("late");
    bridge.dispose();
    editor.remove();
  });

  it("handles CodeMirror-style widget removal and recreation", async () => {
    const editor = document.createElement("div");
    document.body.append(editor);
    const bridge = actualBridge(editor);
    bridge.start();

    const first = embed(codeBlock("text", "first"));
    editor.append(first);
    await flushMutations();
    expect(editor.textContent).toContain("first");

    first.remove();
    editor.append(embed(codeBlock("text", "second")));
    await flushMutations();

    expect(editor.querySelectorAll(".syntax-highlight-frame")).toHaveLength(1);
    expect(editor.textContent).not.toContain("first");
    expect(editor.textContent).toContain("second");
    bridge.dispose();
    editor.remove();
  });

  it("stops reacting after dispose", async () => {
    const editor = document.createElement("div");
    document.body.append(editor);
    const bridge = actualBridge(editor);
    bridge.start();
    bridge.dispose();

    editor.append(embed(codeBlock("text", "after dispose")));
    await flushMutations();

    expect(editor.querySelector(".syntax-highlight-frame")).toBeNull();
    expect(editor.querySelector("pre > code")?.textContent).toBe("after dispose");
    editor.remove();
  });
});
