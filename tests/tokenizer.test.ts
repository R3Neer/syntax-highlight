import { describe, expect, it } from "vitest";

import { tokenizeMud } from "../src/tokenizer";

function compact(source: string): Array<[string, string]> {
  return tokenizeMud(source).map((token) => [token.text, token.kind]);
}

describe("tokenizeMud", () => {
  it("leaves fields plain and highlights their types", () => {
    expect(
      compact(
        "ordered family Color { value: Character owner: PlayerName owner = owner }",
      ),
    ).toEqual([
      ["ordered", "keyword"],
      ["family", "keyword"],
      ["Color", "declaration"],
      ["{", "brace"],
      [":", "punctuation"],
      ["Character", "builtin"],
      [":", "punctuation"],
      ["PlayerName", "type"],
      ["=", "operator"],
      ["}", "brace"],
    ]);
  });

  it("highlights inherited things like the thing being declared", () => {
    expect(compact("thing A as B, C {}")).toEqual([
      ["thing", "keyword"],
      ["A", "declaration"],
      ["as", "keyword"],
      ["B", "declaration"],
      [",", "punctuation"],
      ["C", "declaration"],
      ["{", "brace"],
      ["}", "brace"],
    ]);
  });

  it("recognises user types in conversions and alias definitions", () => {
    expect(compact("alias Names := PlayerName -> Score\nraw to PlayerName")).toEqual([
      ["alias", "keyword"],
      ["Names", "declaration"],
      [":=", "operator"],
      ["PlayerName", "type"],
      ["->", "operator"],
      ["Score", "type"],
      ["to", "operator"],
      ["PlayerName", "type"],
    ]);
  });

  it("highlights family members but not their data fields", () => {
    const source = [
      "family Terrain {",
      "  movementCost: Natural = 1",
      "  Plain,",
      "  Forest {",
      "    movementCost = 2",
      "  },",
      "  Water",
      "}",
    ].join("\n");
    expect(compact(source)).toEqual([
      ["family", "keyword"],
      ["Terrain", "declaration"],
      ["{", "brace"],
      [":", "punctuation"],
      ["Natural", "builtin"],
      ["=", "operator"],
      ["1", "number"],
      ["Plain", "constant"],
      [",", "punctuation"],
      ["Forest", "constant"],
      ["{", "brace"],
      ["=", "operator"],
      ["2", "number"],
      ["}", "brace"],
      [",", "punctuation"],
      ["Water", "constant"],
      ["}", "brace"],
    ]);
  });

  it("highlights every magnitude in a derived dimension expression", () => {
    const source = [
      "magnitude Acceleration: Number :=",
      "  Length / (Time * Time)",
      "{}",
    ].join("\n");
    expect(compact(source)).toEqual([
      ["magnitude", "keyword"],
      ["Acceleration", "declaration"],
      [":", "punctuation"],
      ["Number", "builtin"],
      [":=", "operator"],
      ["Length", "type"],
      ["/", "operator"],
      ["(", "parenthesis"],
      ["Time", "type"],
      ["*", "operator"],
      ["Time", "type"],
      [")", "parenthesis"],
      ["{", "brace"],
      ["}", "brace"],
    ]);
  });

  it("highlights complete unit expressions attached to quantities", () => {
    expect(compact("10 m/s + 90 km/h + 3 Mm/ps + 30 people")).toEqual([
      ["10", "number"],
      ["m", "unit"],
      ["/", "unit"],
      ["s", "unit"],
      ["+", "operator"],
      ["90", "number"],
      ["km", "unit"],
      ["/", "unit"],
      ["h", "unit"],
      ["+", "operator"],
      ["3", "number"],
      ["Mm", "unit"],
      ["/", "unit"],
      ["ps", "unit"],
      ["+", "operator"],
      ["30", "number"],
      ["people", "unit"],
    ]);
  });

  it("distinguishes compound unit conversion from ordinary arithmetic", () => {
    expect(compact("speed in km/h + 10 * count")).toEqual([
      ["in", "operator"],
      ["km", "unit"],
      ["/", "unit"],
      ["h", "unit"],
      ["+", "operator"],
      ["10", "number"],
      ["*", "operator"],
      ["count", "keyword"],
    ]);
  });

  it("distinguishes braces, parentheses and brackets", () => {
    expect(compact("rule R(A) { values[0] }")).toEqual([
      ["rule", "keyword"],
      ["R", "declaration"],
      ["(", "parenthesis"],
      [")", "parenthesis"],
      ["{", "brace"],
      ["[", "bracket"],
      ["0", "number"],
      ["]", "bracket"],
      ["}", "brace"],
    ]);
  });

  it("recognises contextual keywords only in their grammar positions", () => {
    expect(compact("abstract thing Place {}\nthing abstract {}")).toContainEqual([
      "abstract",
      "keyword",
    ]);
    const secondAbstract = compact("thing abstract {}").find(
      ([text]) => text === "abstract",
    );
    expect(secondAbstract).toEqual(["abstract", "declaration"]);
  });

  it("keeps an explicitly closed comment separate from following code", () => {
    expect(compact("value # note # + r0.5")).toEqual([
      ["# note #", "comment"],
      ["+", "operator"],
      ["r0.5", "number"],
    ]);
  });

  it("recognises ordinary and multiline text plus Character", () => {
    const source = [
      'name = "Ada',
      "description = \"\"\"",
      "  hello",
      '  """',
      "letter = 'ñ'",
    ].join("\n");
    const tokens = compact(source);
    expect(tokens).toContainEqual(['"Ada', "string"]);
    expect(tokens.some(([text, kind]) => text.startsWith('"""') && kind === "string")).toBe(true);
    expect(tokens).toContainEqual(["'ñ'", "character"]);
  });

  it("recognises multiline comments as a single token", () => {
    const comments = tokenizeMud("###\ncomment\n###\nthing World {}").filter(
      (token) => token.kind === "comment",
    );
    expect(comments).toHaveLength(1);
    expect(comments[0]?.text).toBe("###\ncomment\n###");
  });
});
