import { describe, expect, it } from "vitest";
import { findLiteralContexts, parseEbnf } from "../src";

describe("nullable transitive EBNF contexts", () => {
  it("crosses indirect productions", () => {
    const grammar = parseEbnf(
      'start ::= "~" , metadata-name ;\n' +
      'metadata-name ::= contextual ;\n' +
      'contextual ::= "format" ;',
    );
    expect(findLiteralContexts(grammar, new Set(["format"]))).toContainEqual({
      value: "format",
      previous: new Set(["~"]),
      next: new Set(),
    });
  });

  it("crosses nullable neighbors", () => {
    const grammar = parseEbnf(
      'start ::= [ "~" ] , contextual , "=" ;\n' +
      'contextual ::= "format" ;',
    );
    const context = findLiteralContexts(grammar, new Set(["format"]))[0];
    expect(context?.previous).toEqual(new Set(["~"]));
    expect(context?.next).toEqual(new Set(["="]));
  });
});
