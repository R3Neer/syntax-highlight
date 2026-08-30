import {
  LANGUAGE_PACK_SCHEMA_VERSION,
  type CategoryDefinition,
  type LanguagePackV2,
  type VisualRole,
} from "./types";

const ID = /^[a-z][a-z0-9-]*$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const ROLES = new Set<VisualRole>([
  "text", "comment", "keyword", "type", "constant", "declaration",
  "callable", "string", "number", "operator", "delimiter",
  "punctuation", "meta",
]);

function object(value: unknown, message: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function strings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${field} must be an array of strings.`);
  }
  return [...new Set(value as string[])];
}

export function validateLanguagePack(value: unknown): LanguagePackV2 {
  const source = object(value, "Language pack must be an object.");
  if (source.schemaVersion !== LANGUAGE_PACK_SCHEMA_VERSION) throw new Error("schemaVersion must be 2.");
  if (typeof source.id !== "string" || !ID.test(source.id)) throw new Error("Invalid language id.");
  if (typeof source.version !== "string" || !VERSION.test(source.version)) throw new Error("Invalid language version.");
  if (typeof source.name !== "string" || source.name.trim() === "") throw new Error("Language name is required.");
  const rawCategories = source.categories;
  if (!Array.isArray(rawCategories) || rawCategories.length === 0) throw new Error("At least one category is required.");
  const categories = rawCategories.map((entry): CategoryDefinition => {
    const category = object(entry, "Category must be an object.");
    if (typeof category.id !== "string" || !ID.test(category.id)) throw new Error("Invalid category id.");
    if (typeof category.role !== "string" || !ROLES.has(category.role as VisualRole)) throw new Error(`Invalid role for ${category.id}.`);
    for (const key of ["name", "description", "group"] as const) {
      if (typeof category[key] !== "string" || category[key].trim() === "") throw new Error(`Missing ${key} for ${category.id}.`);
    }
    return category as unknown as CategoryDefinition;
  });
  if (new Set(categories.map(({ id }) => id)).size !== categories.length) throw new Error("Duplicate category id.");
  let operators: LanguagePackV2["operators"];
  if (source.operators !== undefined) {
    const raw = object(source.operators, "operators must be an object.");
    if (typeof raw.production !== "string" || raw.production === "") throw new Error("operators.production is required.");
    operators = { production: raw.production, compact: strings(raw.compact, "operators.compact"), prefix: strings(raw.prefix, "operators.prefix"), word: strings(raw.word, "operators.word") };
  }
  return {
    schemaVersion: 2,
    id: source.id,
    version: source.version,
    name: source.name,
    aliases: strings(source.aliases, "aliases"),
    fences: strings(source.fences, "fences"),
    extensions: strings(source.extensions, "extensions"),
    categories,
    operators,
    previewSource: typeof source.previewSource === "string" ? source.previewSource : undefined,
  };
}
