// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { renderCommonLanguageCatalog } from "../src/common-language-catalog";
import { commonLanguages } from "../src/common-languages";

describe("common language settings catalog", () => {
  it("shows every auxiliary common language without duplicating primary profiles", () => {
    const container = document.createElement("div");
    renderCommonLanguageCatalog(container, (_english, spanish) => spanish);

    const details = container.querySelector("details");
    const items = container.querySelectorAll(".syntax-common-language-item");
    expect(details?.open).toBe(true);
    expect(items).toHaveLength(commonLanguages().length);
    expect(container.querySelector('[data-language-id="toml"]')).toBeNull();
    expect(container.querySelector('[data-language-id="yaml"]')).not.toBeNull();
    expect(container.querySelector('[data-language-id="text"]')).not.toBeNull();
  });

  it("explains editor coverage for Markdown and parserless Text blocks", () => {
    const container = document.createElement("div");
    renderCommonLanguageCatalog(container, (_english, spanish) => spanish);

    expect(
      container.querySelector('[data-language-id="markdown"]')?.textContent,
    ).toContain("editor nativo de Obsidian");
    expect(
      container.querySelector('[data-language-id="text"]')?.textContent,
    ).toContain("solo bloques Markdown");
  });
});
