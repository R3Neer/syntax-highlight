import {
  BUILTIN_DESCRIPTORS,
  VISUAL_ROLES,
  validateLanguageDescriptor,
  type LanguageDescriptor,
  type LanguageEngine,
  type VisualRole,
} from "./descriptor";

export type ColorMode = "light" | "dark";
export type ThemeColors = Record<VisualRole, string>;
export interface ThemePalette {
  light: ThemeColors;
  dark: ThemeColors;
}
export type CategoryColor = Partial<Record<ColorMode, string>>;
export type ThemeOverrides = Record<string, Record<string, CategoryColor>>;

export interface ThemePreset {
  id: string;
  name: string;
  palette: ThemePalette;
  overrides: ThemeOverrides;
}

export interface LanguageProfileSettings {
  id: string;
  enabled: boolean;
  descriptorPath: string;
  embeddedDescriptor?: LanguageDescriptor;
  lexicalGrammarPath: string;
  syntaxGrammarPath: string;
  lexicalStart: string;
  syntaxStart: string;
  themePreset: string;
  customThemeName: string;
  palette: ThemePalette;
  categoryColors: ThemeOverrides;
  previewSource: string | null;
  descriptorOrigin: "builtin" | "external" | "imported" | "personal";
  embeddedLexicalGrammar?: string;
  embeddedSyntaxGrammar?: string;
  baseline?: unknown;
}

export interface SyntaxPluginSettings {
  schemaVersion: 7;
  locale: "auto" | "en" | "es";
  autoReloadGrammar: boolean;
  markdownReading: boolean;
  markdownEditor: boolean;
  sourceEditor: boolean;
  indentStyle: "spaces" | "tabs";
  indentSize: number;
  lineNumbers: boolean;
  lineWrapping: boolean;
  autoClose: boolean;
  continueLineComments: boolean;
  previewMode: "auto" | "light" | "dark";
  contrastWarnings: boolean;
  showTechnicalIds: boolean;
  lastBackup: string | null;
  customThemes: ThemePreset[];
  languages: LanguageProfileSettings[];
}

function fillColors(values: Partial<ThemeColors>): ThemeColors {
  const result = {} as ThemeColors;
  for (const role of VISUAL_ROLES) result[role] = values[role] ?? "#cdd6f4";
  return result;
}

function semanticPalette(
  light: Partial<ThemeColors>,
  dark: Partial<ThemeColors> = light,
): ThemePalette {
  return { light: fillColors(light), dark: fillColors(dark) };
}

const CATPPUCCIN = semanticPalette(
  {
    text: "#4c4f69",
    comment: "#7c7f93",
    keyword: "#8839ef",
    type: "#179299",
    constant: "#fe640b",
    declaration: "#df8e1d",
    callable: "#df8e1d",
    string: "#40a02b",
    number: "#fe640b",
    operator: "#ea76cb",
    delimiter: "#1e66f5",
    punctuation: "#8839ef",
    meta: "#df8e1d",
  },
  {
    text: "#cdd6f4",
    comment: "#a6adc8",
    keyword: "#f5c2e7",
    type: "#89dceb",
    constant: "#fab387",
    declaration: "#f9e2af",
    callable: "#f9e2af",
    string: "#a6e3a1",
    number: "#fab387",
    operator: "#f5e0dc",
    delimiter: "#89b4fa",
    punctuation: "#cba6f7",
    meta: "#f9e2af",
  },
);

const VSCODE = semanticPalette(
  {
    text: "#001080",
    comment: "#008000",
    keyword: "#af00db",
    type: "#267f99",
    constant: "#098658",
    declaration: "#0000ff",
    callable: "#795e26",
    string: "#a31515",
    number: "#098658",
    operator: "#af00db",
    delimiter: "#795e26",
    punctuation: "#001080",
    meta: "#795e26",
  },
  {
    text: "#9cdcfe",
    comment: "#6a9955",
    keyword: "#c586c0",
    type: "#4ec9b0",
    constant: "#569cd6",
    declaration: "#569cd6",
    callable: "#dcdcaa",
    string: "#ce9178",
    number: "#b5cea8",
    operator: "#c586c0",
    delimiter: "#dcdcaa",
    punctuation: "#d4d4d4",
    meta: "#d7ba7d",
  },
);

