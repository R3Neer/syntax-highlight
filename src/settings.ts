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
  customThemeName: string;
  palette: ThemePalette;
  categories: GrammarCategorySettings;
  previewSource: string;
}

export interface SyntaxPluginSettings {
  schemaVersion: 2;
  autoReloadGrammar: boolean;
  customThemes: ThemePreset[];
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

interface SemanticColors {
  text: string;
  comment: string;
  keyword: string;
  type: string;
  constant: string;
  declaration: string;
  function: string;
  string: string;
  number: string;
  operator: string;
  delimiter: string;
  punctuation: string;
  meta: string;
}

function semanticColors(values: SemanticColors): ThemeColors {
  return fillColors({
    comment: values.comment,
    keyword: values.keyword,
    builtin: values.type,
    constant: values.constant,
    declaration: values.declaration,
    type: values.type,
    unit: values.type,
    function: values.function,
    string: values.string,
    char: values.string,
    number: values.number,
    operator: values.operator,
    brace: values.delimiter,
    parenthesis: values.delimiter,
    bracket: values.delimiter,
    punctuation: values.punctuation,
    definition: values.declaration,
    reference: values.text,
    terminal: values.type,
    meta: values.meta,
  });
}

function semanticPalette(
  light: SemanticColors,
  dark: SemanticColors,
): ThemePalette {
  return { light: semanticColors(light), dark: semanticColors(dark) };
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

// Catppuccin Latte/Mocha: https://github.com/catppuccin/catppuccin
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

// VS Code Light+/Dark+: extensions/theme-defaults in microsoft/vscode.
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

// Solarized: https://github.com/altercation/solarized
const SOLARIZED = semanticPalette(
  {
    text: "#657b83",
    comment: "#93a1a1",
    keyword: "#859900",
    type: "#b58900",
    constant: "#2aa198",
    declaration: "#268bd2",
    function: "#268bd2",
    string: "#2aa198",
    number: "#d33682",
    operator: "#859900",
    delimiter: "#657b83",
    punctuation: "#657b83",
    meta: "#cb4b16",
  },
  {
    text: "#839496",
    comment: "#586e75",
    keyword: "#859900",
    type: "#b58900",
    constant: "#2aa198",
    declaration: "#268bd2",
    function: "#268bd2",
    string: "#2aa198",
    number: "#d33682",
    operator: "#859900",
    delimiter: "#839496",
    punctuation: "#839496",
    meta: "#cb4b16",
  },
);

// GitHub Default: https://github.com/primer/github-vscode-theme
const GITHUB = semanticPalette(
  {
    text: "#24292f",
    comment: "#6e7781",
    keyword: "#cf222e",
    type: "#8250df",
    constant: "#0550ae",
    declaration: "#953800",
    function: "#8250df",
    string: "#0a3069",
    number: "#0550ae",
    operator: "#cf222e",
    delimiter: "#24292f",
    punctuation: "#57606a",
    meta: "#953800",
  },
  {
    text: "#c9d1d9",
    comment: "#8b949e",
    keyword: "#ff7b72",
    type: "#ffa657",
    constant: "#79c0ff",
    declaration: "#d2a8ff",
    function: "#d2a8ff",
    string: "#a5d6ff",
    number: "#79c0ff",
    operator: "#ff7b72",
    delimiter: "#c9d1d9",
    punctuation: "#8b949e",
    meta: "#ffa657",
  },
);

// Gruvbox: https://github.com/morhetz/gruvbox
const GRUVBOX = semanticPalette(
  {
    text: "#3c3836",
    comment: "#928374",
    keyword: "#9d0006",
    type: "#076678",
    constant: "#8f3f71",
    declaration: "#b57614",
    function: "#79740e",
    string: "#79740e",
    number: "#8f3f71",
    operator: "#9d0006",
    delimiter: "#665c54",
    punctuation: "#7c6f64",
    meta: "#af3a03",
  },
  {
    text: "#ebdbb2",
    comment: "#928374",
    keyword: "#fb4934",
    type: "#8ec07c",
    constant: "#d3869b",
    declaration: "#fabd2f",
    function: "#b8bb26",
    string: "#b8bb26",
    number: "#d3869b",
    operator: "#fe8019",
    delimiter: "#83a598",
    punctuation: "#a89984",
    meta: "#fabd2f",
  },
);

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: "catppuccin", name: "Catppuccin", palette: CATPPUCCIN },
  {
    id: "vscode-classic",
    name: "Visual Studio Code Dark+/Light+",
    palette: VSCODE,
  },
  { id: "solarized", name: "Solarized", palette: SOLARIZED },
  { id: "github-default", name: "GitHub Default", palette: GITHUB },
  { id: "gruvbox", name: "Gruvbox", palette: GRUVBOX },
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
  const migrated =
    id === "mud-current"
      ? "catppuccin"
      : id === "ebnf-current" || id === "vscode"
        ? "vscode-classic"
        : id;
  return (
    THEME_PRESETS.find((entry) => entry.id === migrated) ?? THEME_PRESETS[0]
  );
}

