import asdlDescriptorSource from "../languages/asdl.json";
import ebnfDescriptorSource from "../languages/ebnf.json";
import genericDescriptorSource from "../languages/generic.json";
import tomlDescriptorSource from "../languages/toml.json";
import { MUD_DESCRIPTOR_V1 } from "@r3nner/syntax-highlight-language-mud";

export const VISUAL_ROLES = [
  "text",
  "comment",
  "keyword",
  "type",
  "constant",
  "declaration",
  "callable",
  "string",
  "number",
  "operator",
  "delimiter",
  "punctuation",
  "meta",
] as const;

export type VisualRole = (typeof VISUAL_ROLES)[number];
export type LanguageEngine = "mud" | "ebnf" | "asdl" | "toml" | "grammar";
export type GrammarMappingSlot =
  | "keyword"
  | "operator-word"
  | "builtin"
  | "constant"
  | "operator-symbol"
  | "brace"
  | "parenthesis"
  | "bracket"
  | "punctuation"
  | "contextual"
  | "declaration-name";

export interface CategoryDefinition {
  id: string;
  name: string;
  description: string;
  group: string;
  role: VisualRole;
}

export interface CategoryGroup {
  id: string;
  name: string;
}

export interface GrammarCategoryMapping {
  slot: GrammarMappingSlot;
  grammar: "lexical" | "syntax";
  production: string;
  category: string;
}

export interface LanguageDescriptor {
  schemaVersion: 1;
  id: string;
  name: string;
  engine: LanguageEngine;
  fences: string[];
  extensions: string[];
  groups: CategoryGroup[];
  categories: CategoryDefinition[];
  grammarMappings: GrammarCategoryMapping[];
  previewSource: string;
  translations?: Record<
    string,
    {
      name?: string;
      groups?: Record<string, string>;
      categories?: Record<string, { name?: string; description?: string }>;
    }
  >;
}

const IDENTIFIER = /^[a-z][a-z0-9-]*$/;
const FENCE = /^[A-Za-z0-9_-]+$/;
const ENGINES = new Set<LanguageEngine>(["mud", "ebnf", "asdl", "toml", "grammar"]);
const ROLES = new Set<string>(VISUAL_ROLES);
const SLOTS = new Set<GrammarMappingSlot>([
  "keyword",
  "operator-word",
  "builtin",
  "constant",
  "operator-symbol",
  "brace",
  "parenthesis",
  "bracket",
  "punctuation",
  "contextual",
  "declaration-name",
]);
const ENGINE_REQUIRED_CATEGORIES: Readonly<
  Record<LanguageEngine, readonly string[]>
> = {
  mud: [
    "comment",
    "specialization-reference",
    "family-member",
    "type-reference",
    "invocation-name",
    "unit",
    "text",
    "character",
    "exact-number",
    "rumber",
    "point-literal",
  ],
  ebnf: [
    "comment",
    "production-definition",
    "production-reference",
    "external-terminal",
    "terminal-literal",
    "special-sequence",
    "definition-symbol",
    "alternative",
    "sequence-separator",
    "terminator",
    "group",
    "optional",
    "repetition",
    "number",
  ],
  asdl: [
    "comment",
    "asdl-keyword",
    "module-name",
    "defined-type",
    "constructor",
    "builtin-type",
    "type-reference",
    "field-name",
    "cardinality",
    "assignment",
    "alternative",
    "delimiter",
    "separator",
    "string",
    "number",
  ],
  toml: [
    "comment",
    "table-header",
    "bare-key",
    "quoted-key",
    "string",
    "number",
    "boolean",
    "date-time",
    "assignment",
    "delimiter",
    "separator",
  ],
  grammar: ["comment", "string", "character", "number", "invocation"],
};

function objectValue(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, message: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
  return value.trim();
}

function stringList(
  value: unknown,
  field: string,
  pattern: RegExp = FENCE,
): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((entry) => typeof entry === "string" && pattern.test(entry))
  ) {
    throw new Error(`${field} must be a list of valid identifiers.`);
  }
  return [...new Set((value as unknown[]).map((entry) => String(entry)))];
}

