import type { SyntaxTokenKind } from "./tokenizer";

export const ALL_TOKEN_KINDS: readonly SyntaxTokenKind[] = [
  "comment",
  "keyword",
  "builtin",
  "constant",
  "declaration",
  "type",
  "unit",
  "function",
  "string",
  "char",
  "number",
  "operator",
  "brace",
  "parenthesis",
  "bracket",
  "punctuation",
  "definition",
  "reference",
  "terminal",
  "meta",
];

export const MUD_TOKEN_KINDS: readonly SyntaxTokenKind[] = [
  "comment",
  "keyword",
  "builtin",
  "constant",
  "declaration",
  "type",
  "unit",
  "function",
  "string",
  "char",
  "number",
  "operator",
  "brace",
  "parenthesis",
  "bracket",
  "punctuation",
];

export const EBNF_TOKEN_KINDS: readonly SyntaxTokenKind[] = [
  "definition",
  "reference",
  "terminal",
  "string",
  "comment",
  "meta",
  "number",
  "operator",
  "bracket",
];

export const ASDL_TOKEN_KINDS: readonly SyntaxTokenKind[] = [
  "comment",
  "keyword",
  "builtin",
  "declaration",
  "definition",
  "reference",
  "string",
  "number",
  "operator",
  "bracket",
  "punctuation",
];

export type ThemeColors = Record<SyntaxTokenKind, string>;

export interface ThemePalette {
  light: ThemeColors;
  dark: ThemeColors;
}

export type LanguageEngine = "mud" | "ebnf" | "asdl" | "grammar";

export interface GrammarCategorySettings {
  keyword: string;
  operatorWord: string;
  builtin: string;
  constant: string;
  operatorSymbol: string;
  brace: string;
  parenthesis: string;
  bracket: string;
  punctuation: string;
  contextual: string;
  declarationName: string;
}

export interface LanguageProfileSettings {
  id: string;
  name: string;
  enabled: boolean;
  fences: string[];
  extensions: string[];
  engine: LanguageEngine;
  lexicalGrammarPath: string;
  syntaxGrammarPath: string;
  lexicalStart: string;
  syntaxStart: string;
  themePreset: string;
  palette: ThemePalette;
  categories: GrammarCategorySettings;
  previewSource: string;
}

export interface SyntaxPluginSettings {
  schemaVersion: 1;
  autoReloadGrammar: boolean;
  languages: LanguageProfileSettings[];
}

export interface ThemePreset {
  id: string;
  name: string;
  palette: ThemePalette;
}

function fillColors(values: Partial<ThemeColors>): ThemeColors {
  const result = {} as ThemeColors;
  for (const kind of ALL_TOKEN_KINDS) {
    result[kind] = values[kind] ?? "#cdd6f4";
  }
  return result;
}

function palette(
  light: Partial<ThemeColors>,
  dark: Partial<ThemeColors> = light,
): ThemePalette {
  return { light: fillColors(light), dark: fillColors(dark) };
}

const MUD_CURRENT = palette({
  comment: "#a6adc8",
  keyword: "#f5c2e7",
  builtin: "#89dceb",
  constant: "#fab387",
  declaration: "#f9e2af",
  type: "#89dceb",
  unit: "#94e2d5",
  function: "#f9e2af",
  string: "#a6e3a1",
  char: "#a6e3a1",
  number: "#fab387",
  operator: "#f5e0dc",
  brace: "#f38ba8",
  parenthesis: "#f9e2af",
  bracket: "#89b4fa",
  punctuation: "#cba6f7",
});

const EBNF_CURRENT = palette(
  {
    definition: "#0000ff",
    reference: "#001080",
    terminal: "#267f99",
    string: "#a31515",
    comment: "#008000",
    meta: "#795e26",
    number: "#098658",
    operator: "#af00db",
    bracket: "#795e26",
  },
  {
    definition: "#569cd6",
    reference: "#9cdcfe",
    terminal: "#4ec9b0",
    string: "#ce9178",
    comment: "#6a9955",
    meta: "#d7ba7d",
    number: "#b5cea8",
    operator: "#c586c0",
    bracket: "#dcdcaa",
  },
);