export function paletteFromPreset(id: string): ThemePalette {
  return clonePalette(preset(id).palette);
}

export function themeById(
  settings: SyntaxPluginSettings,
  id: string,
): ThemePreset | undefined {
  return (
    THEME_PRESETS.find((entry) => entry.id === id) ??
    settings.customThemes.find((entry) => entry.id === id)
  );
}

export const DEFAULT_SETTINGS: SyntaxPluginSettings = {
  schemaVersion: 2,
  autoReloadGrammar: true,
  customThemes: [],
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
      themePreset: "catppuccin",
      customThemeName: "",
      palette: clonePalette(CATPPUCCIN),
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
      themePreset: "vscode-classic",
      customThemeName: "",
      palette: clonePalette(VSCODE),
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
      themePreset: "vscode-classic",
      customThemeName: "",
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
  customThemes: readonly ThemePreset[],
): LanguageProfileSettings {
  const object =
    typeof value === "object" && value !== null
      ? (value as Partial<LanguageProfileSettings>)
      : {};
  const rawPreset =
    typeof object.themePreset === "string"
      ? object.themePreset
      : fallback.themePreset;
  const selectedPreset =
    rawPreset === "mud-current"
      ? "catppuccin"
      : rawPreset === "ebnf-current" || rawPreset === "vscode"
        ? "vscode-classic"
        : rawPreset;
  const selectedTheme =
    THEME_PRESETS.find(({ id }) => id === selectedPreset) ??
    customThemes.find(({ id }) => id === selectedPreset);
  const presetPalette = selectedTheme?.palette ?? fallback.palette;
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
    customThemeName:
      typeof object.customThemeName === "string"
        ? object.customThemeName
        : fallback.customThemeName,
    palette: mergePalette(object.palette, presetPalette),
    categories: {
      ...fallback.categories,
      ...(typeof object.categories === "object" && object.categories !== null
        ? object.categories
        : {}),
    },
  };
}

function loadCustomThemes(value: unknown): ThemePreset[] {
  if (!Array.isArray(value)) return [];
  const result: ThemePreset[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as Partial<ThemePreset>;
    if (
      typeof candidate.id !== "string" ||
      !/^custom-[a-z0-9-]+$/.test(candidate.id) ||
      typeof candidate.name !== "string" ||
      !candidate.name.trim()
    ) {
      continue;
    }
    result.push({
      id: candidate.id,
      name: candidate.name.trim(),
      palette: mergePalette(candidate.palette, CATPPUCCIN),
    });
  }
  return result;
}

export function loadSettings(value: unknown): SyntaxPluginSettings {
  if (typeof value !== "object" || value === null) {
    return structuredClone(DEFAULT_SETTINGS);
  }
  const object = value as Partial<SyntaxPluginSettings>;
  const customThemes = loadCustomThemes(object.customThemes);
  const stored = Array.isArray(object.languages) ? object.languages : [];
  const languages = DEFAULT_SETTINGS.languages.map((fallback) => {
    const match = stored.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        (entry as Partial<LanguageProfileSettings>).id === fallback.id,
    );
    return mergeLanguage(match, fallback, customThemes);
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
      customThemeName: "",
      palette: paletteFromPreset("catppuccin"),
      previewSource: `start ::= "sample" ;`,
    };
    languages.push(mergeLanguage(entry, fallback, customThemes));
  }
  return {
    schemaVersion: 2,
    autoReloadGrammar:
      typeof object.autoReloadGrammar === "boolean"
        ? object.autoReloadGrammar
        : true,
    customThemes,
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
