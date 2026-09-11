// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { commonLanguageByFence } from "../src/common-languages";
import { LanguageRegistry } from "../src/languages";
import { renderCommonCode, renderMudCode, renderSyntaxCode } from "../src/reading";
import { DEFAULT_SETTINGS } from "../src/settings";

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

  it("uses CodeMirror parsing and a language badge for common reading blocks", () => {
    const language = commonLanguageByFence("csharp");
    expect(language).toBeDefined();
    const container = document.createElement("div");
    renderCommonCode("class Example { string Name; }", container, language!);

    expect(container.querySelector("code")?.classList.contains("language-cs")).toBe(true);
    expect(container.querySelector(".syntax-common-keyword")).not.toBeNull();
    expect(container.querySelectorAll(".syntax-code-line")).toHaveLength(1);
    expect(container.querySelector(".syntax-language-badge-text")?.textContent).toBe("C#");
    expect(container.querySelector(".syntax-language-badge-mud")).toBeNull();
  });

  it("renders Text blocks as theme-aware plain source without code furniture", () => {
    const language = commonLanguageByFence("text");
    expect(language?.engine.kind).toBe("plain");
    const source = "Comando conceptual\n  salida literal: foo & bar";
    const container = document.createElement("div");

    renderCommonCode(source, container, language!, true);

    expect(container.querySelector("code")?.classList.contains("language-text")).toBe(true);
    expect(container.querySelector(".syntax-language-badge")).toBeNull();
    expect(container.querySelector(".has-language-badge")).toBeNull();
    expect(container.querySelector(".syntax-highlight-block")?.classList.contains("has-line-numbers"))
      .toBe(false);
    const lines = Array.from(container.querySelectorAll(".syntax-code-line"));
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => !line.hasAttribute("data-line-number"))).toBe(true);
    expect(lines.map((line) => line.getAttribute("data-source-line"))).toEqual(["1", "2"]);
    const plain = Array.from(container.querySelectorAll(".syntax-common-plain"));
    expect(plain.map((node) => node.textContent).join("\n")).toContain("Comando conceptual");
    expect(container.querySelector("[class*='token ']")).toBeNull();
    expect(container.querySelector("code")?.textContent).toBe(
      "Comando conceptual  salida literal: foo & bar",
    );
  });

  it("applies the no-furniture Text policy through plaintext and txt aliases", () => {
    for (const fence of ["plaintext", "txt"]) {
      const language = commonLanguageByFence(fence);
      expect(language?.id).toBe("text");
      const container = document.createElement("div");
      renderCommonCode("uno\ndos", container, language!, true);

      expect(container.querySelector(".syntax-language-badge")).toBeNull();
      expect(container.querySelector(".has-line-numbers")).toBeNull();
      expect(container.querySelector("[data-line-number]")).toBeNull();
    }
  });

  it("propagates explicit Text presentation modifiers without restoring code furniture", () => {
    const language = commonLanguageByFence("text")!;
    const container = document.createElement("div");
    renderCommonCode(
      "alpha beta gamma",
      container,
      language,
      true,
      "text-right-justified",
    );

    const frame = container.querySelector(".syntax-highlight-frame");
    expect(frame?.classList.contains("syntax-presentation-family-text")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-align-right")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-flow-justified")).toBe(true);
    expect(container.querySelector(".syntax-language-badge")).toBeNull();
    expect(container.querySelector(".has-line-numbers")).toBeNull();
  });

  it("treats Markdown as presentational while retaining Markdown syntax tokens", () => {
    const language = commonLanguageByFence("markdown")!;
    const container = document.createElement("div");
    renderCommonCode(
      "# Heading\n**bold**",
      container,
      language,
      true,
      "markdown-center-ragged",
    );

    const frame = container.querySelector(".syntax-highlight-frame");
    expect(frame?.classList.contains("syntax-presentation-family-markdown")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-align-center")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-flow-ragged")).toBe(true);
    expect(container.querySelector(".syntax-language-badge")).toBeNull();
    expect(container.querySelector(".has-line-numbers")).toBeNull();
    expect(container.querySelector('[class*="syntax-common-"]')).not.toBeNull();
  });

  it("keeps the exact Bash command source while exposing callable and operator semantics", () => {
    const language = commonLanguageByFence("bash");
    expect(language).toBeDefined();
    const source = "./programa &";
    const container = document.createElement("div");

    renderCommonCode(source, container, language!);

    const line = container.querySelector(".syntax-code-line-content");
    expect(line?.textContent).toBe(source);
    expect(line?.querySelector(".syntax-common-callable")?.textContent)
      .toBe("./programa");
    expect(line?.querySelector(".syntax-common-operator")?.textContent)
      .toBe("&");
    expect(line?.querySelector(".syntax-common-plain")?.textContent).toBe(" ");
  });

  it("keeps Nushell callable and unclassified external-command source visible", () => {
    const language = commonLanguageByFence("nu");
    expect(language).toBeDefined();
    const source = "job spawn { ^./programa }";
    const container = document.createElement("div");

    renderCommonCode(source, container, language!);

    const line = container.querySelector(".syntax-code-line-content");
    expect(line?.textContent).toBe(source);
    expect(line?.querySelector(".syntax-common-callable")?.textContent)
      .toBe("job");
    expect(line?.querySelector(".syntax-common-string")?.textContent)
      .toBe("spawn");
    const plainText = Array.from(
      line?.querySelectorAll(".syntax-common-plain") ?? [],
    ).map((node) => node.textContent ?? "").join("");
    expect(plainText).toContain("^./programa");
  });

  it("renders Nushell from the nu fence and labels it as Nushell", () => {
    const language = commonLanguageByFence("nu");
    expect(language?.id).toBe("nu");
    const container = document.createElement("div");
    renderCommonCode(
      "job spawn { ^./programa }\nlet files = (ls | where size > 1mb)",
      container,
      language!,
    );

    expect(container.querySelector("code")?.classList.contains("language-nu")).toBe(true);
    expect(container.querySelector(".syntax-language-badge-text")?.textContent)
      .toBe("Nushell");
    expect(container.querySelector('[class*="syntax-common-"]')).not.toBeNull();
    expect(container.querySelector(".syntax-common-keyword")).not.toBeNull();
  });

  it("renders Bash with the Bash badge", () => {
    const language = commonLanguageByFence("bash");
    expect(language?.id).toBe("bash");
    const container = document.createElement("div");
    renderCommonCode(
      "for file in *.txt; do\n  echo \"$file\"\ndone",
      container,
      language!,
    );

    expect(container.querySelector("code")?.classList.contains("language-bash")).toBe(true);
    expect(container.querySelector(".syntax-language-badge-text")?.textContent)
      .toBe("Bash");
    expect(container.querySelector('[class*="syntax-common-"]')).not.toBeNull();
    expect(container.querySelector(".syntax-common-keyword")).not.toBeNull();
  });

  it("renders PowerShell with plugin semantic classes", () => {
    const language = commonLanguageByFence("powershell");
    expect(language?.id).toBe("powershell");
    const container = document.createElement("div");
    renderCommonCode(
      "$items = Get-ChildItem | Where-Object { $_.Length -gt 0 }\n# comentario",
      container,
      language!,
    );

    expect(container.querySelector("code")?.classList.contains("language-powershell")).toBe(true);
    expect(container.querySelector(".syntax-language-badge-text")?.textContent)
      .toBe("PowerShell");
    expect(container.querySelector('[class*="syntax-common-"]')).not.toBeNull();
    expect(container.querySelector(".syntax-common-comment")?.textContent).toBe("# comentario");
  });

  it("colors TOML through its configurable primary profile", () => {
    const registry = new LanguageRegistry(
      structuredClone(DEFAULT_SETTINGS),
      () => Promise.resolve(""),
    );
    const runtime = registry.get("toml");
    expect(runtime).toBeDefined();
    const container = document.createElement("div");
    renderSyntaxCode(
      '[server]\nport = 8080\nenabled = true\nname = "Mud"\n# local',
      container,
      runtime!,
    );

    expect(container.querySelector("code")?.classList.contains("language-toml")).toBe(true);
    expect(container.querySelector(".syntax-language-badge-text")?.textContent).toBe("TOML");
    expect(container.querySelector(".syntax-color-toml-bare-key")).not.toBeNull();
    expect(container.querySelector(".syntax-color-toml-table-header")).not.toBeNull();
    expect(container.querySelector(".syntax-color-toml-string")).not.toBeNull();
    expect(container.querySelector(".syntax-color-toml-number")).not.toBeNull();
    expect(container.querySelector(".syntax-color-toml-comment")).not.toBeNull();
  });
});
