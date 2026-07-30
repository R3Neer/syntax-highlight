import type {
  LanguageProfileSettings,
  SyntaxPluginSettings,
  ThemePreset,
} from "./settings";

export const PORTABLE_SCHEMA_VERSION = 1;

export interface SettingsDocument {
  kind: "syntax-highlight-settings";
  schemaVersion: 1;
  settings: SyntaxPluginSettings;
}

export interface LanguageDocument {
  kind: "syntax-highlight-language";
  schemaVersion: 1;
  profile: LanguageProfileSettings;
  lexicalGrammar?: string;
  syntaxGrammar?: string;
  themes: ThemePreset[];
}

export interface ThemeDocument {
  kind: "syntax-highlight-theme";
  schemaVersion: 1;
  theme: ThemePreset;
}

export type PortableDocument =
  | SettingsDocument
  | LanguageDocument
  | ThemeDocument;

export function settingsDocument(settings: SyntaxPluginSettings): SettingsDocument {
  const copy = structuredClone(settings);
  copy.lastBackup = null;
  return { kind: "syntax-highlight-settings", schemaVersion: 1, settings: copy };
}

export function themeDocument(theme: ThemePreset): ThemeDocument {
  return {
    kind: "syntax-highlight-theme",
    schemaVersion: 1,
    theme: structuredClone(theme),
  };
}

export function languageDocument(
  profile: LanguageProfileSettings,
  themes: readonly ThemePreset[],
  lexicalGrammar?: string,
  syntaxGrammar?: string,
): LanguageDocument {
  const exported = structuredClone(profile);
  exported.embeddedLexicalGrammar = lexicalGrammar;
  exported.embeddedSyntaxGrammar = syntaxGrammar;
  exported.descriptorOrigin = "imported";
  return {
    kind: "syntax-highlight-language",
    schemaVersion: 1,
    profile: exported,
    lexicalGrammar,
    syntaxGrammar,
    themes: structuredClone([...themes]),
  };
}

export function parsePortableDocument(source: string): PortableDocument {
  const value: unknown = JSON.parse(source);
  if (typeof value !== "object" || value === null) {
    throw new Error("The imported document must be a JSON object.");
  }
  const object = value as Record<string, unknown>;
  if (object.schemaVersion !== 1) {
    throw new Error(`Unsupported portable schema: ${String(object.schemaVersion)}.`);
  }
  if (
    object.kind !== "syntax-highlight-settings" &&
    object.kind !== "syntax-highlight-language" &&
    object.kind !== "syntax-highlight-theme"
  ) {
    throw new Error(`Unknown portable document kind: ${String(object.kind)}.`);
  }
  return value as PortableDocument;
}

export function safePortableId(value: string): string {
  const stem = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return /^[a-z]/.test(stem) ? stem : `language-${stem || "imported"}`;
}

export function diagnosticSettings(settings: SyntaxPluginSettings): object {
  return {
    schemaVersion: settings.schemaVersion,
    locale: settings.locale,
    autoReloadGrammar: settings.autoReloadGrammar,
    markdownReading: settings.markdownReading,
    markdownEditor: settings.markdownEditor,
    sourceEditor: settings.sourceEditor,
    indentStyle: settings.indentStyle,
    indentSize: settings.indentSize,
    lineNumbers: settings.lineNumbers,
    lineWrapping: settings.lineWrapping,
    autoClose: settings.autoClose,
    continueLineComments: settings.continueLineComments,
    previewMode: settings.previewMode,
    contrastWarnings: settings.contrastWarnings,
    profiles: settings.languages.map((profile) => ({
      id: profile.id,
      enabled: profile.enabled,
      descriptorOrigin: profile.descriptorOrigin,
      descriptorPath: profile.descriptorPath,
      lexicalGrammarPath: profile.lexicalGrammarPath,
      syntaxGrammarPath: profile.syntaxGrammarPath,
      themePreset: profile.themePreset,
    })),
  };
}
