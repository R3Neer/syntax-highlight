import {
  validateLanguagePack,
  type LanguageAdapter,
  type LanguagePackV2,
  type VisualRole,
} from "@r3nner/syntax-highlight-core";

import lexicalGrammar from "../grammars/mud-lexico.ebnf";
import syntaxGrammar from "../grammars/mud.ebnf";
import { compileMudHighlightConfig } from "./config";
import { formatMud } from "./formatter";
import { MUD_DESCRIPTOR_V1 } from "./legacy";
import { tokenizeMud } from "./tokenizer";

function hash(source: string): string {
  let value = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    value ^= source.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(16).padStart(8, "0");
}

export const mudLanguagePack: LanguagePackV2 = validateLanguagePack({
  schemaVersion: 2,
  id: "mud",
  version: "1.0.0",
  name: "MUD",
  aliases: ["MUD"],
  fences: ["mud"],
  extensions: ["mud"],
  categories: MUD_DESCRIPTOR_V1.categories.map((category) => ({
    ...category,
    role: category.role as VisualRole,
  })),
  operators: {
    production: "operator-token",
    compact: [".", "..", "~"],
    prefix: ["+", "-", "!"],
    word: ["and", "or", "xor", "not"],
  },
  previewSource: MUD_DESCRIPTOR_V1.previewSource,
});

export interface MudGrammarBundle {
  lexical: string;
  syntax: string;
  revision?: string;
}

export const bundledMudGrammars: MudGrammarBundle = {
  lexical: lexicalGrammar,
  syntax: syntaxGrammar,
  revision: `fallback-${hash(lexicalGrammar + "\0" + syntaxGrammar)}`,
};

export function createMudAdapter(
  grammars: MudGrammarBundle = bundledMudGrammars,
): LanguageAdapter {
  const config = compileMudHighlightConfig(
    grammars.lexical,
    grammars.syntax,
    MUD_DESCRIPTOR_V1,
  );
  return {
    pack: mudLanguagePack,
    revision: grammars.revision ?? `grammar-${hash(grammars.lexical + "\0" + grammars.syntax)}`,
    tokenize: (source) => tokenizeMud(source, config),
    format: (source) => formatMud(source, config),
  };
}
