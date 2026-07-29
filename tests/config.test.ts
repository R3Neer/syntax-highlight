import { describe, expect, it } from "vitest";

import {
  DEFAULT_HIGHLIGHT_CONFIG,
  compileMudHighlightConfig,
} from "../src/config";
import { parseEbnf, validateEbnf } from "../src/grammar/ebnf";
import { tokenizeMud } from "../src/tokenizer";

describe("compilación EBNF del resaltado MUD", () => {
  it("deriva palabras, símbolos y contextuales de las gramáticas normativas", () => {
    expect(DEFAULT_HIGHLIGHT_CONFIG.schemaVersion).toBe(2);
    expect(DEFAULT_HIGHLIGHT_CONFIG.words.keyword).toContain("thing");
    expect(DEFAULT_HIGHLIGHT_CONFIG.words.operator).toContain("xor");
    expect(DEFAULT_HIGHLIGHT_CONFIG.words.operator).not.toContain("implies");
    expect(DEFAULT_HIGHLIGHT_CONFIG.symbols.operator).toContain("!=");
    expect(DEFAULT_HIGHLIGHT_CONFIG.symbols.operator).not.toContain("!");
    expect(DEFAULT_HIGHLIGHT_CONFIG.contextualKeywords).toContainEqual({
      word: "format",
      next: "=",
    });
    expect(DEFAULT_HIGHLIGHT_CONFIG.contextualKeywords).toContainEqual({
      word: "name",
      next: "=",
    });
  });

  it("aplica las categorías derivadas al tokenizador", () => {
    expect(
      tokenizeMud("format = value\nname = \"Ada\"\nimplies !").map(
        ({ text, kind }) => [text, kind],
      ),
    ).toEqual([
      ["format", "keyword"],
      ["=", "operator"],
      ["name", "keyword"],
      ["=", "operator"],
      ['"Ada"', "string"],
    ]);
  });

  it("mantiene un literal de punto numérico como una sola unidad visual", () => {
    expect(tokenizeMud("at 26:00:00")[0]).toMatchObject({
      text: "26:00:00",
      kind: "number",
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
