// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { renderCommonLanguageCatalog } from "../src/common-language-catalog";
import { commonLanguages, enabledCommonSourceLanguages } from "../src/common-languages";

describe("common language settings catalog", () => {
  it("shows every auxiliary common language without duplicating primary profiles", () => {
    const container = document.createElement("div");
    renderCommonLanguageCatalog(container, (_english, spanish) => spanish, new Set(), () => {});

    const details = container.querySelector("details");
    const items = container.querySelectorAll(".syntax-common-language-item");
    expect(details?.open).toBe(true);
    expect(items).toHaveLength(commonLanguages().length);
    expect(container.querySelector('[data-language-id="toml"]')).toBeNull();
    expect(container.querySelector('[data-language-id="yaml"]')).not.toBeNull();
    expect(container.querySelector('[data-language-id="text"]')).not.toBeNull();
    expect(container.querySelectorAll('[role="switch"]')).toHaveLength(
      enabledCommonSourceLanguages(new Set()).length,
    );
  });

  it("explains editor coverage for Markdown and parserless Text blocks", () => {
    const container = document.createElement("div");
    renderCommonLanguageCatalog(container, (_english, spanish) => spanish, new Set(), () => {});

    expect(
      container.querySelector('[data-language-id="markdown"]')?.textContent,
    ).toContain("editor nativo de Obsidian");
    expect(
      container.querySelector('[data-language-id="text"]')?.textContent,
    ).toContain("solo bloques Markdown");
  });

  it("starts source-file switches on and reports changes without hiding Markdown languages", () => {
    const container = document.createElement("div");
    const changes: Array<[string, boolean]> = [];
    renderCommonLanguageCatalog(
      container,
      (_english, spanish) => spanish,
      new Set(["python"]),
      (id, enabled) => { changes.push([id, enabled]); },
    );
    const python = container.querySelector<HTMLInputElement>(
      '[data-language-id="python"] input[role="switch"]',
    )!;
    const haskell = container.querySelector<HTMLInputElement>(
      '[data-language-id="haskell"] input[role="switch"]',
    )!;
    expect(python.checked).toBe(false);
    expect(haskell.checked).toBe(true);
    expect(container.querySelector('[data-language-id="markdown"] input')).toBeNull();
    expect(container.querySelector('[data-language-id="text"] input')).toBeNull();
    python.checked = true;
    python.dispatchEvent(new Event("change"));
    expect(changes).toEqual([["python", true]]);
  });
});
