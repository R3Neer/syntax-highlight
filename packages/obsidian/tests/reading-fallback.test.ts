// @vitest-environment happy-dom

import type {
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
} from "obsidian";
import { describe, expect, it, vi } from "vitest";

import { LanguageRegistry } from "../src/languages";
import {
  READING_FALLBACK_SORT_ORDER,
  READING_PROCESSED_ATTRIBUTE,
  collectUnprocessedRenderedCodeBlocks,
  createReadingFallbackPostProcessor,
  registerReadingFallbackPostProcessor,
  renderReadingFence,
  type EnableReadingBlockEditing,
  type ReadingFenceHandler,
} from "../src/reading-host";
import { DEFAULT_SETTINGS, loadSettings } from "../src/settings";

function registry(
  settings = structuredClone(DEFAULT_SETTINGS),
): LanguageRegistry {
  return new LanguageRegistry(settings, () => Promise.resolve(""));
}

function context(): MarkdownPostProcessorContext {
  return {
    docId: "test",
    sourcePath: "note.md",
    frontmatter: null,
    addChild: vi.fn(),
    getSectionInfo: vi.fn(() => null),
  } as unknown as MarkdownPostProcessorContext;
}

function codeBlock(fence: string, source: string): HTMLPreElement {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.className = `language-${fence}`;
  code.textContent = source;
  pre.append(code);
  return pre;
}

function actualProcessor(
  settings = structuredClone(DEFAULT_SETTINGS),
  enableEditing: EnableReadingBlockEditing = vi.fn(),
): MarkdownPostProcessor {
  const languages = registry(settings);
  return createReadingFallbackPostProcessor((source, element, ctx, fence) =>
    renderReadingFence(
      languages,
      settings,
      source,
      element,
      ctx,
      fence,
      enableEditing,
    ),
  );
}

describe("Reading View fallback candidate detection", () => {
  it("finds untouched fenced code in callout-like DOM without knowing the callout type", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div class="callout"><div class="callout-content"></div></div>';
    root.querySelector(".callout-content")!.append(
      codeBlock("text-right-justified", "uno dos tres"),
    );

    const candidates = collectUnprocessedRenderedCodeBlocks(root);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      fence: "text-right-justified",
      source: "uno dos tres",
    });
  });

  it("accepts equivalent case-variant language classes but rejects ambiguous languages", () => {
    const root = document.createElement("div");
    const equivalent = codeBlock("TEXT", "same");
    equivalent.firstElementChild!.classList.add("language-text");
    const ambiguous = codeBlock("text", "ambiguous");
    ambiguous.firstElementChild!.classList.add("language-bash");
    root.append(equivalent, ambiguous);

    const candidates = collectUnprocessedRenderedCodeBlocks(root);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.source).toBe("same");
    expect(candidates[0]?.fence).toBe("text");
  });

  it("rejects deceptive classes and pre elements with extra UI children", () => {
    const root = document.createElement("div");
    const deceptive = document.createElement("pre");
    deceptive.innerHTML = '<code class="languageish-text foo-language-text">x</code>';
    const decorated = codeBlock("text", "must survive");
    decorated.append(document.createElement("button"));
    root.append(deceptive, decorated);

    expect(collectUnprocessedRenderedCodeBlocks(root)).toEqual([]);
  });

  it("skips Syntax Highlight output whether marked explicitly or nested in its frame", () => {
    const root = document.createElement("div");
    const markedHost = document.createElement("div");
    markedHost.setAttribute(READING_PROCESSED_ATTRIBUTE, "true");
    markedHost.append(codeBlock("text", "marked"));
    const frame = document.createElement("div");
    frame.className = "syntax-highlight-frame";
    frame.append(codeBlock("powershell", "Get-ChildItem"));
    root.append(markedHost, frame);

    expect(collectUnprocessedRenderedCodeBlocks(root)).toEqual([]);
  });

  it("handles a root pre itself when it is mounted", () => {
    const parent = document.createElement("div");
    const pre = codeBlock("text", "root candidate");
    parent.append(pre);

    expect(collectUnprocessedRenderedCodeBlocks(pre)).toHaveLength(1);
  });
});

