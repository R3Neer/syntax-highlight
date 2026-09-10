import { readFileSync } from "node:fs";
import { join } from "node:path";

import { highlightTree } from "@lezer/highlight";
import { describe, expect, it } from "vitest";

import {
  COMMON_EDITOR_HIGHLIGHT_STYLE,
  COMMON_READING_HIGHLIGHT_STYLE,
  commonLanguageByFence,
} from "../src/common-languages";
import { DEFAULT_SETTINGS } from "../src/settings";
import { buildThemeCss } from "../src/themes";

function highlightedClasses(
  fence: string,
  source: string,
  style: typeof COMMON_READING_HIGHLIGHT_STYLE,
): string[] {
  const language = commonLanguageByFence(fence);
  if (language === undefined) throw new Error(`Missing common language: ${fence}`);
  const tree = language.support().language.parser.parse(source);
  const classes: string[] = [];
  highlightTree(tree, style, (_from, _to, value) => classes.push(value));
  return classes;
}

describe("active theme compatibility", () => {
  it("emits Prism-compatible token classes in Reading view", () => {
    const classes = highlightedClasses(
      "js",
      "if (value) { return 1; }",
      COMMON_READING_HIGHLIGHT_STYLE,
    );

    expect(classes.some((value) => value.includes("syntax-common-keyword"))).toBe(true);
    expect(classes.some((value) => value.includes("token keyword"))).toBe(true);
  });

  it("emits CodeMirror-compatible token classes in Editing view", () => {
    const classes = highlightedClasses(
      "js",
      "if (value) { return 1; }",
      COMMON_EDITOR_HIGHLIGHT_STYLE,
    );

    expect(classes.some((value) => value.includes("syntax-common-keyword"))).toBe(true);
    expect(classes.some((value) => value.includes("cm-keyword"))).toBe(true);
  });

  it("maps declaration keywords to the active theme's keyword color", () => {
    const reading = highlightedClasses(
      "js",
      "const value = 1;",
      COMMON_READING_HIGHLIGHT_STYLE,
    );
    const editor = highlightedClasses(
      "js",
      "const value = 1;",
      COMMON_EDITOR_HIGHLIGHT_STYLE,
    );

    expect(
      reading.some((value) =>
        value.includes("syntax-common-declaration") && value.includes("token keyword"),
      ),
    ).toBe(true);
    expect(
      editor.some((value) =>
        value.includes("syntax-common-declaration") && value.includes("cm-keyword"),
      ),
    ).toBe(true);
  });

  it("keeps syntax presets scoped to settings previews", () => {
    const css = buildThemeCss(structuredClone(DEFAULT_SETTINGS));

    expect(css).toContain(".theme-light .syntax-preview-output{");
    expect(css).toContain("--syntax-common-keyword:");
    expect(css).not.toContain(".theme-light{--syntax-common-");
    expect(css).not.toContain(".theme-dark{--syntax-common-");
  });

  it("uses only theme-agnostic Obsidian code variables as CSS fallbacks", () => {
    const styles = readFileSync(
      join(process.cwd(), "packages", "obsidian", "styles.css"),
      "utf8",
    );

    expect(styles).not.toContain("Nier");
    expect(styles).not.toMatch(
      /var\(--(?:gray-2|purple|blue|red|green|orange|aqua|yellow)(?:,|\))/,
    );
    expect(styles).toContain("var(--code-keyword");
    expect(styles).toContain("var(--code-string");
    expect(styles).toContain("var(--code-function");
    expect(styles).toContain("var(--code-operator");
    expect(styles).toContain("--syntax-common-keyword");
  });

  it("gives parser-unclassified source a theme-safe normal text color", () => {
    const styles = readFileSync(
      join(process.cwd(), "packages", "obsidian", "styles.css"),
      "utf8",
    );

    expect(styles).toContain(
      ".syntax-common-plain { color: var(--syntax-common-text, var(--text-normal)); }",
    );
  });
});
