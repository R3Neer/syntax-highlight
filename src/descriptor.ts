import asdlDescriptorSource from "../languages/asdl.json";
import ebnfDescriptorSource from "../languages/ebnf.json";
import genericDescriptorSource from "../languages/generic.json";
import mudDescriptorSource from "../languages/mud.json";

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
export type LanguageEngine = "mud" | "ebnf" | "asdl" | "grammar";
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
}

const IDENTIFIER = /^[a-z][a-z0-9-]*$/;
const FENCE = /^[A-Za-z0-9_-]+$/;
const ENGINES = new Set<LanguageEngine>(["mud", "ebnf", "asdl", "grammar"]);
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
    throw new Error(`${field} debe ser una lista de identificadores válidos.`);
  }
  return [...new Set((value as unknown[]).map((entry) => String(entry)))];
}

export function validateLanguageDescriptor(value: unknown): LanguageDescriptor {
  const source = objectValue(value, "El descriptor debe ser un objeto JSON.");
  if (source.schemaVersion !== 1) {
    throw new Error("schemaVersion debe ser 1.");
  }
  const id = stringValue(source.id, "Falta id.");
  if (!IDENTIFIER.test(id)) throw new Error(`Identificador de lenguaje inválido: ${id}`);
  const name = stringValue(source.name, "Falta name.");
  if (typeof source.engine !== "string" || !ENGINES.has(source.engine as LanguageEngine)) {
    throw new Error(`Motor de lenguaje inválido: ${String(source.engine)}`);
  }
  const engine = source.engine as LanguageEngine;
  const fences = stringList(source.fences, "fences");
  const extensions = stringList(source.extensions, "extensions");

  if (!Array.isArray(source.groups) || source.groups.length === 0) {
    throw new Error("groups debe contener al menos un grupo.");
  }
  const groups: CategoryGroup[] = source.groups.map((entry, index) => {
    const group = objectValue(entry, `Grupo ${index + 1} inválido.`);
    const groupId = stringValue(group.id, `Falta id en el grupo ${index + 1}.`);
    if (!IDENTIFIER.test(groupId)) throw new Error(`Id de grupo inválido: ${groupId}`);
    return {
      id: groupId,
      name: stringValue(group.name, `Falta name en el grupo ${groupId}.`),
    };
  });
  const groupIds = new Set(groups.map(({ id: groupId }) => groupId));
  if (groupIds.size !== groups.length) throw new Error("Hay identificadores de grupo repetidos.");

  if (!Array.isArray(source.categories) || source.categories.length === 0) {
    throw new Error("categories debe contener al menos una categoría.");
  }
  const categories: CategoryDefinition[] = source.categories.map((entry, index) => {
    const category = objectValue(entry, `Categoría ${index + 1} inválida.`);
    const categoryId = stringValue(category.id, `Falta id en la categoría ${index + 1}.`);
    if (!IDENTIFIER.test(categoryId)) {
      throw new Error(`Id de categoría inválido: ${categoryId}`);
    }
    const group = stringValue(category.group, `Falta group en ${categoryId}.`);
    if (!groupIds.has(group)) {
      throw new Error(`La categoría ${categoryId} referencia el grupo inexistente ${group}.`);
    }
    if (typeof category.role !== "string" || !ROLES.has(category.role)) {
      throw new Error(`Rol visual inválido en ${categoryId}: ${String(category.role)}`);
    }
    return {
      id: categoryId,
      name: stringValue(category.name, `Falta name en ${categoryId}.`),
      description: stringValue(
        category.description,
        `Falta description en ${categoryId}.`,
      ),
      group,
      role: category.role as VisualRole,
    };
  });
  const categoryIds = new Set(categories.map(({ id: categoryId }) => categoryId));
  if (categoryIds.size !== categories.length) {
    throw new Error("Hay identificadores de categoría repetidos.");
  }
  const missingCategories = ENGINE_REQUIRED_CATEGORIES[engine].filter(
    (categoryId) => !categoryIds.has(categoryId),
  );
  if (missingCategories.length > 0) {
    throw new Error(
      `Faltan categorías requeridas por el motor ${engine}: ${missingCategories.join(", ")}.`,
    );
  }

  if (!Array.isArray(source.grammarMappings)) {
    throw new Error("grammarMappings debe ser una lista.");
  }
  const grammarMappings: GrammarCategoryMapping[] = source.grammarMappings.map(
    (entry, index) => {
      const mapping = objectValue(entry, `Mapeo ${index + 1} inválido.`);
      if (typeof mapping.slot !== "string" || !SLOTS.has(mapping.slot as GrammarMappingSlot)) {
        throw new Error(`Slot de gramática inválido: ${String(mapping.slot)}`);
      }
      if (mapping.grammar !== "lexical" && mapping.grammar !== "syntax") {
        throw new Error(`Origen de gramática inválido en ${mapping.slot}.`);
      }
      const expectedGrammar =
        mapping.slot === "declaration-name" ? "syntax" : "lexical";
      if (mapping.grammar !== expectedGrammar) {
        throw new Error(
          `El slot ${mapping.slot} debe usar la gramática ${expectedGrammar}.`,
        );
      }
      const category = stringValue(
        mapping.category,
        `Falta category en ${mapping.slot}.`,
      );
      if (!categoryIds.has(category)) {
        throw new Error(`El mapeo ${mapping.slot} referencia la categoría inexistente ${category}.`);
      }
      return {
        slot: mapping.slot as GrammarMappingSlot,
        grammar: mapping.grammar,
        production: stringValue(
          mapping.production,
          `Falta production en ${mapping.slot}.`,
        ),
        category,
      };
    },
  );
  if (new Set(grammarMappings.map(({ slot }) => slot)).size !== grammarMappings.length) {
    throw new Error("Hay slots de gramática repetidos.");
  }
  if ((engine === "mud" || engine === "grammar") && grammarMappings.length === 0) {
    throw new Error(`El motor ${engine} requiere grammarMappings.`);
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
  };
}

export const BUILTIN_DESCRIPTORS: Readonly<Record<string, LanguageDescriptor>> = {
  mud: validateLanguageDescriptor(mudDescriptorSource),
  ebnf: validateLanguageDescriptor(ebnfDescriptorSource),
  asdl: validateLanguageDescriptor(asdlDescriptorSource),
  generic: validateLanguageDescriptor(genericDescriptorSource),
};

export function descriptorCategory(
  descriptor: LanguageDescriptor,
  categoryId: string,
): CategoryDefinition | undefined {
  return descriptor.categories.find(({ id }) => id === categoryId);
}