const SOLARIZED = semanticPalette(
  {
    text: "#657b83", comment: "#93a1a1", keyword: "#859900",
    type: "#b58900", constant: "#2aa198", declaration: "#268bd2",
    callable: "#268bd2", string: "#2aa198", number: "#d33682",
    operator: "#859900", delimiter: "#657b83", punctuation: "#657b83",
    meta: "#cb4b16",
  },
  {
    text: "#839496", comment: "#586e75", keyword: "#859900",
    type: "#b58900", constant: "#2aa198", declaration: "#268bd2",
    callable: "#268bd2", string: "#2aa198", number: "#d33682",
    operator: "#859900", delimiter: "#839496", punctuation: "#839496",
    meta: "#cb4b16",
  },
);

const GITHUB = semanticPalette(
  {
    text: "#24292f", comment: "#6e7781", keyword: "#cf222e",
    type: "#8250df", constant: "#0550ae", declaration: "#953800",
    callable: "#8250df", string: "#0a3069", number: "#0550ae",
    operator: "#cf222e", delimiter: "#24292f", punctuation: "#57606a",
    meta: "#953800",
  },
  {
    text: "#c9d1d9", comment: "#8b949e", keyword: "#ff7b72",
    type: "#ffa657", constant: "#79c0ff", declaration: "#d2a8ff",
    callable: "#d2a8ff", string: "#a5d6ff", number: "#79c0ff",
    operator: "#ff7b72", delimiter: "#c9d1d9", punctuation: "#8b949e",
    meta: "#ffa657",
  },
);

const GRUVBOX = semanticPalette(
  {
    text: "#3c3836", comment: "#928374", keyword: "#9d0006",
    type: "#076678", constant: "#8f3f71", declaration: "#b57614",
    callable: "#79740e", string: "#79740e", number: "#8f3f71",
    operator: "#9d0006", delimiter: "#665c54", punctuation: "#7c6f64",
    meta: "#af3a03",
  },
  {
    text: "#ebdbb2", comment: "#928374", keyword: "#fb4934",
    type: "#8ec07c", constant: "#d3869b", declaration: "#fabd2f",
    callable: "#b8bb26", string: "#b8bb26", number: "#d3869b",
    operator: "#fe8019", delimiter: "#83a598", punctuation: "#a89984",
    meta: "#fabd2f",
  },
);

const LEGACY_CATEGORY_KIND: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  mud: {
    comment: "comment", "reserved-word": "keyword", "word-operator": "operator",
    "builtin-type": "builtin", "literal-constant": "constant",
    "contextual-word": "keyword", "declared-name": "declaration",
    "specialization-reference": "declaration", "family-member": "constant",
    "type-reference": "type", "invocation-name": "function", unit: "unit",
    text: "string", character: "char", "exact-number": "number",
    rumber: "number", "point-literal": "number", "symbolic-operator": "operator",
    brace: "brace", parenthesis: "parenthesis", bracket: "bracket",
    punctuation: "punctuation",
  },
  ebnf: {
    comment: "comment", "production-definition": "definition",
    "production-reference": "reference", "external-terminal": "terminal",
    "terminal-literal": "string", "special-sequence": "meta",
    "definition-symbol": "operator", alternative: "operator",
    "sequence-separator": "operator", terminator: "operator", group: "bracket",
    optional: "bracket", repetition: "bracket", number: "number",
  },
  asdl: {
    comment: "comment", "asdl-keyword": "keyword", "module-name": "declaration",
    "defined-type": "definition", constructor: "declaration",
    "builtin-type": "builtin", "type-reference": "reference",
    "field-name": "reference", cardinality: "operator", assignment: "operator",
    alternative: "operator", delimiter: "bracket", separator: "punctuation",
    string: "string", number: "number",
  },
};