export function validateLanguageDescriptor(value: unknown): LanguageDescriptor {
  const source = objectValue(value, "The descriptor must be a JSON object.");
  if (source.schemaVersion !== 1) {
    throw new Error("schemaVersion must be 1.");
  }
  const id = stringValue(source.id, "Missing id.");
  if (!IDENTIFIER.test(id)) throw new Error(`Invalid language id: ${id}`);
  const name = stringValue(source.name, "Missing name.");
  if (typeof source.engine !== "string" || !ENGINES.has(source.engine as LanguageEngine)) {
    throw new Error(`Invalid language engine: ${String(source.engine)}`);
  }
  const engine = source.engine as LanguageEngine;
  const fences = stringList(source.fences, "fences");
  const extensions = stringList(source.extensions, "extensions");

  if (!Array.isArray(source.groups) || source.groups.length === 0) {
    throw new Error("groups must contain at least one group.");
  }
  const groups: CategoryGroup[] = source.groups.map((entry, index) => {
    const group = objectValue(entry, `Invalid group ${index + 1}.`);
    const groupId = stringValue(group.id, `Missing id in group ${index + 1}.`);
    if (!IDENTIFIER.test(groupId)) throw new Error(`Invalid group id: ${groupId}`);
    return {
      id: groupId,
      name: stringValue(group.name, `Missing name in group ${groupId}.`),
    };
  });
  const groupIds = new Set(groups.map(({ id: groupId }) => groupId));
  if (groupIds.size !== groups.length) throw new Error("Duplicate group identifiers.");

  if (!Array.isArray(source.categories) || source.categories.length === 0) {
    throw new Error("categories must contain at least one category.");
  }
  const categories: CategoryDefinition[] = source.categories.map((entry, index) => {
    const category = objectValue(entry, `Invalid category ${index + 1}.`);
    const categoryId = stringValue(category.id, `Missing id in category ${index + 1}.`);
    if (!IDENTIFIER.test(categoryId)) {
      throw new Error(`Invalid category id: ${categoryId}`);
    }
    const group = stringValue(category.group, `Missing group in ${categoryId}.`);
    if (!groupIds.has(group)) {
      throw new Error(`Category ${categoryId} references unknown group ${group}.`);
    }
    if (typeof category.role !== "string" || !ROLES.has(category.role)) {
      throw new Error(`Invalid visual role in ${categoryId}: ${String(category.role)}`);
    }
    return {
      id: categoryId,
      name: stringValue(category.name, `Missing name in ${categoryId}.`),
      description: stringValue(
        category.description,
        `Missing description in ${categoryId}.`,
      ),
      group,
      role: category.role as VisualRole,
    };
  });
  const categoryIds = new Set(categories.map(({ id: categoryId }) => categoryId));
  if (categoryIds.size !== categories.length) {
    throw new Error("Duplicate category identifiers.");
  }
  const missingCategories = ENGINE_REQUIRED_CATEGORIES[engine].filter(
    (categoryId) => !categoryIds.has(categoryId),
  );
  if (missingCategories.length > 0) {
    throw new Error(
      `Missing categories required by the ${engine} engine: ${missingCategories.join(", ")}.`,
    );
  }

  if (!Array.isArray(source.grammarMappings)) {
    throw new Error("grammarMappings must be a list.");
  }
  const grammarMappings: GrammarCategoryMapping[] = source.grammarMappings.map(
    (entry, index) => {
      const mapping = objectValue(entry, `Invalid mapping ${index + 1}.`);
      if (typeof mapping.slot !== "string" || !SLOTS.has(mapping.slot as GrammarMappingSlot)) {
        throw new Error(`Invalid grammar slot: ${String(mapping.slot)}`);
      }
      if (mapping.grammar !== "lexical" && mapping.grammar !== "syntax") {
        throw new Error(`Invalid grammar source in ${mapping.slot}.`);
      }
      const expectedGrammar =
        mapping.slot === "declaration-name" ? "syntax" : "lexical";
      if (mapping.grammar !== expectedGrammar) {
        throw new Error(
          `Slot ${mapping.slot} must use the ${expectedGrammar} grammar.`,
        );
      }
      const category = stringValue(
        mapping.category,
        `Missing category in ${mapping.slot}.`,
      );
      if (!categoryIds.has(category)) {
        throw new Error(`Mapping ${mapping.slot} references unknown category ${category}.`);
      }
      return {
        slot: mapping.slot as GrammarMappingSlot,
        grammar: mapping.grammar,
        production: stringValue(
          mapping.production,
          `Missing production in ${mapping.slot}.`,
        ),
        category,
      };
    },
  );
  if (new Set(grammarMappings.map(({ slot }) => slot)).size !== grammarMappings.length) {
    throw new Error("Duplicate grammar slots.");
  }
  if ((engine === "mud" || engine === "grammar") && grammarMappings.length === 0) {
    throw new Error(`The ${engine} engine requires grammarMappings.`);
  }

  return {
    schemaVersion: 1,
    id,
    name,
    engine,
    fences,
    extensions,
    groups,
    categories,
    grammarMappings,
    previewSource:
      typeof source.previewSource === "string" ? source.previewSource : "",
    translations:
      typeof source.translations === "object" &&
      source.translations !== null &&
      !Array.isArray(source.translations)
        ? (source.translations as LanguageDescriptor["translations"])
        : undefined,
  };
}

export const BUILTIN_DESCRIPTORS: Readonly<Record<string, LanguageDescriptor>> = {
  mud: validateLanguageDescriptor(MUD_DESCRIPTOR_V1),
  ebnf: validateLanguageDescriptor(ebnfDescriptorSource),
  asdl: validateLanguageDescriptor(asdlDescriptorSource),
  toml: validateLanguageDescriptor(tomlDescriptorSource),
  generic: validateLanguageDescriptor(genericDescriptorSource),
};

export function descriptorCategory(
  descriptor: LanguageDescriptor,
  categoryId: string,
): CategoryDefinition | undefined {
  return descriptor.categories.find(({ id }) => id === categoryId);
}
