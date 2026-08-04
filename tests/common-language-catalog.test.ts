// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { renderCommonLanguageCatalog } from "../src/common-language-catalog";
import { commonLanguages } from "../src/common-languages";

describe("common language settings catalog", () => {
  it("shows every built-in language and exposes TOML support", () => {
    const container = document.createElement("div");
    renderCommonLanguageCatalog(container, (_english, spanish) => spanish);

    const details = container.querySelector("details");
    const items = container.querySelectorAll(".syntax-common-language-item");
    const toml = container.querySelector('[data-language-id="toml"]');
    expect(details?.open).toBe(true);
    expect(items).toHaveLength(commonLanguages().length);
    expect(toml?.textContent).toContain("TOML");
    expect(toml?.textContent).toContain("bloques: toml");
    expect(toml?.textContent).toContain("extensiones: .toml");
  });

  it("explains that Markdown keeps the native Obsidian editor", () => {
    const container = document.createElement("div");
    renderCommonLanguageCatalog(container, (_english, spanish) => spanish);

    expect(
      container.querySelector('[data-language-id="markdown"]')?.textContent,
    ).toContain("editor nativo de Obsidian");
  });
});