const LEGACY_MUD_DARK: Record<string, string> = {
  comment: "#a6adc8", keyword: "#f5c2e7", builtin: "#89dceb",
  constant: "#fab387", declaration: "#f9e2af", type: "#89dceb",
  unit: "#94e2d5", function: "#f9e2af", string: "#a6e3a1",
  char: "#a6e3a1", number: "#fab387", operator: "#f5e0dc",
  brace: "#f38ba8", parenthesis: "#f9e2af", bracket: "#89b4fa",
  punctuation: "#cba6f7",
};
const LEGACY_MUD_PALETTE = semanticPalette(
  {
    text: "#cdd6f4", comment: "#a6adc8", keyword: "#f5c2e7",
    type: "#89dceb", constant: "#fab387", declaration: "#f9e2af",
    callable: "#f9e2af", string: "#a6e3a1", number: "#fab387",
    operator: "#f5e0dc", delimiter: "#89b4fa", punctuation: "#cba6f7",
    meta: "#cdd6f4",
  },
);
const LEGACY_EBNF_LIGHT: Record<string, string> = {
  definition: "#0000ff", reference: "#001080", terminal: "#267f99",
  string: "#a31515", comment: "#008000", meta: "#795e26",
  number: "#098658", operator: "#af00db", bracket: "#795e26",
};
const LEGACY_EBNF_DARK: Record<string, string> = {
  definition: "#569cd6", reference: "#9cdcfe", terminal: "#4ec9b0",
  string: "#ce9178", comment: "#6a9955", meta: "#d7ba7d",
  number: "#b5cea8", operator: "#c586c0", bracket: "#dcdcaa",
};

function categoryOverrides(
  languageId: string,
  light: Record<string, string>,
  dark: Record<string, string>,
): ThemeOverrides {
  const descriptor = BUILTIN_DESCRIPTORS[languageId];
  const mapping = LEGACY_CATEGORY_KIND[languageId] ?? {};
  const categories: Record<string, CategoryColor> = {};
  for (const category of descriptor?.categories ?? []) {
    const legacyKind = mapping[category.id];
    if (legacyKind === undefined) continue;
    categories[category.id] = {
      light: light[legacyKind] ?? dark[legacyKind],
      dark: dark[legacyKind] ?? light[legacyKind],
    };
  }
  return { [languageId]: categories };
}

function mergeOverrides(...values: ThemeOverrides[]): ThemeOverrides {
  const result: ThemeOverrides = {};
  for (const value of values) {
    for (const [languageId, categories] of Object.entries(value)) {
      result[languageId] = { ...(result[languageId] ?? {}), ...structuredClone(categories) };
    }
  }
  return result;
}

const LEGACY_CATPPUCCIN_MUD_OVERRIDES = categoryOverrides(
  "mud",
  LEGACY_MUD_DARK,
  LEGACY_MUD_DARK,
);

function mudSemanticOverrides(
  values: Readonly<Record<string, readonly [light: string, dark: string]>>,
): ThemeOverrides {
  return {
    mud: Object.fromEntries(
      Object.entries(values).map(([category, [light, dark]]) => [
        category,
        { light, dark },
      ]),
    ),
  };
}

const MUD_SEMANTIC_CATEGORIES = [
  "declaration-keyword",
  "declaration-modifier",
  "control-flow",
  "quantifier-keyword",
  "effect-keyword",
  "clause-keyword",
] as const;

function legacyBundledMudDescriptor(
  variant: "standalone-1.0" | "vendored",
): LanguageDescriptor {
  const descriptor = structuredClone(BUILTIN_DESCRIPTORS.mud);
  const semantic = new Set<string>(MUD_SEMANTIC_CATEGORIES);
  descriptor.categories = descriptor.categories.filter(({ id }) => !semantic.has(id));
  if (variant === "standalone-1.0") {
    descriptor.previewSource =
      'abstract thing Place {}\n\nthing Alexandria as City, Place {\n    name = "Alejandría"\n}\n\naction Inspect for target: Thing {}';
    return descriptor;
  }
  const character = descriptor.categories.find(({ id }) => id === "character");
  if (character !== undefined) {
    character.description = "Literal Char.";
  }
  const rumber = descriptor.categories.find(({ id }) => id === "rumber");
  if (rumber !== undefined) {
    rumber.name = "Rumber";
  }
  descriptor.previewSource =
    'abstract thing Place {\n}\n\nthing Alexandria as City, Place {\n    name: Text = "Alexandria"\n    rule CanEnter(actor: Player) { distance(actor, self) <= 10 m }\n}';
  return descriptor;
}

const LEGACY_BUNDLED_MUD_DESCRIPTORS = [
  legacyBundledMudDescriptor("standalone-1.0"),
  legacyBundledMudDescriptor("vendored"),
] as const;

function isLegacyBundledMudDescriptor(value: unknown): boolean {
  try {
    const descriptor = validateLanguageDescriptor(value);
    return LEGACY_BUNDLED_MUD_DESCRIPTORS.some(
      (legacy) => JSON.stringify(descriptor) === JSON.stringify(legacy),
    );
  } catch {
    return false;
  }
}

