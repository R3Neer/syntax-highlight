import { describe, expect, it } from "vitest";

import { tokenizeMud } from "../src/tokenizer";

function compact(source: string): Array<[string, string]> {
  return tokenizeMud(source).map((token) => [token.text, token.kind]);
}

describe("tokenizeMud", () => {
  it("classifies declarations, reserved words, types and properties", () => {
    expect(compact("ordered family Color { value: Character }")).toEqual([
      ["ordered", "keyword"],
      ["family", "keyword"],
      ["Color", "declaration"],
      ["{", "punctuation"],
      ["value", "property"],
      [":", "punctuation"],
      ["Character", "builtin"],
      ["}", "punctuation"],
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
