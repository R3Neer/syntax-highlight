import { describe, expect, it } from "vitest";

import { tokenizeAsdl } from "../src/asdl-tokenizer";

describe("tokenizeAsdl", () => {
  it("recognizes the canonical Zephyr and CPython ASDL vocabulary", () => {
    const tokens = tokenizeAsdl(`module Mud {
      expr = Name(identifier id)
           | Binary(expr left, operator op, expr right)
           attributes (source_span span)
    }`);
    const classified = new Map(tokens.map(({ text, categoryId }) => [text, categoryId]));

    expect(classified.get("module")).toBe("asdl-keyword");
    expect(classified.get("Mud")).toBe("module-name");
    expect(classified.get("expr")).toBe("type-reference");
    expect(
      tokens.find(
        ({ text, categoryId }) =>
          text === "expr" && categoryId === "defined-type",
      ),
    ).toBeDefined();
    expect(classified.get("Name")).toBe("constructor");
    expect(classified.get("identifier")).toBe("builtin-type");
    expect(classified.get("attributes")).toBe("asdl-keyword");
    expect(classified.get("id")).toBe("field-name");
  });

  it("recognizes comments and cardinality modifiers", () => {
    expect(
      tokenizeAsdl("-- nodes\nstmt* body, expr? value").map(
        ({ text, categoryId }) => [text, categoryId],
      ),
    ).toEqual([
      ["-- nodes", "comment"],
      ["stmt", "type-reference"],
      ["*", "cardinality"],
      ["body", "type-reference"],
      [",", "separator"],
      ["expr", "type-reference"],
      ["?", "cardinality"],
      ["value", "type-reference"],
    ]);
  });
});