const CATPPUCCIN_OVERRIDES = mudSemanticOverrides({
  "reserved-word": ["#ea76cb", "#f5c2e7"],
  "declaration-keyword": ["#8839ef", "#cba6f7"],
  "declaration-modifier": ["#1e66f5", "#89b4fa"],
  "control-flow": ["#d20f39", "#f38ba8"],
  "quantifier-keyword": ["#179299", "#94e2d5"],
  "effect-keyword": ["#fe640b", "#fab387"],
  "clause-keyword": ["#ea76cb", "#f5c2e7"],
  "contextual-word": ["#7287fd", "#b4befe"],
});
const VSCODE_OVERRIDES = mergeOverrides(
  mudSemanticOverrides({
    "reserved-word": ["#af00db", "#c586c0"],
    "declaration-keyword": ["#0000ff", "#569cd6"],
    "declaration-modifier": ["#795e26", "#d7ba7d"],
    "control-flow": ["#af00db", "#c586c0"],
    "quantifier-keyword": ["#267f99", "#4ec9b0"],
    "effect-keyword": ["#a31515", "#ce9178"],
    "clause-keyword": ["#001080", "#9cdcfe"],
    "contextual-word": ["#795e26", "#d7ba7d"],
  }),
  categoryOverrides("ebnf", LEGACY_EBNF_LIGHT, LEGACY_EBNF_DARK),
  categoryOverrides("asdl", LEGACY_EBNF_LIGHT, LEGACY_EBNF_DARK),
);
const SOLARIZED_OVERRIDES = mudSemanticOverrides({
  "reserved-word": ["#859900", "#859900"],
  "declaration-keyword": ["#268bd2", "#268bd2"],
  "declaration-modifier": ["#cb4b16", "#cb4b16"],
  "control-flow": ["#dc322f", "#dc322f"],
  "quantifier-keyword": ["#2aa198", "#2aa198"],
  "effect-keyword": ["#d33682", "#d33682"],
  "clause-keyword": ["#859900", "#859900"],
  "contextual-word": ["#6c71c4", "#6c71c4"],
});
const GITHUB_OVERRIDES = mudSemanticOverrides({
  "reserved-word": ["#cf222e", "#ff7b72"],
  "declaration-keyword": ["#8250df", "#d2a8ff"],
  "declaration-modifier": ["#953800", "#ffa657"],
  "control-flow": ["#cf222e", "#ff7b72"],
  "quantifier-keyword": ["#0550ae", "#79c0ff"],
  "effect-keyword": ["#953800", "#ffa657"],
  "clause-keyword": ["#8250df", "#d2a8ff"],
  "contextual-word": ["#0969da", "#58a6ff"],
});
const GRUVBOX_OVERRIDES = mudSemanticOverrides({
  "reserved-word": ["#9d0006", "#fb4934"],
  "declaration-keyword": ["#076678", "#83a598"],
  "declaration-modifier": ["#b57614", "#fabd2f"],
  "control-flow": ["#9d0006", "#fb4934"],
  "quantifier-keyword": ["#427b58", "#8ec07c"],
  "effect-keyword": ["#af3a03", "#fe8019"],
  "clause-keyword": ["#8f3f71", "#d3869b"],
  "contextual-word": ["#79740e", "#b8bb26"],
});

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: "catppuccin", name: "Catppuccin", palette: CATPPUCCIN, overrides: CATPPUCCIN_OVERRIDES },
  { id: "vscode-classic", name: "Visual Studio Code Dark+/Light+", palette: VSCODE, overrides: VSCODE_OVERRIDES },
  { id: "solarized", name: "Solarized", palette: SOLARIZED, overrides: SOLARIZED_OVERRIDES },
  { id: "github-default", name: "GitHub Default", palette: GITHUB, overrides: GITHUB_OVERRIDES },
  { id: "gruvbox", name: "Gruvbox", palette: GRUVBOX, overrides: GRUVBOX_OVERRIDES },
];

function clonePalette(value: ThemePalette): ThemePalette {
  return { light: { ...value.light }, dark: { ...value.dark } };
}

function cloneTheme(theme: ThemePreset): Pick<ThemePreset, "palette" | "overrides"> {
  return {
    palette: clonePalette(theme.palette),
    overrides: structuredClone(theme.overrides),
  };
}

function migratedPreset(id: string): string {
  return id === "mud-current"
    ? "catppuccin"
    : id === "ebnf-current" || id === "vscode"
      ? "vscode-classic"
      : id;
}