const CATPPUCCIN = palette(
  {
    comment: "#7c7f93",
    keyword: "#8839ef",
    builtin: "#04a5e5",
    constant: "#fe640b",
    declaration: "#df8e1d",
    type: "#179299",
    unit: "#179299",
    function: "#df8e1d",
    string: "#40a02b",
    char: "#40a02b",
    number: "#fe640b",
    operator: "#ea76cb",
    brace: "#d20f39",
    parenthesis: "#df8e1d",
    bracket: "#1e66f5",
    punctuation: "#8839ef",
    definition: "#1e66f5",
    reference: "#04a5e5",
    terminal: "#179299",
    meta: "#df8e1d",
  },
  MUD_CURRENT.dark,
);

const VSCODE = palette(
  EBNF_CURRENT.light,
  {
    ...EBNF_CURRENT.dark,
    keyword: "#c586c0",
    builtin: "#4ec9b0",
    constant: "#569cd6",
    declaration: "#dcdcaa",
    type: "#4ec9b0",
    unit: "#4ec9b0",
    function: "#dcdcaa",
    char: "#ce9178",
    brace: "#ffd700",
    parenthesis: "#da70d6",
    punctuation: "#d4d4d4",
  },
);

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: "mud-current", name: "MUD actual · Catppuccin", palette: MUD_CURRENT },
  { id: "ebnf-current", name: "EBNF actual · VS Code", palette: EBNF_CURRENT },
  { id: "catppuccin", name: "Catppuccin adaptable", palette: CATPPUCCIN },
  { id: "vscode", name: "Visual Studio Code", palette: VSCODE },
];

export const DEFAULT_GRAMMAR_CATEGORIES: GrammarCategorySettings = {
  keyword: "keyword-word",
  operatorWord: "operator-word",
  builtin: "builtin-word",
  constant: "constant-word",
  operatorSymbol: "operator-token",
  brace: "brace-token",
  parenthesis: "parenthesis-token",
  bracket: "bracket-token",
  punctuation: "punctuation-token",
  contextual: "contextual-word",
  declarationName: "nominal-name",
};

function clonePalette(value: ThemePalette): ThemePalette {
  return {
    light: { ...value.light },
    dark: { ...value.dark },
  };
}

function preset(id: string): ThemePreset {
  return THEME_PRESETS.find((entry) => entry.id === id) ?? THEME_PRESETS[0];
}

export function paletteFromPreset(id: string): ThemePalette {
  return clonePalette(preset(id).palette);
}

export const DEFAULT_SETTINGS: SyntaxPluginSettings = {
  schemaVersion: 1,
  autoReloadGrammar: true,
  languages: [
    {
      id: "mud",
      name: "MUD",
      enabled: true,
      fences: ["mud"],
      extensions: ["mud"],
      engine: "mud",
      lexicalGrammarPath: "especificacion/gramatica/mud-lexico.ebnf",
      syntaxGrammarPath: "especificacion/gramatica/mud.ebnf",
      lexicalStart: "mud-source",
      syntaxStart: "mud-file",
      themePreset: "mud-current",
      palette: clonePalette(MUD_CURRENT),
      categories: { ...DEFAULT_GRAMMAR_CATEGORIES },
      previewSource: `abstract thing Place {
}

thing Alexandria as City, Place {
    name: Text = "Alexandria"
}`,
    },
    {
      id: "ebnf",
      name: "EBNF",
      enabled: true,
      fences: ["ebnf"],
      extensions: ["ebnf"],
      engine: "ebnf",
      lexicalGrammarPath: "",
      syntaxGrammarPath: "",
      lexicalStart: "",
      syntaxStart: "",
      themePreset: "ebnf-current",
      palette: clonePalette(EBNF_CURRENT),
      categories: { ...DEFAULT_GRAMMAR_CATEGORIES },
      previewSource: `expression ::= term , { ( "+" | "-" ) , term } ;
term ::= NUMBER | "(" , expression , ")" ;`,
    },
    {
      id: "asdl",
      name: "ASDL",
      enabled: true,
      fences: ["asdl"],
      extensions: ["asdl"],
      engine: "asdl",
      lexicalGrammarPath: "",
      syntaxGrammarPath: "",
      lexicalStart: "",
      syntaxStart: "",
      themePreset: "vscode",
      palette: clonePalette(VSCODE),
      categories: { ...DEFAULT_GRAMMAR_CATEGORIES },
      previewSource: `module Mud {
    expr = Name(identifier id)
         | Literal(constant value)
         | Binary(expr left, operator op, expr right)
         attributes (source_span span)
}`,
    },
  ],
};

function validColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : fallback;
}

function mergePalette(
  value: unknown,
  fallback: ThemePalette,
): ThemePalette {
  const object =
    typeof value === "object" && value !== null
      ? (value as Partial<ThemePalette>)
      : {};
  const result = clonePalette(fallback);
  for (const mode of ["light", "dark"] as const) {
    const colors =
      typeof object[mode] === "object" && object[mode] !== null
        ? (object[mode] as Partial<ThemeColors>)
        : {};
    for (const kind of ALL_TOKEN_KINDS) {
      result[mode][kind] = validColor(colors[kind], result[mode][kind]);
    }
  }
  return result;
}

function mergeLanguage(
  value: unknown,
  fallback: LanguageProfileSettings,
): LanguageProfileSettings {
  const object =
    typeof value === "object" && value !== null
      ? (value as Partial<LanguageProfileSettings>)
      : {};
  const selectedPreset =
    typeof object.themePreset === "string"
      ? object.themePreset
      : fallback.themePreset;
  const presetPalette = paletteFromPreset(selectedPreset);
  return {
    ...fallback,
    ...object,
    id:
      typeof object.id === "string" && /^[a-z][a-z0-9-]*$/.test(object.id)
        ? object.id
        : fallback.id,
    name:
      typeof object.name === "string" && object.name.trim()
        ? object.name.trim()
        : fallback.name,
    fences: Array.isArray(object.fences)
      ? object.fences.filter(
          (entry): entry is string =>
            typeof entry === "string" && /^[A-Za-z0-9_-]+$/.test(entry),
        )
      : [...fallback.fences],
    extensions: Array.isArray(object.extensions)
      ? object.extensions.filter(
          (entry): entry is string =>
            typeof entry === "string" && /^[A-Za-z0-9_-]+$/.test(entry),
        )
      : [...fallback.extensions],
    themePreset: selectedPreset,
    palette: mergePalette(object.palette, presetPalette),
    categories: {
      ...fallback.categories,
      ...(typeof object.categories === "object" && object.categories !== null
        ? object.categories
        : {}),
    },
  };
}

export function loadSettings(value: unknown): SyntaxPluginSettings {
  if (typeof value !== "object" || value === null) {
    return structuredClone(DEFAULT_SETTINGS);
  }
  const object = value as Partial<SyntaxPluginSettings>;
  const stored = Array.isArray(object.languages) ? object.languages : [];
  const languages = DEFAULT_SETTINGS.languages.map((fallback) => {
    const match = stored.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        (entry as Partial<LanguageProfileSettings>).id === fallback.id,
    );
    return mergeLanguage(match, fallback);
  });
  for (const entry of stored) {
    if (typeof entry !== "object" || entry === null) continue;
    const id = (entry as Partial<LanguageProfileSettings>).id;
    if (
      typeof id !== "string" ||
      languages.some((language) => language.id === id)
    ) {
      continue;
    }
    const fallback: LanguageProfileSettings = {
      ...DEFAULT_SETTINGS.languages[0],
      id,
      name: id,
      engine: "grammar",
      fences: [id],
      extensions: [id],
      themePreset: "catppuccin",
      palette: paletteFromPreset("catppuccin"),
      previewSource: `start ::= "sample" ;`,
    };
    languages.push(mergeLanguage(entry, fallback));
  }
  return {
    schemaVersion: 1,
    autoReloadGrammar:
      typeof object.autoReloadGrammar === "boolean"
        ? object.autoReloadGrammar
        : true,
    languages,
  };
}

export function tokenKindsFor(
  language: LanguageProfileSettings,
): readonly SyntaxTokenKind[] {
  return language.engine === "ebnf"
    ? EBNF_TOKEN_KINDS
    : language.engine === "asdl"
      ? ASDL_TOKEN_KINDS
    : language.engine === "mud"
      ? MUD_TOKEN_KINDS
      : ALL_TOKEN_KINDS;
}
