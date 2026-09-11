import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

function source(name) {
  return readFileSync(
    join(process.cwd(), "packages", "obsidian", "src", name),
    "utf8",
  );
}

describe("common semantic architecture", () => {
  it("keeps SyntaxSourceView on native CodeMirror language support and highlighting", () => {
    const view = source("source-view.ts");

    expect(view).toContain("commonLanguageSupport(common)");
    expect(view).toContain("syntaxHighlighting(COMMON_SEMANTIC_HIGHLIGHTER)");
    expect(view).not.toContain("commonSemanticRanges");
    expect(view).not.toContain("StringStream");
  });

  it("keeps the catalog below the manual semantic-range layer", () => {
    const catalog = source("common-languages.ts");
    const ranges = source("common-semantic-ranges.ts");

    expect(catalog).not.toContain('from "./common-semantic-ranges"');
    expect(ranges).toContain('from "./common-languages"');
  });

  it("uses one tagHighlighter taxonomy instead of host-specific manual highlighters", () => {
    const catalog = source("common-languages.ts");
    const reading = source("reading.ts");
    const editor = source("editor-block-model.ts");

    expect(catalog).toContain("tagHighlighter([");
    expect(catalog).toContain("COMMON_SEMANTIC_HIGHLIGHTER");
    expect(catalog).not.toContain("COMMON_READING_HIGHLIGHT_STYLE");
    expect(catalog).not.toContain("COMMON_EDITOR_HIGHLIGHT_STYLE");
    expect(reading).toContain("commonSemanticRanges(language, source)");
    expect(editor).toContain("commonSemanticRanges(common!.language, block.body)");
  });

  it("does not add a PowerShell renderer branch", () => {
    const production = [
      source("reading.ts"),
      source("editor-block-model.ts"),
      source("common-semantic-ranges.ts"),
    ].join("\n");

    expect(production).not.toMatch(/language\.id\s*={2,3}\s*["']powershell["']/);
    expect(production).not.toMatch(/case\s+["']powershell["']/);
  });
});
