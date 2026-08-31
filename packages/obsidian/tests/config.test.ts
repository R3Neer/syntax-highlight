import { describe, expect, it } from "vitest";

import {
  DEFAULT_HIGHLIGHT_CONFIG,
  compileMudHighlightConfig,
} from "../src/config";
import { parseEbnf, validateEbnf } from "../src/grammar/ebnf";
import { tokenizeMud } from "../src/tokenizer";

describe("compilación EBNF del resaltado MUD", () => {
  it("deriva palabras, símbolos y contextuales de las gramáticas normativas", () => {
    expect(DEFAULT_HIGHLIGHT_CONFIG.schemaVersion).toBe(3);
    expect(DEFAULT_HIGHLIGHT_CONFIG.words["reserved-word"]).toContain("thing");
    expect(DEFAULT_HIGHLIGHT_CONFIG.words["word-operator"]).toContain("xor");
    expect(DEFAULT_HIGHLIGHT_CONFIG.words["word-operator"]).not.toContain("implies");
    expect(DEFAULT_HIGHLIGHT_CONFIG.symbols["symbolic-operator"]).toContain("!=");
    expect(DEFAULT_HIGHLIGHT_CONFIG.symbols["symbolic-operator"]).toEqual(
      expect.arrayContaining(["-->", "--=", "--", "|=", "&=", "^=", "~"]),
    );
    expect(DEFAULT_HIGHLIGHT_CONFIG.symbols["symbolic-operator"]).not.toContain("!");
    expect(DEFAULT_HIGHLIGHT_CONFIG.contextualKeywords).toContainEqual({
      word: "format",
      previous: "~",
    });
    expect(DEFAULT_HIGHLIGHT_CONFIG.contextualKeywords).toContainEqual({
      word: "name",
      previous: "~",
    });
    expect(DEFAULT_HIGHLIGHT_CONFIG.contextualKeywords).toContainEqual({
      word: "cycle",
      previous: "]",
    });
  });

  it("aplica las categorías derivadas al tokenizador", () => {
    expect(
      tokenizeMud("~format = value\n~name = \"Ada\"\n[0..10] cycle\nimplies !").map(
        ({ text, categoryId }) => [text, categoryId],
      ),
    ).toEqual([
      ["~", "symbolic-operator"],
      ["format", "contextual-word"],
      ["=", "symbolic-operator"],
      ["~", "symbolic-operator"],
      ["name", "contextual-word"],
      ["=", "symbolic-operator"],
      ['"Ada"', "text"],
      ["[", "bracket"],
      ["0", "exact-number"],
      ["..", "symbolic-operator"],
      ["10", "exact-number"],
      ["]", "bracket"],
      ["cycle", "declaration-modifier"],
    ]);
  });

  it("mantiene un literal de punto numérico como una sola unidad visual", () => {
    expect(tokenizeMud("at 26:00:00")[0]).toMatchObject({
      text: "26:00:00",
      categoryId: "point-literal",
    });
  });

  it("rechaza gramáticas estructuralmente inválidas", () => {
    expect(() =>
      compileMudHighlightConfig(
        'mud-source ::= missing ;',
        'mud-file ::= "thing" ;',
      ),
    ).toThrow(/Producción indefinida: missing/);
  });
});

describe("parser EBNF", () => {
  it("analiza grupos, opcionales, repeticiones y secuencias especiales", () => {
    const grammar = parseEbnf(
      'start ::= "a" , [ item ] , { ( "b" | ? especial ? ) } ;\n' +
        'item ::= "x" ;',
    );
    expect(grammar.order).toEqual(["start", "item"]);
    expect(validateEbnf(grammar, "start")).toEqual([]);
  });

  it("informa línea y columna en errores sintácticos", () => {
    expect(() => parseEbnf('start ::= "a"\nother ::= "b" ;')).toThrow(
      /Falta una coma.*2:1/,
    );
  });
});
