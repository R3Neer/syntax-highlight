import { describe, expect, it } from "vitest";

import {
  buildBlockPresentationCss,
  canonicalPresentationFence,
  commonFenceMatch,
  commonFenceNames,
  presentationClassNames,
  resolveBlockPresentation,
  rewritePresentationFences,
} from "../src/block-presentation";

describe("presentational fence modifiers", () => {
  it("parses canonical full and partial overrides without creating languages", () => {
    const full = commonFenceMatch("TEXT-right-justified");
    expect(full).toMatchObject({
      baseFence: "text",
      family: "text",
      alignment: "right",
      flow: "justified",
    });
    expect(full?.language.id).toBe("text");

    expect(commonFenceMatch("md-center-ragged")).toMatchObject({
      baseFence: "md",
      family: "markdown",
      alignment: "center",
      flow: "ragged",
    });
    expect(commonFenceMatch("plaintext-justified")).toMatchObject({
      baseFence: "plaintext",
      flow: "justified",
    });
    expect(commonFenceMatch("markdown-right")).toMatchObject({
      baseFence: "markdown",
      alignment: "right",
    });
  });

  it("rejects invalid order, duplicate dimensions, and modifiers on code languages", () => {
    expect(commonFenceMatch("text-justified-right")).toBeUndefined();
    expect(commonFenceMatch("text-left-center")).toBeUndefined();
    expect(commonFenceMatch("markdown-ragged-justified")).toBeUndefined();
    expect(commonFenceMatch("bash-center")).toBeUndefined();
  });

  it("enumerates the finite variants Obsidian must register", () => {
    const names = new Set(commonFenceNames());
    for (const name of [
      "text",
      "text-left",
      "text-justified",
      "text-right-justified",
      "plaintext-center-ragged",
      "md-left-justified",
      "markdown-right-ragged",
      "powershell",
    ]) {
      expect(names.has(name)).toBe(true);
    }
    expect(names.has("bash-center")).toBe(false);
  });

  it("resolves omitted dimensions from defaults and canonicalizes full state", () => {
    const match = commonFenceMatch("text-right")!;
    const resolved = resolveBlockPresentation(match, {
      alignment: "center",
      flow: "justified",
    });
    expect(resolved).toEqual({ alignment: "right", flow: "justified" });
    expect(canonicalPresentationFence(match, resolved)).toBe(
      "text-right-justified",
    );
    expect(presentationClassNames(match)).toEqual([
      "syntax-presentational",
      "syntax-presentation-family-text",
      "syntax-presentation-align-right",
    ]);
  });
});

describe("presentation-preserving fence rewrite", () => {
  it("freezes only blocks whose resolved appearance would change", () => {
    const source = [
      "before",
      "```text title=demo",
      "implicit",
      "```",
      "```text-center",
      "explicit alignment",
      "```",
      "~~~plaintext-justified extra",
      "partial override",
      "~~~",
      "```markdown",
      "other family",
      "```",
    ].join("\n");
    const result = rewritePresentationFences(
      source,
      "text",
      { alignment: "left", flow: "ragged" },
      { alignment: "right", flow: "ragged" },
    );

    expect(result.changedBlocks).toBe(2);
    expect(result.source).toContain("```text-left-ragged title=demo");
    expect(result.source).toContain("```text-center\n");
    expect(result.source).toContain("~~~plaintext-left-justified extra");
    expect(result.source).toContain("```markdown\n");
  });

  it("freezes a previously inherited flow when that default changes", () => {
    const source = "```text-center\r\nalpha beta gamma\r\n```\r\n";
    const result = rewritePresentationFences(
      source,
      "text",
      { alignment: "left", flow: "ragged" },
      { alignment: "left", flow: "justified" },
    );
    expect(result.changedBlocks).toBe(1);
    expect(result.source).toBe(
      "```text-center-ragged\r\nalpha beta gamma\r\n```\r\n",
    );
  });

  it("does nothing to fully explicit blocks", () => {
    const source = "```md-right-justified\n# title\n```";
    const result = rewritePresentationFences(
      source,
      "markdown",
      { alignment: "left", flow: "ragged" },
      { alignment: "center", flow: "justified" },
    );
    expect(result).toEqual({ source, changedBlocks: 0 });
  });

  it("rewrites inherited presentation inside blockquotes and callouts only at the fence label", () => {
    const source = [
      "> [!info]",
      "> before",
      "> ```text title=quoted",
      "> alpha beta",
      "> ```",
      "> ~~~markdown-center extra",
      "> # heading",
      "> ~~~",
    ].join("\n");

    const textResult = rewritePresentationFences(
      source,
      "text",
      { alignment: "left", flow: "ragged" },
      { alignment: "right", flow: "ragged" },
    );
    expect(textResult.changedBlocks).toBe(1);
    expect(textResult.source).toContain("> ```text-left-ragged title=quoted");
    expect(textResult.source).toContain("> alpha beta");
    expect(textResult.source).toContain("> ```\n");

    const markdownResult = rewritePresentationFences(
      textResult.source,
      "markdown",
      { alignment: "left", flow: "ragged" },
      { alignment: "left", flow: "justified" },
    );
    expect(markdownResult.changedBlocks).toBe(1);
    expect(markdownResult.source).toContain("> ~~~markdown-center-ragged extra");
    expect(markdownResult.source).toContain("> # heading");
  });

  it("does not rewrite presentational fence examples nested in unrelated fences", () => {
    const source = [
      "````example",
      "```text",
      "literal example",
      "```",
      "> ```text",
      "> quoted literal example",
      "> ```",
      "````",
      "```text",
      "real block",
      "```",
    ].join("\n");
    const result = rewritePresentationFences(
      source,
      "text",
      { alignment: "left", flow: "ragged" },
      { alignment: "center", flow: "ragged" },
    );

    expect(result.changedBlocks).toBe(1);
    expect(result.source).toContain(
      "````example\n```text\nliteral example\n```\n> ```text\n> quoted literal example\n> ```\n````",
    );
    expect(result.source).toContain("```text-left-ragged\nreal block\n```");
  });
});

describe("presentation CSS", () => {
  it("encodes live family defaults and local override rules", () => {
    const css = buildBlockPresentationCss({
      text: { alignment: "center", flow: "ragged" },
      markdown: { alignment: "right", flow: "justified" },
    });
    expect(css).toContain(
      ".syntax-presentation-family-text{--syntax-presentation-alignment:center;",
    );
    expect(css).toContain(
      ".syntax-presentation-family-markdown{--syntax-presentation-alignment:right;--syntax-presentation-text-align:justify;",
    );
    expect(css).toContain(
      ".syntax-presentation-flow-ragged{--syntax-presentation-text-align:var(--syntax-presentation-alignment);",
    );
    expect(css).toContain(
      ".syntax-presentation-flow-justified{--syntax-presentation-text-align:justify;",
    );
  });
});
