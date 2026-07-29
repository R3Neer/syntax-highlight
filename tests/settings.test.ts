import { describe, expect, it } from "vitest";

import {
  BUILTIN_DESCRIPTORS,
  validateLanguageDescriptor,
} from "../src/descriptor";
import { LanguageRegistry } from "../src/languages";
import {
  DEFAULT_SETTINGS,
  THEME_PRESETS,
  loadSettings,
  paletteFromPreset,
  themeById,
} from "../src/settings";
import { buildThemeCss } from "../src/themes";
import { tokenizeAsdl } from "../src/asdl-tokenizer";
import { tokenizeEbnf } from "../src/ebnf-tokenizer";
import { tokenizeMud } from "../src/tokenizer";

describe("settings, descriptors and themes", () => {
  it("preserves the current palettes and examples as language defaults", () => {
    const settings = loadSettings(undefined);
    const mud = settings.languages.find(({ id }) => id === "mud");
    const ebnf = settings.languages.find(({ id }) => id === "ebnf");

    expect(mud?.categoryColors.mud?.["reserved-word"]?.dark).toBe("#f5c2e7");
    expect(ebnf?.categoryColors.ebnf?.["production-definition"]?.dark).toBe(
      "#569cd6",
    );
    expect(ebnf?.categoryColors.ebnf?.["production-definition"]?.light).toBe(
      "#0000ff",
    );
    expect(BUILTIN_DESCRIPTORS.mud.previewSource).toContain("thing Alexandria");
    expect(BUILTIN_DESCRIPTORS.ebnf.previewSource).toContain("expression ::=");
    expect(BUILTIN_DESCRIPTORS.asdl.previewSource).toContain("module Mud");
    expect(BUILTIN_DESCRIPTORS.asdl.extensions).toEqual(["asdl"]);
  });

  it("emits separate light and dark rules for real categories", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const css = buildThemeCss(settings);

    expect(css).toContain(
      ".theme-light .syntax-color-mud-reserved-word{color:#f5c2e7!important}",
    );
    expect(css).toContain(
      ".theme-dark .syntax-color-ebnf-production-definition{color:#569cd6!important}",
    );
    expect(css).not.toContain("syntax-color-mud-function");
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

  it("migrates former category palettes into exact language overrides", () => {
    const stored: Record<string, unknown> = {
      schemaVersion: 2,
      autoReloadGrammar: true,
      customThemes: [],
      languages: [
        {
          id: "mud",
          themePreset: "mud-current",
          palette: {
            light: { keyword: "#123456" },
            dark: { keyword: "#654321" },
          },
        },
      ],
    };
    const loaded = loadSettings(stored);

    expect(loaded.languages[0].themePreset).toBe("catppuccin");
    expect(
      loaded.languages[0].categoryColors.mud?.["reserved-word"]?.dark,
    ).toBe("#654321");
  });

  it("loads and resolves named global custom themes with overrides", () => {
    const stored = structuredClone(DEFAULT_SETTINGS);
    const custom = {
      id: "custom-samuel",
      name: "Samuel",
      palette: paletteFromPreset("solarized"),
      overrides: {
        mud: { "invocation-name": { dark: "#123456" } },
      },
    };
    stored.customThemes.push(custom);
    stored.languages[1].themePreset = custom.id;
    stored.languages[1].palette = structuredClone(custom.palette);
    stored.languages[1].categoryColors = structuredClone(custom.overrides);
    const loaded = loadSettings(stored);

    expect(themeById(loaded, custom.id)?.name).toBe("Samuel");
    expect(loaded.languages[1].themePreset).toBe("custom-samuel");
    expect(
      themeById(loaded, custom.id)?.overrides.mud?.["invocation-name"]?.dark,
    ).toBe("#123456");
  });

  it("rejects duplicated and dangling descriptor data", () => {
    const descriptor = structuredClone(BUILTIN_DESCRIPTORS.ebnf);
    descriptor.categories.push({ ...descriptor.categories[0] });
    expect(() => validateLanguageDescriptor(descriptor)).toThrow(
      /categoría.*repetidos/i,
    );

    const dangling = structuredClone(BUILTIN_DESCRIPTORS.mud);
    dangling.grammarMappings[0].category = "missing";
    expect(() => validateLanguageDescriptor(dangling)).toThrow(
      /categoría inexistente missing/,
    );
  });

  it("declares every category emitted by each built-in tokenizer", () => {
    const samples = [
      [
        BUILTIN_DESCRIPTORS.mud,
        tokenizeMud(
          'thing A as B { rule R(x: Score) { call(x); 12:30 r0.5 "text" } }',
        ),
      ],
      [
        BUILTIN_DESCRIPTORS.ebnf,
        tokenizeEbnf(
          '(* note *) expression ::= NUMBER | "x" , [ item ] , { item } ; ? meta ?',
        ),
      ],
      [
        BUILTIN_DESCRIPTORS.asdl,
        tokenizeAsdl(
          "module Mud { expr = Name(identifier id) | Binary(expr* values) }",
        ),
      ],
    ] as const;
    for (const [descriptor, tokens] of samples) {
      const declared = new Set(descriptor.categories.map(({ id }) => id));
      expect(
        tokens.filter(({ categoryId }) => !declared.has(categoryId)),
      ).toEqual([]);
    }
  });
});

describe("language registry", () => {
  it("keeps the last valid MUD configuration when reloading fails", async () => {
    const registry = new LanguageRegistry(
      structuredClone(DEFAULT_SETTINGS),
      () => Promise.reject(new Error("broken source")),
    );

    expect(registry.get("mud")?.tokenize("thing")[0]?.categoryId).toBe(
      "reserved-word",
    );
    await registry.reload("mud");

    expect(registry.get("mud")?.status.state).toBe("error");
    expect(registry.get("mud")?.tokenize("thing")[0]?.categoryId).toBe(
      "reserved-word",
    );
  });

  it("loads an external descriptor and applies its aliases without recompiling", async () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const profile = settings.languages[1];
    const descriptor = structuredClone(BUILTIN_DESCRIPTORS.ebnf);
    descriptor.fences.push("grammar");
    const registry = new LanguageRegistry(settings, (path) => {
      if (path === profile.descriptorPath) {
        return Promise.resolve(JSON.stringify(descriptor));
      }
      return Promise.resolve("");
    });
    await registry.reload("ebnf");

    const runtime = registry.byFence("GRAMMAR");
    expect(runtime?.settings.id).toBe("ebnf");
    expect(registry.affectedBy(profile.descriptorPath)).toContain(runtime);
    expect(runtime?.tokenize("rule ::= \"x\";")[0]?.categoryId).toBe(
      "production-definition",
    );
  });

  it("uses the bundled descriptor when an external path is cleared", async () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.languages[1].descriptorPath = "";
    const registry = new LanguageRegistry(settings, () =>
      Promise.reject(new Error("no file should be read")),
    );

    await registry.reload("ebnf");

    expect(registry.get("ebnf")?.status.state).toBe("ready");
    expect(registry.byFence("ebnf")?.descriptor.name).toBe("EBNF");
  });

  it("resolves source file extensions through loaded descriptors", () => {
    const registry = new LanguageRegistry(
      structuredClone(DEFAULT_SETTINGS),
      () => Promise.resolve(""),
    );

    expect(registry.byExtension(".mud")?.settings.id).toBe("mud");
    expect(registry.byExtension("EBNF")?.settings.id).toBe("ebnf");
    expect(registry.byExtension("asdl")?.settings.id).toBe("asdl");
  });
});