describe("Reading View fallback rendering", () => {
  it("fully renders Text inside a callout with presentation but no code furniture", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div class="callout"><div class="callout-content"></div></div>';
    root.querySelector(".callout-content")!.append(
      codeBlock("text-right-justified", "Texto literal <&>\nsegunda línea"),
    );
    const enableEditing = vi.fn<EnableReadingBlockEditing>();

    actualProcessor(structuredClone(DEFAULT_SETTINGS), enableEditing)(root, context());

    const frame = root.querySelector(".syntax-highlight-frame");
    expect(frame).not.toBeNull();
    expect(frame?.classList.contains("syntax-presentation-family-text")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-align-right")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-flow-justified")).toBe(true);
    expect(root.querySelector(".syntax-language-badge")).toBeNull();
    expect(root.querySelector("[data-line-number]")).toBeNull();
    expect(root.textContent).toContain("Texto literal <&>");
    expect(root.textContent).toContain("segunda línea");
    expect(enableEditing).toHaveBeenCalledTimes(1);
    expect(enableEditing.mock.calls[0]?.[2]).toBe("text-right-justified");
    expect(enableEditing.mock.calls[0]?.[3]).toBe("Texto literal <&>\nsegunda línea");
  });

  it("renders PowerShell through the real common renderer with badge, numbers and syntax", () => {
    const root = document.createElement("div");
    root.append(codeBlock("PowerShell", "$x = Get-ChildItem\n# comment"));

    actualProcessor()(root, context());

    expect(root.querySelector(".syntax-language-badge-text")?.textContent).toBe("PowerShell");
    expect(root.querySelectorAll("[data-line-number]")).toHaveLength(2);
    expect(root.querySelector(".token.comment")?.textContent).toBe("# comment");
  });

  it("renders configured TOML through the same fallback path", () => {
    const root = document.createElement("div");
    const tomlSource = ["[server]", "port = 8080"].join(String.fromCharCode(10));
    root.append(codeBlock("toml", tomlSource));

    actualProcessor()(root, context());

    expect(root.querySelector(".syntax-language-badge-text")?.textContent).toBe("TOML");
    expect(root.querySelectorAll("[data-line-number]")).toHaveLength(2);
    expect(root.querySelector('[class*="syntax-color-toml-"]')).not.toBeNull();
  });

  it("keeps MUD isolated by vault profile and renders it when explicitly enabled", () => {
    const commonRoot = document.createElement("div");
    const commonMud = codeBlock("mud", "thing World {}");
    commonRoot.append(commonMud);
    const commonBefore = commonRoot.innerHTML;

    actualProcessor()(commonRoot, context());
    expect(commonRoot.innerHTML).toBe(commonBefore);

    const mudSettings = loadSettings({
      ...structuredClone(DEFAULT_SETTINGS),
      languages: [
        ...structuredClone(DEFAULT_SETTINGS.languages),
        { id: "mud", enabled: true },
      ],
    });
    const mudRoot = document.createElement("div");
    mudRoot.append(codeBlock("mud", "thing World {}"));

    actualProcessor(mudSettings)(mudRoot, context());

    expect(mudRoot.querySelector(".syntax-language-badge-mud")).not.toBeNull();
    expect(mudRoot.querySelector('[class*="syntax-color-mud-"]')).not.toBeNull();
  });

  it("renders Markdown as presentational but keeps Markdown syntax highlighting", () => {
    const root = document.createElement("div");
    root.append(codeBlock("markdown-center-ragged", "# Heading\n**bold**"));

    actualProcessor()(root, context());

    const frame = root.querySelector(".syntax-highlight-frame");
    expect(frame?.classList.contains("syntax-presentation-family-markdown")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-align-center")).toBe(true);
    expect(root.querySelector(".syntax-language-badge")).toBeNull();
    expect(root.querySelector("[data-line-number]")).toBeNull();
    expect(root.querySelector('[class*="syntax-common-"]')).not.toBeNull();
  });

  it("rescues a recognized alias that the specialized processor cannot register", () => {
    const root = document.createElement("div");
    root.append(codeBlock("c++", "int main() { return 0; }"));

    actualProcessor()(root, context());

    expect(root.querySelector(".syntax-language-badge-text")?.textContent).toBe("C++");
    expect(root.querySelector(".syntax-highlight-frame")).not.toBeNull();
  });

  it("lets an already-registered specialized processor claim a stale fence as plain text", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const element = document.createElement("div");
    const enableEditing = vi.fn<EnableReadingBlockEditing>();

    const handled = renderReadingFence(
      registry(settings),
      settings,
      "raw stale source",
      element,
      context(),
      "removed-profile",
      enableEditing,
      true,
    );

    expect(handled).toBe(true);
    expect(element.querySelector("pre > code")?.textContent).toBe("raw stale source");
    expect(element.hasAttribute(READING_PROCESSED_ATTRIBUTE)).toBe(true);
    expect(enableEditing).toHaveBeenCalledTimes(1);
  });

  it("leaves unknown languages byte-for-byte in place", () => {
    const root = document.createElement("div");
    const pre = codeBlock("definitely-unknown", "<raw>&stuff\nline2");
    root.append(pre);
    const before = root.innerHTML;

    actualProcessor()(root, context());

    expect(root.innerHTML).toBe(before);
    expect(root.firstElementChild).toBe(pre);
  });

  it("processes every recognized sibling from a snapshot even while replacing nodes", () => {
    const root = document.createElement("div");
    root.append(
      codeBlock("text", "one"),
      codeBlock("powershell", "Write-Host two"),
      codeBlock("markdown", "# three"),
    );

    actualProcessor()(root, context());

    expect(root.querySelectorAll(`[${READING_PROCESSED_ATTRIBUTE}]`)).toHaveLength(3);
    expect(collectUnprocessedRenderedCodeBlocks(root)).toEqual([]);
  });

  it("is idempotent across repeated postprocessor passes", () => {
    const root = document.createElement("div");
    root.append(codeBlock("text-center", "once"));
    const enableEditing = vi.fn<EnableReadingBlockEditing>();
    const processor = actualProcessor(structuredClone(DEFAULT_SETTINGS), enableEditing);
    const ctx = context();

    processor(root, ctx);
    processor(root, ctx);
    processor(root, ctx);

    expect(root.querySelectorAll(".syntax-highlight-frame")).toHaveLength(1);
    expect(root.querySelectorAll(`[${READING_PROCESSED_ATTRIBUTE}]`)).toHaveLength(1);
    expect(enableEditing).toHaveBeenCalledTimes(1);
  });

  it("works through deep arbitrary containers and when the postprocessor root is the pre", () => {
    const outer = document.createElement("section");
    outer.innerHTML = '<div><aside><div class="callout-content"></div></aside></div>';
    const pre = codeBlock("text-center", "deep");
    outer.querySelector(".callout-content")!.append(pre);
    const processor = actualProcessor();

    processor(pre, context());

    expect(outer.querySelector(".syntax-highlight-frame")).not.toBeNull();
    expect(outer.textContent).toContain("deep");
  });

  it("preserves source text exactly when dispatching, including symbols and newlines", () => {
    const root = document.createElement("div");
    const source = "  a < b && c > d\n\t$HOME & literal\n";
    root.append(codeBlock("text", source));
    const seen: string[] = [];
    const processor = createReadingFallbackPostProcessor((value, element) => {
      seen.push(value);
      element.textContent = value;
      return true;
    });

    processor(root, context());

    expect(seen).toEqual([source]);
    expect(root.textContent).toBe(source);
  });

  it("keeps recognized blocks plain but handled when Markdown Reading processing is disabled", () => {
    const root = document.createElement("div");
    root.append(codeBlock("text-center", "plain mode"));
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.markdownReading = false;
    const enableEditing = vi.fn<EnableReadingBlockEditing>();

    actualProcessor(settings, enableEditing)(root, context());

    expect(root.querySelector(".syntax-highlight-frame")).toBeNull();
    expect(root.querySelector("pre > code")?.textContent).toBe("plain mode");
    expect(root.querySelector(`[${READING_PROCESSED_ATTRIBUTE}]`)).not.toBeNull();
    expect(enableEditing).toHaveBeenCalledTimes(1);
  });
});

describe("Reading View fallback host registration", () => {
  it("registers a late postprocessor and the captured callback really dispatches DOM candidates", () => {
    let captured: MarkdownPostProcessor | undefined;
    const registrar = vi.fn((processor: MarkdownPostProcessor) => {
      captured = processor;
      return processor;
    });
    const handler = vi.fn<ReadingFenceHandler>(() => true);

    const registered = registerReadingFallbackPostProcessor(registrar, handler);

    expect(registrar).toHaveBeenCalledTimes(1);
    expect(registered).toBe(captured);
    expect(registered.sortOrder).toBe(READING_FALLBACK_SORT_ORDER);

    const root = document.createElement("div");
    root.append(codeBlock("text", "host boundary"));
    document.body.append(root);
    captured!(root, context());

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0]).toBe("host boundary");
    expect(handler.mock.calls[0]?.[3]).toBe("text");
    expect(root.querySelector(`div[${READING_PROCESSED_ATTRIBUTE}]`)).not.toBeNull();
  });
});
