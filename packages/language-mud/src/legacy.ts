import descriptorSource from "../mud-language-v1.json";

export type GrammarMappingSlot =
  | "keyword" | "operator-word" | "builtin" | "constant"
  | "operator-symbol" | "brace" | "parenthesis" | "bracket"
  | "punctuation" | "contextual" | "declaration-name";

export interface GrammarCategoryMapping {
  slot: GrammarMappingSlot;
  grammar: "lexical" | "syntax";
  production: string;
  category: string;
}

export interface LegacyLanguageDescriptor {
  schemaVersion: 1;
  id: string;
  name: string;
  engine: string;
  fences: string[];
  extensions: string[];
  groups: Array<{ id: string; name: string }>;
  categories: Array<{
    id: string;
    name: string;
    description: string;
    group: string;
    role: string;
  }>;
  grammarMappings: GrammarCategoryMapping[];
  previewSource: string;
}

export const MUD_DESCRIPTOR_V1 = descriptorSource as LegacyLanguageDescriptor;