export function themeById(
  settings: SyntaxPluginSettings,
  id: string,
): ThemePreset | undefined {
  const normalized = migratedPreset(id);
  return (
    THEME_PRESETS.find((entry) => entry.id === normalized) ??
    settings.customThemes.find((entry) => entry.id === normalized)
  );
}

export function paletteFromPreset(id: string): ThemePalette {
  const theme =
    THEME_PRESETS.find((entry) => entry.id === migratedPreset(id)) ??
    THEME_PRESETS[0];
  return clonePalette(theme.palette);
}

export function themeFromPreset(id: string): Pick<ThemePreset, "palette" | "overrides"> {
  const theme =
    THEME_PRESETS.find((entry) => entry.id === migratedPreset(id)) ??
    THEME_PRESETS[0];
  return cloneTheme(theme);
}

function defaultProfile(
  id: "mud" | "ebnf" | "asdl" | "toml",
  themePreset: string,
): LanguageProfileSettings {
  const theme = themeFromPreset(themePreset);
  return {
    id,
    enabled: true,
    descriptorPath: "",
    lexicalGrammarPath:
      id === "mud" ? "especificacion/gramatica/mud-lexico.ebnf" : "",
    syntaxGrammarPath: id === "mud" ? "especificacion/gramatica/mud.ebnf" : "",
    lexicalStart: id === "mud" ? "mud-source" : "",
    syntaxStart: id === "mud" ? "mud-file" : "",
    themePreset,
    customThemeName: "",
    palette: theme.palette,
    categoryColors: theme.overrides,
    previewSource: null,
    descriptorOrigin: "builtin",
  };
}

export const DEFAULT_SETTINGS: SyntaxPluginSettings = {
  schemaVersion: 7,
  locale: "auto",
  autoReloadGrammar: true,
  markdownReading: true,
  markdownEditor: true,
  sourceEditor: true,
  indentStyle: "spaces",
  indentSize: 4,
  lineNumbers: true,
  lineWrapping: true,
  autoClose: true,
  continueLineComments: true,
  previewMode: "auto",
  contrastWarnings: true,
  showTechnicalIds: false,
  lastBackup: null,
  customThemes: [],
  languages: [
    defaultProfile("mud", "catppuccin"),
    defaultProfile("ebnf", "vscode-classic"),
    defaultProfile("asdl", "vscode-classic"),
    defaultProfile("toml", "vscode-classic"),
  ],
};

function validColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : fallback;
}

function mergePalette(value: unknown, fallback: ThemePalette): ThemePalette {
  const source =
    typeof value === "object" && value !== null
      ? (value as Partial<Record<ColorMode, Record<string, unknown>>>)
      : {};
  const result = clonePalette(fallback);
  for (const mode of ["light", "dark"] as const) {
    for (const role of VISUAL_ROLES) {
      result[mode][role] = validColor(source[mode]?.[role], result[mode][role]);
    }
  }
  return result;
}

function mergeThemeOverrides(value: unknown, fallback: ThemeOverrides): ThemeOverrides {
  const result = structuredClone(fallback);
  if (typeof value !== "object" || value === null || Array.isArray(value)) return result;
  for (const [languageId, rawCategories] of Object.entries(value)) {
    if (typeof rawCategories !== "object" || rawCategories === null || Array.isArray(rawCategories)) {
      continue;
    }
    const categories = (result[languageId] ??= {});
    for (const [categoryId, rawModes] of Object.entries(
      rawCategories as Record<string, unknown>,
    )) {
      if (typeof rawModes !== "object" || rawModes === null || Array.isArray(rawModes)) continue;
      const modes = rawModes as Record<string, unknown>;
      categories[categoryId] = {
        ...(typeof modes.light === "string" && /^#[0-9a-f]{6}$/i.test(modes.light)
          ? { light: modes.light }
          : {}),
        ...(typeof modes.dark === "string" && /^#[0-9a-f]{6}$/i.test(modes.dark)
          ? { dark: modes.dark }
          : {}),
      };
    }
  }
  return result;
}

function sameCategoryColor(left: unknown, right: CategoryColor | undefined): boolean {
  if (typeof left !== "object" || left === null || Array.isArray(left) || right === undefined) {
    return false;
  }
  const value = left as Record<string, unknown>;
  return value.light === right.light && value.dark === right.dark;
}

