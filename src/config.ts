import defaultConfigData from "../mud-highlight.json";

import type { MudTokenKind } from "./tokenizer";

const WORD_KINDS = ["keyword", "operator", "builtin", "constant"] as const;
const SYMBOL_KINDS = [
  "operator",
  "brace",
  "parenthesis",
  "bracket",
  "punctuation",
] as const;

type WordKind = (typeof WORD_KINDS)[number];
type SymbolKind = (typeof SYMBOL_KINDS)[number];

export interface ContextualKeyword {
  word: string;
  previous?: string;
  next?: string;
}

export interface MudHighlightConfig {
  schemaVersion: 1;
  words: Record<WordKind, readonly string[]>;
  symbols: Record<SymbolKind, readonly string[]>;
  declarationHeads: readonly string[];
  contextualKeywords: readonly ContextualKeyword[];
}

export interface PreparedHighlightConfig {
  words: ReadonlyMap<string, MudTokenKind>;
  symbols: readonly { text: string; kind: MudTokenKind }[];
  declarationHeads: ReadonlySet<string>;
  contextualKeywords: readonly ContextualKeyword[];
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} debe ser un objeto.`);
  }
  return value as Record<string, unknown>;
}

function stringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} debe ser una lista de cadenas no vacías.`);
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0) {
      throw new Error(`${label} debe ser una lista de cadenas no vacías.`);
    }
    result.push(item);
  }
  return result;
}

function categoryRecord<T extends string>(
  value: unknown,
  kinds: readonly T[],
  label: string,
): Record<T, string[]> {
  const object = objectValue(value, label);
  const actual = Object.keys(object).sort();
  const expected = [...kinds].sort();
  if (actual.join("\0") !== expected.join("\0")) {
    throw new Error(`${label} debe contener exactamente: ${kinds.join(", ")}.`);
  }
  return Object.fromEntries(
    kinds.map((kind) => [kind, stringList(object[kind], `${label}.${kind}`)]),
  ) as Record<T, string[]>;
}

function contextualList(value: unknown): ContextualKeyword[] {
  if (!Array.isArray(value)) {
    throw new Error("contextualKeywords debe ser una lista.");
  }
  return value.map((item, index) => {
    const object = objectValue(item, `contextualKeywords[${index}]`);
    const word = object.word;
    const previous = object.previous;
    const next = object.next;
    if (typeof word !== "string" || word.length === 0) {
      throw new Error(`contextualKeywords[${index}].word debe ser una cadena.`);
    }
    if (previous !== undefined && typeof previous !== "string") {
      throw new Error(`contextualKeywords[${index}].previous debe ser una cadena.`);
    }
    if (next !== undefined && typeof next !== "string") {
      throw new Error(`contextualKeywords[${index}].next debe ser una cadena.`);
    }
    if (previous === undefined && next === undefined) {
      throw new Error(`contextualKeywords[${index}] necesita previous o next.`);
    }
    return { word, previous, next };
  });
}

function rejectDuplicates(
  groups: Record<string, readonly string[]>,
  label: string,
): void {
  const owners = new Map<string, string>();
  for (const [kind, values] of Object.entries(groups)) {
    for (const value of values) {
      const owner = owners.get(value);
      if (owner !== undefined) {
        throw new Error(`${JSON.stringify(value)} aparece en ${label}.${owner} y ${label}.${kind}.`);
      }
      owners.set(value, kind);
    }
  }
}

export function parseHighlightConfig(value: unknown): MudHighlightConfig {
  const object = objectValue(value, "La configuración");
  if (object.schemaVersion !== 1) {
    throw new Error("schemaVersion debe ser 1.");
  }
  const words = categoryRecord(object.words, WORD_KINDS, "words");
  const symbols = categoryRecord(object.symbols, SYMBOL_KINDS, "symbols");
  rejectDuplicates(words, "words");
  rejectDuplicates(symbols, "symbols");
  for (const [kind, values] of Object.entries(words)) {
    if (values.some((word) => !/^[A-Za-z][A-Za-z0-9]*$/.test(word))) {
      throw new Error(`words.${kind} solo admite identificadores ASCII de MUD.`);
    }
  }
  for (const [kind, values] of Object.entries(symbols)) {
    if (values.some((symbol) => /[\sA-Za-z0-9'"#]/.test(symbol))) {
      throw new Error(
        `symbols.${kind} no admite espacios, identificadores, comillas ni #.`,
      );
    }
  }
  const declarationHeads = stringList(object.declarationHeads, "declarationHeads");
  if (declarationHeads.some((word) => !/^[A-Za-z][A-Za-z0-9]*$/.test(word))) {
    throw new Error("declarationHeads solo admite identificadores ASCII de MUD.");
  }
  return {
    schemaVersion: 1,
    words,
    symbols,
    declarationHeads,
    contextualKeywords: contextualList(object.contextualKeywords),
  };
}

export function prepareHighlightConfig(
  config: MudHighlightConfig,
): PreparedHighlightConfig {
  const words = new Map<string, MudTokenKind>();
  for (const [kind, values] of Object.entries(config.words)) {
    for (const value of values) words.set(value, kind as MudTokenKind);
  }
  const symbols = Object.entries(config.symbols)
    .flatMap(([kind, values]) =>
      values.map((text) => ({ text, kind: kind as MudTokenKind })),
    )
    .sort((left, right) => right.text.length - left.text.length);
  return {
    words,
    symbols,
    declarationHeads: new Set(config.declarationHeads),
    contextualKeywords: config.contextualKeywords,
  };
}

export const DEFAULT_HIGHLIGHT_CONFIG = parseHighlightConfig(defaultConfigData);
