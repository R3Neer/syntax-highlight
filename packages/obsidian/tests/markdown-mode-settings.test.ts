import { describe, expect, it } from "vitest";

import {
  markdownHighlightEnabledForContext,
  type MarkdownRenderViewState,
} from "../src/markdown-render-mode";
import { DEFAULT_SETTINGS } from "../src/settings";

function settings(
  markdownEditor: boolean,
  markdownReading: boolean,
) {
  return {
    ...structuredClone(DEFAULT_SETTINGS),
    markdownEditor,
    markdownReading,
  };
}

function view(
  mode: "source" | "preview",
  sourcePath: string,
  ownsElement = false,
): MarkdownRenderViewState {
  return { mode, sourcePath, ownsElement };
}

describe("rendered Markdown setting resolution", () => {
  it("uses markdownEditor for the owning source-mode MarkdownView", () => {
    expect(markdownHighlightEnabledForContext(
      settings(false, true),
      [view("source", "note.md", true)],
      "note.md",
    )).toBe(false);
  });

  it("uses markdownReading for the owning preview-mode MarkdownView", () => {
    expect(markdownHighlightEnabledForContext(
      settings(false, true),
      [view("preview", "note.md", true)],
      "note.md",
    )).toBe(true);
  });

  it("prioritizes DOM ownership over sourcePath for transcluded Markdown", () => {
    expect(markdownHighlightEnabledForContext(
      settings(false, true),
      [
        view("source", "host.md", true),
        view("preview", "embedded.md", false),
      ],
      "embedded.md",
    )).toBe(false);
  });

  it("uses a unique sourcePath match when the processor element is not mounted yet", () => {
    expect(markdownHighlightEnabledForContext(
      settings(false, true),
      [view("source", "note.md")],
      "note.md",
    )).toBe(false);
  });

  it("falls back conservatively to markdownReading when ownership is ambiguous", () => {
    expect(markdownHighlightEnabledForContext(
      settings(false, true),
      [view("source", "note.md"), view("preview", "note.md")],
      "note.md",
    )).toBe(true);
  });

  it("falls back to markdownReading when there is no associated MarkdownView", () => {
    expect(markdownHighlightEnabledForContext(
      settings(true, false),
      [],
      "orphan.md",
    )).toBe(false);
  });
});