function samePalette(left: unknown, right: ThemePalette): boolean {
  if (typeof left !== "object" || left === null || Array.isArray(left)) return false;
  const value = left as Partial<Record<ColorMode, Record<string, unknown>>>;
  return (["light", "dark"] as const).every((mode) =>
    VISUAL_ROLES.every((role) => value[mode]?.[role] === right[mode][role]),
  );
}

function migrateMudSemanticProfile(value: unknown, schemaVersion: number): unknown {
  if (
    schemaVersion >= 7 ||
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return value;
  }
  const result = structuredClone(value) as Record<string, unknown>;
  if (
    result.descriptorOrigin === "personal" &&
    isLegacyBundledMudDescriptor(result.embeddedDescriptor)
  ) {
    delete result.embeddedDescriptor;
    result.descriptorOrigin = "builtin";
  }
  if (schemaVersion >= 6) return result;
  const legacyCatppuccin =
    migratedPreset(String(result.themePreset ?? "catppuccin")) === "catppuccin";
  if (legacyCatppuccin && samePalette(result.palette, LEGACY_MUD_PALETTE)) {
    delete result.palette;
  }
  const overrides = result.categoryColors;
  if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) {
    return result;
  }
  const mud = (overrides as Record<string, unknown>).mud;
  if (typeof mud !== "object" || mud === null || Array.isArray(mud)) return result;
  const categories = mud as Record<string, unknown>;
  const legacy = legacyCatppuccin
    ? (LEGACY_CATPPUCCIN_MUD_OVERRIDES.mud ?? {})
    : {};
  const reserved = categories["reserved-word"];
  const customizedReserved =
    reserved !== undefined &&
    (!legacyCatppuccin || !sameCategoryColor(reserved, legacy["reserved-word"]));
  for (const [categoryId, color] of Object.entries(legacy)) {
    if (sameCategoryColor(categories[categoryId], color)) delete categories[categoryId];
  }
  if (customizedReserved) {
    for (const categoryId of MUD_SEMANTIC_CATEGORIES) {
      categories[categoryId] ??= structuredClone(reserved);
    }
  }
  return result;
}

function migrateLegacyPalette(
  id: string,
  value: unknown,
  palette: ThemePalette,
  overrides: ThemeOverrides,
): void {
  if (typeof value !== "object" || value === null) return;
  const source = value as Partial<Record<ColorMode, Record<string, unknown>>>;
  const legacyRoleKinds: Readonly<Partial<Record<VisualRole, string>>> = {
    text: "reference",
    comment: "comment",
    keyword: "keyword",
    type: "type",
    constant: "constant",
    declaration: "declaration",
    callable: "function",
    string: "string",
    number: "number",
    operator: "operator",
    delimiter: "bracket",
    punctuation: "punctuation",
    meta: "meta",
  };
  for (const [role, legacyKind] of Object.entries(legacyRoleKinds) as [
    VisualRole,
    string,
  ][]) {
    for (const mode of ["light", "dark"] as const) {
      const color = source[mode]?.[legacyKind];
      if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) {
        palette[mode][role] = color;
      }
    }
  }
  const descriptor = BUILTIN_DESCRIPTORS[id];
  const mapping = LEGACY_CATEGORY_KIND[id];
  if (descriptor === undefined || mapping === undefined) return;
  const categories = (overrides[id] ??= {});
  for (const category of descriptor.categories) {
    const legacyKind = mapping[category.id];
    if (legacyKind === undefined) continue;
    for (const mode of ["light", "dark"] as const) {
      const color = source[mode]?.[legacyKind];
      if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) {
        (categories[category.id] ??= {})[mode] = color;
      }
    }
  }
  for (const role of VISUAL_ROLES) {
    for (const mode of ["light", "dark"] as const) {
      const color = source[mode]?.[role];
      if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) {
        palette[mode][role] = color;
      }
    }
  }
}

function inheritMudSemanticColors(overrides: ThemeOverrides): void {
  const reserved = overrides.mud?.["reserved-word"];
  if (reserved === undefined) return;
  const categories = (overrides.mud ??= {});
  for (const categoryId of MUD_SEMANTIC_CATEGORIES) {
    categories[categoryId] = structuredClone(reserved);
  }
}

