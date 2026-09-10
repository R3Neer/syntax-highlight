// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { commonLanguageByFence } from "../src/common-languages";
import { LanguageRegistry } from "../src/languages";
import { renderCommonCode, renderMudCode, renderSyntaxCode } from "../src/reading";
import { DEFAULT_SETTINGS } from "../src/settings";

function emulateObservedObsidianHighlightPass(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("pre > code").forEach((code) => {
    if (code.classList.contains("is-loaded")) return;
    const languageClasses = [...code.classList].filter((value) =>
      value.startsWith("language-"),
    );
    if (languageClasses.length === 0) return;
    code.classList.add("is-loaded");
    code.parentElement?.classList.add(...languageClasses);
  });
}

function expectHostPassToLeavePreUnclassified(root: HTMLElement): void {
  const pre = root.querySelector("pre");
  const code = root.querySelector("pre > code");
  expect(pre).not.toBeNull();
  expect(code).not.toBeNull();
  expect(code?.classList.contains("is-loaded")).toBe(true);
  expect([...pre!.classList].some((value) => value.startsWith("language-"))).toBe(false);

  emulateObservedObsidianHighlightPass(root);

  expect([...pre!.classList].some((value) => value.startsWith("language-"))).toBe(false);
}

describe("rendered Obsidian host rehighlight boundary", () => {
  it("prevents the observed second native pass for parser-backed common output", () => {
    const language = commonLanguageByFence("powershell");
    expect(language).toBeDefined();
    const root = document.createElement("div");

    renderCommonCode("$foo = 42\nWrite-Host $foo", root, language!);

    expect(root.querySelector("code")?.classList.contains("language-powershell")).toBe(true);
    expectHostPassToLeavePreUnclassified(root);
  });

  it("uses the same already-loaded contract for presentational common output", () => {
    for (const fence of ["text", "markdown"]) {
      const language = commonLanguageByFence(fence);
      expect(language).toBeDefined();
      const root = document.createElement("div");

      renderCommonCode("content", root, language!, false, fence);

      expectHostPassToLeavePreUnclassified(root);
    }
  });

  it("protects configured syntax output and MUD through the shared renderer", () => {
    const registry = new LanguageRegistry(
      structuredClone(DEFAULT_SETTINGS),
      () => Promise.resolve(""),
    );
    const toml = registry.get("toml");
    expect(toml).toBeDefined();

    const configured = document.createElement("div");
    renderSyntaxCode("port = 8080", configured, toml!);
    expectHostPassToLeavePreUnclassified(configured);

    const mud = document.createElement("div");
    renderMudCode("thing World {}", mud);
    expectHostPassToLeavePreUnclassified(mud);
  });
});
