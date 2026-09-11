import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  join(process.cwd(), "packages", "obsidian", "styles.css"),
  "utf8",
);

function selectorBody(selector) {
  const marker = `${selector} {`;
  const from = styles.indexOf(marker);
  if (from < 0) throw new Error(`Missing selector ${selector}`);
  const bodyFrom = from + marker.length;
  const to = styles.indexOf("\n}", bodyFrom);
  if (to < 0) throw new Error(`Unclosed selector ${selector}`);
  return styles.slice(bodyFrom, to);
}

function relativeLuminance(hex) {
  const channels = hex
    .replace(/^#/, "")
    .match(/.{2}/g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastAgainstBlack(hex) {
  return (relativeLuminance(hex) + 0.05) / 0.05;
}

const DARK_FALLBACKS = [
  "#d4d4d4",
  "#6a9955",
  "#dcdcaa",
  "#d16969",
  "#c586c0",
  "#ce9178",
  "#b5cea8",
  "#9cdcfe",
  "#4ec9b0",
  "#f44747",
  "#858c99",
];

describe("quoted source dark palette", () => {
  it("owns a black source surface while preserving inherited overrides", () => {
    const body = selectorBody(".cm-line.syntax-editor-code-source");

    expect(body).toContain(
      "background-color: var(--syntax-editor-code-background, #000);",
    );
    expect(body).toContain(
      "color: var(--syntax-editor-code-color, #d4d4d4);",
    );
    expect(body).toContain(
      "caret-color: var(--syntax-editor-code-caret, #d4d4d4);",
    );
    expect(body).not.toMatch(/--syntax-editor-code-background\s*:/);
    expect(body).not.toMatch(/--syntax-editor-code-color\s*:/);
    expect(body).not.toMatch(/--syntax-editor-code-caret\s*:/);
  });

  it("hands the surface to Obsidian's public blockquote variable without widening scope", () => {
    const body = selectorBody(".cm-line.syntax-editor-code-source");

    expect(body).toContain(
      "--blockquote-background-color: var(--syntax-editor-code-background, #000);",
    );
    expect(body).not.toMatch(/--blockquote-color\s*:/);
    expect(styles.match(/--blockquote-background-color\s*:/g) ?? []).toHaveLength(1);
  });

  it("remaps every public code variable used by host furniture to the plugin palette", () => {
    const body = selectorBody(".cm-line.syntax-editor-code-source");
    const expected = [
      "--code-background: transparent;",
      "--code-normal: var(--syntax-editor-code-color, #d4d4d4);",
      "--code-comment: var(--syntax-common-comment, #6a9955);",
      "--code-function: var(--syntax-common-callable, #dcdcaa);",
      "--code-important: var(--syntax-common-regex, #d16969);",
      "--code-keyword: var(--syntax-common-keyword, #c586c0);",
      "--code-string: var(--syntax-common-string, #ce9178);",
      "--code-value: var(--syntax-common-number, #b5cea8);",
      "--code-operator: var(--syntax-common-operator, #d4d4d4);",
      "--code-property: var(--syntax-common-property, #9cdcfe);",
      "--code-punctuation: var(--syntax-common-punctuation, #d4d4d4);",
      "--code-tag: var(--syntax-common-meta, #c586c0);",
      "--caret-color: var(--syntax-editor-code-caret, #d4d4d4);",
    ];

    for (const declaration of expected) expect(body).toContain(declaration);
  });

  it("keeps all ordinary dark fallbacks above WCAG AA contrast on black", () => {
    for (const color of DARK_FALLBACKS) {
      expect(contrastAgainstBlack(color), color).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gives invalid tokens and line numbers explicit dark-safe fallbacks", () => {
    expect(
      selectorBody(
        ".cm-line.syntax-editor-code-source .syntax-common-invalid",
      ),
    ).toContain("var(--syntax-common-invalid, #f44747)");
    expect(
      selectorBody(
        ".cm-line.syntax-editor-code-source .syntax-editor-line-number",
      ),
    ).toContain("var(--syntax-editor-code-line-number, #858c99)");
  });

  it("does not regain private host styling hooks or specificity escalation", () => {
    const quotedSection = styles.slice(
      styles.indexOf(".cm-line.syntax-editor-code-source"),
      styles.indexOf(".syntax-token-comment"),
    );

    expect(quotedSection).not.toContain("!important");
    expect(quotedSection).not.toContain("HyperMD-");
    expect(quotedSection).not.toContain(".cm-inline-code");
    expect(quotedSection).not.toContain(".cm-embed-block");
    expect(quotedSection).not.toContain(".cm-callout");
  });
});
