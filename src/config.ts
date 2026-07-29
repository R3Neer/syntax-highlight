import bundledLexicalGrammar from "../../../../especificacion/gramatica/mud-lexico.ebnf";
import bundledSyntaxGrammar from "../../../../especificacion/gramatica/mud.ebnf";

import {
  collectLiterals,
  findLiteralContexts,
  literalsBeforeReference,
  parseEbnf,
  validateEbnf,
} from "./grammar/ebnf";
import type { GrammarCategorySettings } from "./settings";
import type { SyntaxTokenKind } from "./tokenizer";

export interface ContextualKeyword {
  word: string;
  previous?: string;
  next?: string;
}

export interface MudHighlightConfig {
  schemaVersion: 2;
  words: Readonly<Record<"keyword" | "operator" | "builtin" | "constant", readonly string[]>>;
  symbols: Readonly<
    Record<
      "operator" | "brace" | "parenthesis" | "bracket" | "punctuation",
      readonly string[]
    >
  >;
  declarationHeads: readonly string[];
  contextualKeywords: readonly ContextualKeyword[];
}

export interface PreparedHighlightConfig {
  words: ReadonlyMap<string, SyntaxTokenKind>;
  symbols: readonly { text: string; kind: SyntaxTokenKind }[];
  declarationHeads: ReadonlySet<string>;
  contextualKeywords: readonly ContextualKeyword[];
}

const CATEGORY_KEYS: readonly (keyof GrammarCategorySettings)[] = [
  "keyword",
  "operatorWord",
  "builtin",
  "constant",
  "operatorSymbol",
  "brace",
  "parenthesis",
  "bracket",
  "punctuation",
  "contextual",
  "declarationName",
];

function sorted(values: ReadonlySet<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
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
    for (const previous of context.previous) {
      add({ word: context.value, previous });
    }
  }
  if (words.has("anchor")) add({ word: "anchor", next: "{" });
  return result.sort((left, right) =>
    `${left.word}\0${left.previous ?? ""}\0${left.next ?? ""}`.localeCompare(
      `${right.word}\0${right.previous ?? ""}\0${right.next ?? ""}`,
    ),
  );
}

export function compileMudHighlightConfig(
  lexicalGrammarSource: string,
  syntaxGrammarSource: string,
): MudHighlightConfig {
  return compileGrammarHighlightConfig(
    lexicalGrammarSource,
    syntaxGrammarSource,
    {
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
    },
    "mud-source",
    "mud-file",
  );
}

export function compileGrammarHighlightConfig(
  lexicalGrammarSource: string,
  syntaxGrammarSource: string,
  categories: GrammarCategorySettings,
  lexicalStart?: string,
  syntaxStart?: string,
): MudHighlightConfig {
  const lexical = parseEbnf(lexicalGrammarSource);
  const syntax = parseEbnf(syntaxGrammarSource);
  const diagnostics = [
    ...validateEbnf(lexical, lexicalStart || undefined),
    ...validateEbnf(syntax, syntaxStart || undefined),
  ];
  for (const category of CATEGORY_KEYS) {
    const production = categories[category];
    const grammar = category === "declarationName" ? syntax : lexical;
    if (!production) {
      diagnostics.push({
        message: `Falta la producción configurada para ${category}`,
        position: { offset: 0, line: 1, column: 1 },
      });
    } else if (!grammar.productions.has(production)) {
      diagnostics.push({
        message: `La producción configurada para ${category} no existe: ${production}`,
        position: { offset: 0, line: 1, column: 1 },
      });
    }
  }
  if (diagnostics.length > 0) {
    throw new Error(
      diagnostics
        .map(
          ({ message, position }) =>
            `${position.line}:${position.column}: ${message}`,
        )
        .join("\n"),
    );
  }

  return {
    schemaVersion: 2,
    words: {
      keyword: sorted(collectLiterals(lexical, categories.keyword)),
      operator: sorted(collectLiterals(lexical, categories.operatorWord)),
      builtin: sorted(collectLiterals(lexical, categories.builtin)),
      constant: sorted(collectLiterals(lexical, categories.constant)),
    },
    symbols: {
      operator: sorted(collectLiterals(lexical, categories.operatorSymbol)),
      brace: sorted(collectLiterals(lexical, categories.brace)),
      parenthesis: sorted(collectLiterals(lexical, categories.parenthesis)),
      bracket: sorted(collectLiterals(lexical, categories.bracket)),
      punctuation: sorted(collectLiterals(lexical, categories.punctuation)),
    },
    declarationHeads: sorted(
      literalsBeforeReference(syntax, categories.declarationName),
    ),
    contextualKeywords: contextualRules(
      lexicalGrammarSource,
      syntaxGrammarSource,
      categories.contextual,
    ),
  };
}

export function prepareHighlightConfig(
  config: MudHighlightConfig,
): PreparedHighlightConfig {
  const words = new Map<string, SyntaxTokenKind>();
  for (const [kind, values] of Object.entries(config.words)) {
    for (const value of values) words.set(value, kind as SyntaxTokenKind);
  }
  const symbols = Object.entries(config.symbols)
    .flatMap(([kind, values]) =>
      values.map((text) => ({ text, kind: kind as SyntaxTokenKind })),
    )
    .sort((left, right) => right.text.length - left.text.length);
  return {
    words,
    symbols,
    declarationHeads: new Set(config.declarationHeads),
    contextualKeywords: config.contextualKeywords,
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
