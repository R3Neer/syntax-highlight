import { describe, expect, it } from "vitest";

import { LanguageRegistry } from "../src/languages";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  paletteFromPreset,
} from "../src/settings";
import { buildThemeCss } from "../src/themes";

describe("settings and themes", () => {
  it("preserves the current palettes as the language defaults", () => {
    const settings = loadSettings(undefined);
    const mud = settings.languages.find(({ id }) => id === "mud");
    const ebnf = settings.languages.find(({ id }) => id === "ebnf");

    expect(mud?.palette.dark.keyword).toBe("#f5c2e7");
    expect(ebnf?.palette.dark.definition).toBe("#569cd6");
    expect(ebnf?.palette.light.definition).toBe("#0000ff");
  });

  it("copies presets and emits separate light and dark rules", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.languages[0].palette = paletteFromPreset("vscode");
    const css = buildThemeCss(settings);

    expect(css).toContain(
      ".theme-light .syntax-color-mud-definition{color:#0000ff!important}",
    );
    expect(css).toContain(
      ".theme-dark .syntax-color-ebnf-definition{color:#569cd6!important}",
    );
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
});
