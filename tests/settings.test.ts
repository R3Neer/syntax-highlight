import { describe, expect, it } from "vitest";

import { LanguageRegistry } from "../src/languages";
import {
  DEFAULT_SETTINGS,
  THEME_PRESETS,
  loadSettings,
  paletteFromPreset,
  themeById,
} from "../src/settings";
import { buildThemeCss } from "../src/themes";

describe("settings and themes", () => {
  it("preserves the current palettes as the language defaults", () => {
    const settings = loadSettings(undefined);
    const mud = settings.languages.find(({ id }) => id === "mud");
    const ebnf = settings.languages.find(({ id }) => id === "ebnf");
    const asdl = settings.languages.find(({ id }) => id === "asdl");

    expect(mud?.palette.dark.keyword).toBe("#f5c2e7");
    expect(ebnf?.palette.dark.definition).toBe("#569cd6");
    expect(ebnf?.palette.light.definition).toBe("#0000ff");
    expect(mud?.previewSource).toContain("thing Alexandria");
    expect(ebnf?.previewSource).toContain("expression ::=");
    expect(asdl?.previewSource).toContain("module Mud");
    expect(asdl?.extensions).toEqual(["asdl"]);
  });

  it("copies presets and emits separate light and dark rules", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.languages[0].palette = paletteFromPreset("vscode-classic");
    const css = buildThemeCss(settings);

    expect(css).toContain(
      ".theme-light .syntax-color-mud-definition{color:#0000ff!important}",
    );
    expect(css).toContain(
      ".theme-dark .syntax-color-ebnf-definition{color:#569cd6!important}",
    );
  });

  it("offers only distinct named theme families", () => {
    expect(THEME_PRESETS.map(({ name }) => name)).toEqual([
      "Catppuccin",
      "Visual Studio Code Dark+/Light+",
      "Solarized",
      "GitHub Default",
      "Gruvbox",
    ]);
    expect(new Set(THEME_PRESETS.map(({ id }) => id)).size).toBe(5);
  });

  it("migrates former duplicate presets without losing stored colors", () => {
    const stored = structuredClone(DEFAULT_SETTINGS);
    stored.languages[0].themePreset = "mud-current";
    stored.languages[0].palette.dark.keyword = "#123456";
    const loaded = loadSettings(stored);

    expect(loaded.languages[0].themePreset).toBe("catppuccin");
    expect(loaded.languages[0].palette.dark.keyword).toBe("#123456");
  });

  it("loads and resolves named custom themes", () => {
    const stored = structuredClone(DEFAULT_SETTINGS);
    const custom = {
      id: "custom-samuel",
      name: "Samuel",
      palette: paletteFromPreset("solarized"),
    };
    stored.customThemes.push(custom);
    stored.languages[1].themePreset = custom.id;
    stored.languages[1].palette = structuredClone(custom.palette);
    const loaded = loadSettings(stored);

    expect(themeById(loaded, custom.id)?.name).toBe("Samuel");
    expect(loaded.languages[1].themePreset).toBe("custom-samuel");
  });
});

describe("language registry", () => {
  it("keeps the last valid MUD configuration when reloading fails", async () => {
    const registry = new LanguageRegistry(
      structuredClone(DEFAULT_SETTINGS),
      () => Promise.reject(new Error("broken grammar")),
    );

    expect(registry.get("mud")?.tokenize("thing")[0]?.kind).toBe("keyword");
    await registry.reload("mud");

    expect(registry.get("mud")?.status.state).toBe("error");
    expect(registry.get("mud")?.tokenize("thing")[0]?.kind).toBe("keyword");
  });

  it("resolves EBNF aliases through the enabled profiles", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.languages[1].fences.push("grammar");
    const registry = new LanguageRegistry(settings, () => Promise.resolve(""));

    const runtime = registry.byFence("GRAMMAR");
    expect(runtime?.settings.id).toBe("ebnf");
    expect(runtime?.tokenize("rule ::= 'x';")[0]?.kind).toBe("definition");
  });

  it("resolves source file extensions through the enabled profiles", () => {
    const registry = new LanguageRegistry(
      structuredClone(DEFAULT_SETTINGS),
      () => Promise.resolve(""),
    );

    expect(registry.byExtension(".mud")?.settings.id).toBe("mud");
    expect(registry.byExtension("EBNF")?.settings.id).toBe("ebnf");
    expect(registry.byExtension("asdl")?.settings.id).toBe("asdl");
  });
});