function loadCustomThemes(value: unknown, migrateLegacy: boolean): ThemePreset[] {
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
    const palette = mergePalette(candidate.palette, CATPPUCCIN);
    const overrides = mergeThemeOverrides(candidate.overrides, {});
    if (migrateLegacy) {
      for (const languageId of ["mud", "ebnf", "asdl", "toml"]) {
        migrateLegacyPalette(languageId, candidate.palette, palette, overrides);
      }
      inheritMudSemanticColors(overrides);
    }
    result.push({
      id: candidate.id,
      name: candidate.name.trim(),
      palette,
      overrides,
    });
  }
  return result;
}

function optionalDescriptor(value: unknown): LanguageDescriptor | undefined {
  if (value === undefined) return undefined;
  try {
    return validateLanguageDescriptor(value);
  } catch {
    return undefined;
  }
}

function mergeLanguage(
  value: unknown,
  fallback: LanguageProfileSettings,
  customThemes: readonly ThemePreset[],
  migrateLegacy: boolean,
): LanguageProfileSettings {
  const object =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const selectedPreset = migratedPreset(
    typeof object.themePreset === "string"
      ? object.themePreset
      : fallback.themePreset,
  );
  const selected =
    THEME_PRESETS.find(({ id }) => id === selectedPreset) ??
    customThemes.find(({ id }) => id === selectedPreset);
  const baseTheme = selected === undefined ? {
    palette: fallback.palette,
    overrides: fallback.categoryColors,
  } : cloneTheme(selected);
  const palette = mergePalette(object.palette, baseTheme.palette);
  const categoryColors = mergeThemeOverrides(
    object.categoryColors,
    baseTheme.overrides,
  );
  if (migrateLegacy) {
    migrateLegacyPalette(fallback.id, object.palette, palette, categoryColors);
    if (fallback.id === "mud") inheritMudSemanticColors(categoryColors);
  }
  return {
    id: fallback.id,
    enabled:
      typeof object.enabled === "boolean" ? object.enabled : fallback.enabled,
    descriptorPath:
      typeof object.descriptorPath === "string"
        ? object.descriptorPath.trim()
        : fallback.descriptorPath,
    embeddedDescriptor: optionalDescriptor(object.embeddedDescriptor),
    lexicalGrammarPath:
      typeof object.lexicalGrammarPath === "string"
        ? object.lexicalGrammarPath.trim()
        : fallback.lexicalGrammarPath,
    syntaxGrammarPath:
      typeof object.syntaxGrammarPath === "string"
        ? object.syntaxGrammarPath.trim()
        : fallback.syntaxGrammarPath,
    lexicalStart:
      typeof object.lexicalStart === "string"
        ? object.lexicalStart.trim()
        : fallback.lexicalStart,
    syntaxStart:
      typeof object.syntaxStart === "string"
        ? object.syntaxStart.trim()
        : fallback.syntaxStart,
    themePreset: selectedPreset,
    customThemeName:
      typeof object.customThemeName === "string"
        ? object.customThemeName
        : fallback.customThemeName,
    palette,
    categoryColors,
    previewSource:
      object.previewSource === null || typeof object.previewSource === "string"
        ? object.previewSource
        : fallback.previewSource,
    descriptorOrigin:
      object.descriptorOrigin === "external" ||
      object.descriptorOrigin === "imported" ||
      object.descriptorOrigin === "personal" ||
      object.descriptorOrigin === "builtin"
        ? object.descriptorOrigin
        : typeof object.descriptorPath === "string" && object.descriptorPath.trim()
          ? "external"
          : fallback.descriptorOrigin,
    embeddedLexicalGrammar:
      typeof object.embeddedLexicalGrammar === "string"
        ? object.embeddedLexicalGrammar
        : undefined,
    embeddedSyntaxGrammar:
      typeof object.embeddedSyntaxGrammar === "string"
        ? object.embeddedSyntaxGrammar
        : undefined,
    baseline: object.baseline,
  };
}

function genericFallback(id: string): LanguageProfileSettings {
  const descriptor = structuredClone(BUILTIN_DESCRIPTORS.generic);
  descriptor.id = id;
  descriptor.name = id;
  descriptor.fences = [id];
  descriptor.extensions = [id];
  const theme = themeFromPreset("catppuccin");
  return {
    id,
    enabled: false,
    descriptorPath: "",
    embeddedDescriptor: descriptor,
    lexicalGrammarPath: "",
    syntaxGrammarPath: "",
    lexicalStart: "",
    syntaxStart: "",
    themePreset: "catppuccin",
    customThemeName: "",
    palette: theme.palette,
    categoryColors: theme.overrides,
    previewSource: null,
    descriptorOrigin: "personal",
  };
}

