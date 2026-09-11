// @vitest-environment happy-dom

import {
  MarkdownView,
  type MarkdownPostProcessorContext,
  type TFile,
} from "obsidian";
import { describe, expect, it } from "vitest";

import SyntaxHighlightPlugin from "../src/main";
import { DEFAULT_SETTINGS, type SyntaxPluginSettings } from "../src/settings";

interface TestablePlugin {
  app: {
    workspace: {
      getLeavesOfType(type: string): Array<{ view: MarkdownView }>;
    };
  };
  pluginSettings: SyntaxPluginSettings;
  markdownHighlightEnabled(
    element: HTMLElement,
    context: MarkdownPostProcessorContext,
  ): boolean;
}

function fakeMarkdownView(
  mode: "source" | "preview",
  path: string,
  containerEl: HTMLElement,
): MarkdownView {
  const view = Object.create(MarkdownView.prototype) as MarkdownView;
  Object.defineProperty(view, "containerEl", {
    configurable: true,
    value: containerEl,
  });
  Object.defineProperty(view, "file", {
    configurable: true,
    value: { path } as TFile,
  });
  Object.defineProperty(view, "getMode", {
    configurable: true,
    value: () => mode,
  });
  return view;
}

function context(sourcePath: string): MarkdownPostProcessorContext {
  return { sourcePath } as MarkdownPostProcessorContext;
}

function plugin(
  views: MarkdownView[],
  overrides: Partial<Pick<SyntaxPluginSettings, "markdownEditor" | "markdownReading">> = {},
): TestablePlugin {
  const instance = Object.create(
    SyntaxHighlightPlugin.prototype,
  ) as TestablePlugin;
  instance.pluginSettings = {
    ...structuredClone(DEFAULT_SETTINGS),
    ...overrides,
  };
  Object.defineProperty(instance, "app", {
    configurable: true,
    value: {
      workspace: {
        getLeavesOfType: (type: string) =>
          type === "markdown" ? views.map((view) => ({ view })) : [],
      },
    },
  });
  return instance;
}

describe("rendered Markdown setting resolution", () => {
  it("uses markdownEditor when the owning MarkdownView is in source mode", () => {
    const container = document.createElement("div");
    const element = container.appendChild(document.createElement("div"));
    const instance = plugin(
      [fakeMarkdownView("source", "note.md", container)],
      { markdownEditor: false, markdownReading: true },
    );

    expect(instance.markdownHighlightEnabled(element, context("note.md"))).toBe(false);
  });

  it("uses markdownReading when the owning MarkdownView is in preview mode", () => {
    const container = document.createElement("div");
    const element = container.appendChild(document.createElement("div"));
    const instance = plugin(
      [fakeMarkdownView("preview", "note.md", container)],
      { markdownEditor: false, markdownReading: true },
    );

    expect(instance.markdownHighlightEnabled(element, context("note.md"))).toBe(true);
  });

  it("prioritizes DOM ownership over sourcePath for transcluded Markdown", () => {
    const hostContainer = document.createElement("div");
    const element = hostContainer.appendChild(document.createElement("div"));
    const embeddedContainer = document.createElement("div");
    const instance = plugin(
      [
        fakeMarkdownView("source", "host.md", hostContainer),
        fakeMarkdownView("preview", "embedded.md", embeddedContainer),
      ],
      { markdownEditor: false, markdownReading: true },
    );

    expect(instance.markdownHighlightEnabled(element, context("embedded.md"))).toBe(false);
  });

  it("uses a unique sourcePath match when the processor element is not mounted yet", () => {
    const element = document.createElement("div");
    const instance = plugin(
      [fakeMarkdownView("source", "note.md", document.createElement("div"))],
      { markdownEditor: false, markdownReading: true },
    );

    expect(instance.markdownHighlightEnabled(element, context("note.md"))).toBe(false);
  });

  it("falls back conservatively to markdownReading when ownership is ambiguous", () => {
    const element = document.createElement("div");
    const instance = plugin(
      [
        fakeMarkdownView("source", "note.md", document.createElement("div")),
        fakeMarkdownView("preview", "note.md", document.createElement("div")),
      ],
      { markdownEditor: false, markdownReading: true },
    );

    expect(instance.markdownHighlightEnabled(element, context("note.md"))).toBe(true);
  });

  it("falls back to markdownReading when there is no associated MarkdownView", () => {
    const instance = plugin([], {
      markdownEditor: true,
      markdownReading: false,
    });

    expect(
      instance.markdownHighlightEnabled(
        document.createElement("div"),
        context("orphan.md"),
      ),
    ).toBe(false);
  });
});
