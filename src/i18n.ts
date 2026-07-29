import type { SyntaxPluginSettings } from "./settings";
import type {
  CategoryDefinition,
  CategoryGroup,
  LanguageDescriptor,
} from "./descriptor";

export type UiLocale = "en" | "es";

export function effectiveLocale(settings: SyntaxPluginSettings): UiLocale {
  if (settings.locale !== "auto") return settings.locale;
  const locale =
    typeof document !== "undefined" && document.documentElement.lang
      ? document.documentElement.lang
      : typeof navigator !== "undefined"
        ? navigator.language
        : "en";
  return locale.toLocaleLowerCase().startsWith("es") ? "es" : "en";
}

export function translate(
  settings: SyntaxPluginSettings,
  english: string,
  spanish: string,
): string {
  return effectiveLocale(settings) === "es" ? spanish : english;
}

const ENGLISH_CATEGORY_NAMES: Readonly<Record<string, string>> = {
  comment: "Comment", "reserved-word": "Reserved word",
  "word-operator": "Word operator", "builtin-type": "Built-in type",
  "literal-constant": "Literal constant", "contextual-word": "Contextual word",
  "declared-name": "Declared name", "specialization-reference": "Specialization reference",
  "family-member": "Family member", "type-reference": "Type reference",
  "invocation-name": "Invocation", unit: "Unit", text: "Text",
  character: "Character", "exact-number": "Exact number", rumber: "Rumber",
  "point-literal": "Point literal", "symbolic-operator": "Symbolic operator",
  brace: "Braces", parenthesis: "Parentheses", bracket: "Brackets",
  punctuation: "Punctuation", "production-definition": "Production definition",
  "production-reference": "Production reference", "external-terminal": "External terminal",
  "terminal-literal": "Terminal literal", "special-sequence": "Special sequence",
  "definition-symbol": "Definition symbol", alternative: "Alternative",
  "sequence-separator": "Sequence separator", terminator: "Terminator",
  group: "Group", optional: "Optional", repetition: "Repetition",
  number: "Number", "asdl-keyword": "ASDL keyword", "module-name": "Module name",
  "defined-type": "Defined type", constructor: "Constructor",
  "field-name": "Field name", cardinality: "Cardinality",
  assignment: "Assignment", delimiter: "Delimiter", separator: "Separator",
  string: "String", keyword: "Keyword", "operator-word": "Word operator",
  builtin: "Built-in element", constant: "Constant", contextual: "Contextual word",
  declaration: "Declared name", invocation: "Invocation", operator: "Operator",
};

export function descriptorName(
  settings: SyntaxPluginSettings,
  descriptor: LanguageDescriptor,
): string {
  const locale = effectiveLocale(settings);
  return descriptor.translations?.[locale]?.name ??
    (locale === "en" && descriptor.id === "generic"
      ? "Generic language"
      : descriptor.name);
}

export function groupName(
  settings: SyntaxPluginSettings,
  descriptor: LanguageDescriptor,
  group: CategoryGroup,
): string {
  const locale = effectiveLocale(settings);
  if (locale === "es") return descriptor.translations?.es?.groups?.[group.id] ?? group.name;
  return descriptor.translations?.en?.groups?.[group.id] ??
    group.id.replace(/-/g, " ").replace(/^\w/, (value) => value.toUpperCase());
}

export function categoryText(
  settings: SyntaxPluginSettings,
  descriptor: LanguageDescriptor,
  category: CategoryDefinition,
): { name: string; description: string } {
  const locale = effectiveLocale(settings);
  const translation = descriptor.translations?.[locale]?.categories?.[category.id];
  if (locale === "es") {
    return {
      name: translation?.name ?? category.name,
      description: translation?.description ?? category.description,
    };
  }
  const name = translation?.name ?? ENGLISH_CATEGORY_NAMES[category.id] ??
    category.id.replace(/-/g, " ");
  return {
    name,
    description: translation?.description ?? `Syntax category for ${name.toLocaleLowerCase()}.`,
  };
}
