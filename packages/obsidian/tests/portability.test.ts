import { describe, expect, it } from "vitest";

import { effectiveLocale, translate } from "../src/i18n";
import {
  diagnosticSettings,
  languageDocument,
  parsePortableDocument,
  settingsDocument,
  themeDocument,
} from "../src/portability";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  THEME_PRESETS,
} from "../src/settings";

describe("schema v5 and portability", () => {
  it("migrates v4 settings with editor defaults", () => {
    const loaded = loadSettings({
      schemaVersion: 4,
      autoReloadGrammar: false,
      languages: DEFAULT_SETTINGS.languages,
      customThemes: [],
    });
    expect(loaded.schemaVersion).toBe(5);
    expect(loaded.markdownReading).toBe(true);
    expect(loaded.markdownEditor).toBe(true);
    expect(loaded.sourceEditor).toBe(true);
    expect(loaded.locale).toBe("auto");
    expect(loaded.indentStyle).toBe("spaces");
    expect(loaded.indentSize).toBe(4);
    expect(loaded.lineNumbers).toBe(true);
    expect(loaded.autoClose).toBe(true);
  });

  it("honors explicit locales and English fallback strings", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.locale = "en";
    expect(effectiveLocale(settings)).toBe("en");
    expect(translate(settings, "Languages", "Lenguajes")).toBe("Languages");
    settings.locale = "es";
    expect(translate(settings, "Languages", "Lenguajes")).toBe("Lenguajes");
  });

  it("round-trips every portable document kind", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const documents = [
      settingsDocument(settings),
      languageDocument(settings.languages[0], [], "lexical", "syntax"),
      themeDocument(THEME_PRESETS[0]),
    ];
    for (const document of documents) {
      expect(
        parsePortableDocument(JSON.stringify(document)).kind,
      ).toBe(document.kind);
    }
  });

  it("migrates v1 language bundles to the separated v2 shape", () => {
    const profile = structuredClone(DEFAULT_SETTINGS.languages[0]);
    const migrated = parsePortableDocument(JSON.stringify({
      kind: "syntax-highlight-language",
      schemaVersion: 1,
      profile,
      lexicalGrammar: "lexical",
      syntaxGrammar: "syntax",
      themes: [THEME_PRESETS[0]],
    }));
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.kind).toBe("syntax-highlight-language");
    if (migrated.kind === "syntax-highlight-language") {
      expect(migrated.language.profile.id).toBe(profile.id);
      expect(migrated.language.grammars).toEqual({
        lexical: "lexical",
        syntax: "syntax",
      });
      expect(migrated.themes).toHaveLength(1);
    }
  });

  it("excludes source, preview, and grammar contents from diagnostics", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.languages[0].previewSource = "SECRET_PREVIEW";
    settings.languages[0].embeddedLexicalGrammar = "SECRET_GRAMMAR";
    const diagnostic = JSON.stringify(diagnosticSettings(settings));
    expect(diagnostic).not.toContain("SECRET_PREVIEW");
    expect(diagnostic).not.toContain("SECRET_GRAMMAR");
  });
});
