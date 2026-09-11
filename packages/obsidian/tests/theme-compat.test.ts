import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { commonSemanticRanges } from "../src/common-semantic-ranges";
import { commonLanguageByFence } from "../src/common-languages";
import { DEFAULT_SETTINGS } from "../src/settings";
import { buildThemeCss } from "../src/themes";

function highlightedClasses(fence: string, source: string): string[] {
  const language = commonLanguageByFence(fence);
  if (language === undefined) {
    throw new Error(`Missing common language: ${fence}`);
  }
  return commonSemanticRanges(language, source).map(({ classes }) => classes);
}

describe("active theme compatibility", () => {
  it("emits plugin semantic classes without Prism compatibility classes", () => {
    const classes = highlightedClasses("js", "if (value) { return 1; }");

    expect(classes.some((value) => value.includes("syntax-common-keyword"))).toBe(true);
    expect(classes.some((value) => value.includes("token keyword"))).toBe(false);
  });

  it("emits plugin semantic classes without CodeMirror compatibility classes", () => {
    const classes = highlightedClasses("js", "if (value) { return 1; }");

    expect(classes.some((value) => value.includes("syntax-common-keyword"))).toBe(true);
    expect(classes.some((value) => value.includes("cm-keyword"))).toBe(false);
  });

  it("routes PowerShell manual tokens through the plugin semantic taxonomy", () => {
    const classes = highlightedClasses(
      "powershell",
      "# note\n$items = Get-ChildItem",
    );

    expect(classes.some((value) => value.includes("syntax-common-comment"))).toBe(true);
    expect(classes.some((value) => value.includes("cm-comment"))).toBe(false);
    expect(classes.some((value) => value.includes("token comment"))).toBe(false);
  });

  it("maps declaration keywords to the common declaration role", () => {
    const classes = highlightedClasses("js", "const value = 1;");

    expect(
      classes.some((value) => value.includes("syntax-common-declaration")),
    ).toBe(true);
  });

  it("emits live Text and Markdown presentation defaults", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.blockPresentation.text = { alignment: "center", flow: "ragged" };
    settings.blockPresentation.markdown = { alignment: "right", flow: "justified" };
    const css = buildThemeCss(settings);

    expect(css).toContain(
      ".syntax-presentation-family-text{--syntax-presentation-alignment:center;",
    );
    expect(css).toContain(
      ".syntax-presentation-family-markdown{--syntax-presentation-alignment:right;--syntax-presentation-text-align:justify;",
    );
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

  it("does not hardcode shell-specific contrast overrides", () => {
    const styles = readFileSync(
      join(process.cwd(), "packages", "obsidian", "styles.css"),
      "utf8",
    );

    expect(styles).not.toContain(
      ".language-bash .syntax-common-callable.token.function",
    );
    expect(styles).not.toContain(
      ".language-nu .syntax-common-callable.token.function",
    );
    expect(styles).not.toContain(
      ".syntax-highlight-frame .syntax-common-callable.token.function",
    );
  });
});
