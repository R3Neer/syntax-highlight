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

describe("schema v4 and portability", () => {
  it("migrates v3 settings with portable defaults", () => {
    const loaded = loadSettings({
      schemaVersion: 3,
      autoReloadGrammar: false,
      languages: DEFAULT_SETTINGS.languages,
      customThemes: [],
    });
    expect(loaded.schemaVersion).toBe(4);
    expect(loaded.markdownReading).toBe(true);
    expect(loaded.markdownEditor).toBe(true);
    expect(loaded.sourceEditor).toBe(true);
    expect(loaded.locale).toBe("auto");
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

  it("excludes source, preview, and grammar contents from diagnostics", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.languages[0].previewSource = "SECRET_PREVIEW";
    settings.languages[0].embeddedLexicalGrammar = "SECRET_GRAMMAR";
    const diagnostic = JSON.stringify(diagnosticSettings(settings));
    expect(diagnostic).not.toContain("SECRET_PREVIEW");
    expect(diagnostic).not.toContain("SECRET_GRAMMAR");
  });
});
