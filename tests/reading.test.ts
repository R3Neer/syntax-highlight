// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { commonLanguageByFence } from "../src/common-languages";
import { renderCommonCode, renderMudCode } from "../src/reading";

describe("reading view rendering", () => {
  it("renders decorative line numbers and the exact Mud badge", () => {
    const container = document.createElement("div");
    renderMudCode("thing A {}\nrule Ready { true }", container);

    const code = container.querySelector("code");
    const lines = container.querySelectorAll(".syntax-code-line");
    const badge = container.querySelector(".syntax-language-badge-mud");
    expect(lines).toHaveLength(2);
    expect(lines[0]?.getAttribute("data-line-number")).toBe("1");
    expect(lines[1]?.getAttribute("data-line-number")).toBe("2");
    expect(lines[0]?.querySelector(".syntax-code-line-content")?.textContent)
      .toBe("thing A {}");
    expect(lines[1]?.querySelector(".syntax-code-line-content")?.textContent)
      .toBe("rule Ready { true }");
    expect(badge?.querySelector("text")?.textContent).toBe("Mud");
    expect(code?.textContent).toBe("thing A {}rule Ready { true }");
    expect(code?.textContent).not.toContain("1");
    expect(code?.textContent).not.toContain("2");
  });

  it("uses CodeMirror parsing for common reading blocks", () => {
    const language = commonLanguageByFence("csharp");
    expect(language).toBeDefined();
    const container = document.createElement("div");
    renderCommonCode("class Example { string Name; }", container, language!);

    expect(container.querySelector("code")?.className).toBe("language-cs");
    expect(container.querySelector(".syntax-common-keyword")).not.toBeNull();
    expect(container.querySelectorAll(".syntax-code-line")).toHaveLength(1);
    expect(container.querySelector(".syntax-language-badge-mud")).toBeNull();
  });
});
