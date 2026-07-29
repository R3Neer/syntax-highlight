import { describe, expect, it } from "vitest";

import { tokenizeAsdl } from "../src/asdl-tokenizer";

describe("tokenizeAsdl", () => {
  it("recognizes the canonical Zephyr and CPython ASDL vocabulary", () => {
    const tokens = tokenizeAsdl(`module Mud {
      expr = Name(identifier id)
           | Binary(expr left, operator op, expr right)
           attributes (source_span span)
    }`);
    const classified = new Map(tokens.map(({ text, kind }) => [text, kind]));

    expect(classified.get("module")).toBe("keyword");
    expect(classified.get("Mud")).toBe("declaration");
    expect(classified.get("expr")).toBe("reference");
    expect(
      tokens.find(({ text, kind }) => text === "expr" && kind === "definition"),
    ).toBeDefined();
    expect(classified.get("Name")).toBe("declaration");
    expect(classified.get("identifier")).toBe("builtin");
    expect(classified.get("attributes")).toBe("keyword");
  });

  it("recognizes comments and cardinality modifiers", () => {
    expect(
      tokenizeAsdl("-- nodes\nstmt* body, expr? value").map(
        ({ text, kind }) => [text, kind],
      ),
    ).toEqual([
      ["-- nodes", "comment"],
      ["stmt", "reference"],
      ["*", "operator"],
      ["body", "reference"],
      [",", "punctuation"],
      ["expr", "reference"],
      ["?", "operator"],
      ["value", "reference"],
    ]);
  });
});
