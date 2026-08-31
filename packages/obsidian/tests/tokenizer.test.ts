import { describe, expect, it } from "vitest";

import { tokenizeMud } from "../src/tokenizer";

function compact(source: string): Array<[string, string]> {
  return tokenizeMud(source).map((token) => [token.text, token.categoryId]);
}

describe("tokenizeMud", () => {
  it("recognises the five current numeric type names", () => {
    expect(compact("Int Nat Num Rum Money")).toEqual([
      ["Int", "builtin-type"],
      ["Nat", "builtin-type"],
      ["Num", "builtin-type"],
      ["Rum", "builtin-type"],
      ["Money", "builtin-type"],
    ]);
  });

  it("recognises Thing as the universal builtin thing type", () => {
    expect(compact("action Inspect for target: Thing {}"))
      .toContainEqual(["Thing", "builtin-type"]);
  });

  it("does not treat the replaced numeric names as builtin types", () => {
    expect(
      compact("thing Sample { a: Integer b: Natural c: Number d: Rumber }"),
    ).toEqual([
      ["thing", "declaration-keyword"],
      ["Sample", "declared-name"],
      ["{", "brace"],
      [":", "punctuation"],
      ["Integer", "type-reference"],
      [":", "punctuation"],
      ["Natural", "type-reference"],
      [":", "punctuation"],
      ["Number", "type-reference"],
      [":", "punctuation"],
      ["Rumber", "type-reference"],
      ["}", "brace"],
    ]);
  });

  it("leaves fields plain and highlights their types", () => {
    expect(
      compact(
        "ordered family Color { value: Char owner: PlayerName owner = owner }",
      ),
    ).toEqual([
      ["ordered", "declaration-modifier"],
      ["family", "declaration-keyword"],
      ["Color", "declared-name"],
      ["{", "brace"],
      [":", "punctuation"],
      ["Char", "builtin-type"],
      [":", "punctuation"],
      ["PlayerName", "type-reference"],
      ["=", "symbolic-operator"],
      ["}", "brace"],
    ]);
  });

  it("highlights inherited things like the thing being declared", () => {
    expect(compact("thing A as B, C {}")).toEqual([
      ["thing", "declaration-keyword"],
      ["A", "declared-name"],
      ["as", "clause-keyword"],
      ["B", "specialization-reference"],
      [",", "punctuation"],
      ["C", "specialization-reference"],
      ["{", "brace"],
      ["}", "brace"],
    ]);
  });

  it("recognises user types in conversions and alias definitions", () => {
    expect(compact("alias Names := PlayerName -> Score\nraw to PlayerName")).toEqual([
      ["alias", "declaration-keyword"],
      ["Names", "declared-name"],
      [":=", "symbolic-operator"],
      ["PlayerName", "type-reference"],
      ["->", "symbolic-operator"],
      ["Score", "type-reference"],
      ["to", "word-operator"],
      ["PlayerName", "type-reference"],
    ]);
  });

  it("recognises union alternatives and type tests", () => {
    expect(compact("value: Nat | Text\nvalue is not Nat")).toEqual([
      [":", "punctuation"],
      ["Nat", "builtin-type"],
      ["|", "symbolic-operator"],
      ["Text", "builtin-type"],
      ["is", "word-operator"],
      ["not", "word-operator"],
      ["Nat", "builtin-type"],
    ]);
    expect(compact("alias Result := Left | Right")).toContainEqual([
      "Right",
      "type-reference",
    ]);
  });

  it("recognises all as a contextual literal", () => {
    expect(compact("values: Color [*] = all")).toContainEqual([
      "all",
      "literal-constant",
    ]);
  });

  it("highlights family members but not their data fields", () => {
    const source = [
      "family Terrain {",
      "  movementCost: Nat = 1",
      "  Plain,",
      "  Forest {",
      "    movementCost = 2",
      "  },",
      "  Water",
      "}",
    ].join("\n");
    expect(compact(source)).toEqual([
      ["family", "declaration-keyword"],
      ["Terrain", "declared-name"],
      ["{", "brace"],
      [":", "punctuation"],
      ["Nat", "builtin-type"],
      ["=", "symbolic-operator"],
      ["1", "exact-number"],
      ["Plain", "family-member"],
      [",", "punctuation"],
      ["Forest", "family-member"],
      ["{", "brace"],
      ["=", "symbolic-operator"],
      ["2", "exact-number"],
      ["}", "brace"],
      [",", "punctuation"],
      ["Water", "family-member"],
      ["}", "brace"],
    ]);
  });

  it("highlights every magnitude in a derived dimension expression", () => {
    const source = [
      "magnitude Acceleration: Num :=",
      "  Length / (Time * Time)",
      "{}",
    ].join("\n");
    expect(compact(source)).toEqual([
      ["magnitude", "declaration-keyword"],
      ["Acceleration", "declared-name"],
      [":", "punctuation"],
      ["Num", "builtin-type"],
      [":=", "symbolic-operator"],
      ["Length", "type-reference"],
      ["/", "symbolic-operator"],
      ["(", "parenthesis"],
      ["Time", "type-reference"],
      ["*", "symbolic-operator"],
      ["Time", "type-reference"],
      [")", "parenthesis"],
      ["{", "brace"],
      ["}", "brace"],
    ]);
  });

  it("highlights complete unit expressions attached to quantities", () => {
    expect(compact("10 m/s + 90 km/h + 3 Mm/ps + 30 people")).toEqual([
      ["10", "exact-number"],
      ["m", "unit"],
      ["/", "unit"],
      ["s", "unit"],
      ["+", "symbolic-operator"],
      ["90", "exact-number"],
      ["km", "unit"],
      ["/", "unit"],
      ["h", "unit"],
      ["+", "symbolic-operator"],
      ["3", "exact-number"],
      ["Mm", "unit"],
      ["/", "unit"],
      ["ps", "unit"],
      ["+", "symbolic-operator"],
      ["30", "exact-number"],
      ["people", "unit"],
    ]);
  });

  it("separates adjacent numbers and qualified units", () => {
    expect(compact("3m + 90km/h + r0.1m + 3 Length.meter")).toEqual([
      ["3", "exact-number"],
      ["m", "unit"],
      ["+", "symbolic-operator"],
      ["90", "exact-number"],
      ["km", "unit"],
      ["/", "unit"],
      ["h", "unit"],
      ["+", "symbolic-operator"],
      ["r0.1", "rumber"],
      ["m", "unit"],
      ["+", "symbolic-operator"],
      ["3", "exact-number"],
      ["Length", "unit"],
      [".", "unit"],
      ["meter", "unit"],
    ]);
  });

  it("does not split identifiers containing digits or confuse ronto", () => {
    const tokens = compact("thing R2D2 {}\nronto");
    expect(tokens).toContainEqual(["R2D2", "declared-name"]);
    expect(tokens.some(([text, category]) => text === "r" && category === "rumber")).toBe(false);
  });

  it("distinguishes compound unit conversion from ordinary arithmetic", () => {
    expect(compact("speed in km/h + 10 * count")).toEqual([
      ["in", "word-operator"],
      ["km", "unit"],
      ["/", "unit"],
      ["h", "unit"],
      ["+", "symbolic-operator"],
      ["10", "exact-number"],
      ["*", "symbolic-operator"],
      ["count", "quantifier-keyword"],
    ]);
  });

  it("distinguishes braces, parentheses and brackets", () => {
    expect(compact("rule R(A) { values[0] }")).toEqual([
      ["rule", "declaration-keyword"],
      ["R", "declared-name"],
      ["(", "parenthesis"],
      [")", "parenthesis"],
      ["{", "brace"],
      ["[", "bracket"],
      ["0", "exact-number"],
      ["]", "bracket"],
      ["}", "brace"],
    ]);
  });

  it("recognises contextual keywords only in their grammar positions", () => {
    expect(compact("abstract thing Place {}\nthing abstract {}")).toContainEqual([
      "abstract",
      "top-level-declaration-modifier",
    ]);
    const secondAbstract = compact("thing abstract {}").find(
      ([text]) => text === "abstract",
    );
    expect(secondAbstract).toEqual(["abstract", "declared-name"]);
  });

  it("keeps an explicitly closed comment separate from following code", () => {
    expect(compact("value # note # + r0.5")).toEqual([
      ["# note #", "comment"],
      ["+", "symbolic-operator"],
      ["r0.5", "rumber"],
    ]);
  });

  it("uses double quotes for text forms and ignores former Char quotes", () => {
    const source = [
      'name = "Ada',
      "description = \"\"\"",
      "  hello",
      '  """',
      'letter: Char = "ñ"',
      "formerLetter = 'ñ'",
    ].join("\n");
    const tokens = compact(source);
    expect(tokens).toContainEqual(['"Ada', "text"]);
    expect(tokens.some(([text, categoryId]) => text.startsWith('"""') && categoryId === "text")).toBe(true);
    expect(tokens).toContainEqual(['"ñ"', "text"]);
    expect(tokens.some(([, categoryId]) => categoryId === "character")).toBe(false);
  });

  it("recognises multiline comments as a single token", () => {
    const comments = tokenizeMud("###\ncomment\n###\nthing World {}").filter(
      (token) => token.categoryId === "comment",
    );
    expect(comments).toHaveLength(1);
    expect(comments[0]?.text).toBe("###\ncomment\n###");
  });
});
