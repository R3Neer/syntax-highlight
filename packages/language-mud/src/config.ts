import bundledLexicalGrammar from "../grammars/mud-lexico.ebnf";
import bundledSyntaxGrammar from "../grammars/mud.ebnf";

import {
  collectLiterals,
  findLiteralContexts,
  literalsBeforeReference,
  parseEbnf,
  validateEbnf,
} from "@r3neer/syntax-highlight-core";
import {
  type GrammarCategoryMapping,
  type GrammarMappingSlot,
  type LegacyLanguageDescriptor,
  MUD_DESCRIPTOR_V1,
} from "./legacy";

export interface ContextualKeyword {
  word: string;
  previous?: string;
  next?: string;
}

export interface MudHighlightConfig {
  schemaVersion: 3;
  words: Readonly<Record<string, readonly string[]>>;
  symbols: Readonly<Record<string, readonly string[]>>;
  declarationHeads: readonly string[];
  contextualKeywords: readonly ContextualKeyword[];
  categories: Readonly<Partial<Record<GrammarMappingSlot, string>>>;
}

export interface PreparedHighlightConfig {
  words: ReadonlyMap<string, string>;
  symbols: readonly { text: string; categoryId: string }[];
  declarationHeads: ReadonlySet<string>;
  contextualKeywords: readonly ContextualKeyword[];
  categories: Readonly<Partial<Record<GrammarMappingSlot, string>>>;
}

const REQUIRED_SLOTS: readonly GrammarMappingSlot[] = [
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
];

function sorted(values: ReadonlySet<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function mappingBySlot(
  descriptor: LegacyLanguageDescriptor,
): Map<GrammarMappingSlot, GrammarCategoryMapping> {
  return new Map(descriptor.grammarMappings.map((mapping) => [mapping.slot, mapping]));
}

function contextualRules(
  lexicalGrammarSource: string,
  syntaxGrammarSource: string,
  contextualProduction: string,
): ContextualKeyword[] {
  const lexical = parseEbnf(lexicalGrammarSource);
  const syntax = parseEbnf(syntaxGrammarSource);
  const words = collectLiterals(lexical, contextualProduction);
  const result: ContextualKeyword[] = [];
  const keys = new Set<string>();
  const add = (entry: ContextualKeyword): void => {
    const key = `${entry.word}\0${entry.previous ?? ""}\0${entry.next ?? ""}`;
    if (keys.has(key)) return;
    keys.add(key);
    result.push(entry);
  };
  for (const context of findLiteralContexts(syntax, words)) {
    for (const next of context.next) add({ word: context.value, next });
    for (const previous of context.previous) add({ word: context.value, previous });
  }
  const metadataPredecessors = literalsBeforeReference(syntax, "metadata-name");
  for (const previous of metadataPredecessors) {
    for (const word of words) add({ word, previous });
  }
  return result.sort((left, right) =>
    `${left.word}\0${left.previous ?? ""}\0${left.next ?? ""}`.localeCompare(
      `${right.word}\0${right.previous ?? ""}\0${right.next ?? ""}`,
    ),
  );
}

export function compileMudHighlightConfig(
  lexicalGrammarSource: string,
  syntaxGrammarSource: string,
  descriptor: LegacyLanguageDescriptor = MUD_DESCRIPTOR_V1,
): MudHighlightConfig {
  return compileGrammarHighlightConfig(
    lexicalGrammarSource,
    syntaxGrammarSource,
    descriptor,
    "mud-source",
    "mud-file",
  );
}

export function compileGrammarHighlightConfig(
  lexicalGrammarSource: string,
  syntaxGrammarSource: string,
  descriptor: LegacyLanguageDescriptor,
  lexicalStart?: string,
  syntaxStart?: string,
): MudHighlightConfig {
  const lexical = parseEbnf(lexicalGrammarSource);
  const syntax = parseEbnf(syntaxGrammarSource);
  const mappings = mappingBySlot(descriptor);
  const diagnostics = [
    ...validateEbnf(lexical, lexicalStart || undefined),
    ...validateEbnf(syntax, syntaxStart || undefined),
  ];

  for (const slot of REQUIRED_SLOTS) {
    const mapping = mappings.get(slot);
    if (mapping === undefined) {
      diagnostics.push({
        message: `Falta el mapeo de gramática ${slot}`,
        position: { offset: 0, line: 1, column: 1 },
      });
      continue;
    }
    const grammar = mapping.grammar === "syntax" ? syntax : lexical;
    if (!grammar.productions.has(mapping.production)) {
      diagnostics.push({
        message: `La producción configurada para ${slot} no existe: ${mapping.production}`,
        position: { offset: 0, line: 1, column: 1 },
      });
    }
  }
  if (diagnostics.length > 0) {
    throw new Error(
      diagnostics
        .map(({ message, position }) => `${position.line}:${position.column}: ${message}`)
        .join("\n"),
    );
  }

  const words: Record<string, string[]> = {};
  const symbols: Record<string, string[]> = {};
  for (const slot of ["keyword", "operator-word", "builtin", "constant"] as const) {
    const mapping = mappings.get(slot);
    if (mapping !== undefined) {
      words[mapping.category] = sorted(collectLiterals(lexical, mapping.production));
    }
  }
  for (const slot of [
    "operator-symbol",
    "brace",
    "parenthesis",
    "bracket",
    "punctuation",
  ] as const) {
    const mapping = mappings.get(slot);
    if (mapping !== undefined) {
      symbols[mapping.category] = sorted(collectLiterals(lexical, mapping.production));
    }
  }
  const declaration = mappings.get("declaration-name");
  const contextual = mappings.get("contextual");
  return {
    schemaVersion: 3,
    words,
    symbols,
    declarationHeads:
      declaration === undefined
        ? []
        : sorted(literalsBeforeReference(syntax, declaration.production)),
    contextualKeywords:
      contextual === undefined
        ? []
        : contextualRules(
            lexicalGrammarSource,
            syntaxGrammarSource,
            contextual.production,
          ),
    categories: Object.fromEntries(
      [...mappings].map(([slot, mapping]) => [slot, mapping.category]),
    ),
  };
}

export function prepareHighlightConfig(
  config: MudHighlightConfig,
): PreparedHighlightConfig {
  const words = new Map<string, string>();
  for (const [categoryId, values] of Object.entries(config.words)) {
    for (const value of values) words.set(value, categoryId);
  }
  const symbols = Object.entries(config.symbols)
    .flatMap(([categoryId, values]) =>
      values.map((text) => ({ text, categoryId })),
    )
    .sort((left, right) => right.text.length - left.text.length);
  return {
    words,
    symbols,
    declarationHeads: new Set(config.declarationHeads),
    contextualKeywords: config.contextualKeywords,
    categories: config.categories,
  };
}

export const DEFAULT_HIGHLIGHT_CONFIG = compileMudHighlightConfig(
  bundledLexicalGrammar,
  bundledSyntaxGrammar,
);

export const DEFAULT_MUD_GRAMMAR_PATHS = {
  lexical: "especificacion/gramatica/mud-lexico.ebnf",
  syntax: "especificacion/gramatica/mud.ebnf",
} as const;