export function loadSettings(value: unknown): SyntaxPluginSettings {
  if (typeof value !== "object" || value === null) {
    return structuredClone(DEFAULT_SETTINGS);
  }
  const object = value as Record<string, unknown>;
  const storedSchemaVersion =
    typeof object.schemaVersion === "number" ? object.schemaVersion : 0;
  const migrateLegacyPaletteValues = storedSchemaVersion < 5;
  const customThemes = loadCustomThemes(
    object.customThemes,
    migrateLegacyPaletteValues,
  );
  const stored: unknown[] = Array.isArray(object.languages)
    ? (object.languages as unknown[])
    : [];
  const languages = DEFAULT_SETTINGS.languages.map((fallback) => {
    const match = stored.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        (entry as Record<string, unknown>).id === fallback.id,
    );
    return mergeLanguage(
      fallback.id === "mud"
        ? migrateMudSemanticProfile(match, storedSchemaVersion)
        : match,
      fallback,
      customThemes,
      migrateLegacyPaletteValues,
    );
  });
  for (const entry of stored) {
    if (typeof entry !== "object" || entry === null) continue;
    const id = (entry as Record<string, unknown>).id;
    if (
      typeof id !== "string" ||
      !/^[a-z][a-z0-9-]*$/.test(id) ||
      languages.some((language) => language.id === id)
    ) {
      continue;
    }
    languages.push(
      mergeLanguage(entry, genericFallback(id), customThemes, migrateLegacyPaletteValues),
    );
  }
  return {
    schemaVersion: 7,
    locale:
      object.locale === "en" || object.locale === "es" || object.locale === "auto"
        ? object.locale
        : "auto",
    autoReloadGrammar:
      typeof object.autoReloadGrammar === "boolean"
        ? object.autoReloadGrammar
        : true,
    markdownReading:
      typeof object.markdownReading === "boolean" ? object.markdownReading : true,
    markdownEditor:
      typeof object.markdownEditor === "boolean" ? object.markdownEditor : true,
    sourceEditor:
      typeof object.sourceEditor === "boolean" ? object.sourceEditor : true,
    indentStyle: object.indentStyle === "tabs" ? "tabs" : "spaces",
    indentSize:
      typeof object.indentSize === "number" &&
      Number.isInteger(object.indentSize) &&
      object.indentSize >= 1 &&
      object.indentSize <= 8
        ? object.indentSize
        : 4,
    lineNumbers:
      typeof object.lineNumbers === "boolean" ? object.lineNumbers : true,
    lineWrapping:
      typeof object.lineWrapping === "boolean" ? object.lineWrapping : true,
    autoClose:
      typeof object.autoClose === "boolean" ? object.autoClose : true,
    continueLineComments:
      typeof object.continueLineComments === "boolean"
        ? object.continueLineComments
        : true,
    previewMode:
      object.previewMode === "light" ||
      object.previewMode === "dark" ||
      object.previewMode === "auto"
        ? object.previewMode
        : "auto",
    contrastWarnings:
      typeof object.contrastWarnings === "boolean"
        ? object.contrastWarnings
        : true,
    showTechnicalIds:
      typeof object.showTechnicalIds === "boolean"
        ? object.showTechnicalIds
        : false,
    lastBackup: typeof object.lastBackup === "string" ? object.lastBackup : null,
    customThemes,
    languages,
  };
}

export function newGenericProfile(id: string): LanguageProfileSettings {
  return genericFallback(id);
}

export function profileEngine(
  profile: LanguageProfileSettings,
  descriptor?: LanguageDescriptor,
): LanguageEngine {
  return descriptor?.engine ?? profile.embeddedDescriptor?.engine ?? "grammar";
}

export function effectiveCategoryColor(
  profile: LanguageProfileSettings,
  descriptor: LanguageDescriptor,
  categoryId: string,
  mode: ColorMode,
): string {
  const category = descriptor.categories.find(({ id }) => id === categoryId);
  const role = category?.role ?? "text";
  return (
    profile.categoryColors[descriptor.id]?.[categoryId]?.[mode] ??
    profile.categoryColors[profile.id]?.[categoryId]?.[mode] ??
    profile.palette[mode][role] ??
    profile.palette[mode].text
  );
}
