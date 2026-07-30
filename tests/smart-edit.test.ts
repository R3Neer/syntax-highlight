import { describe, expect, it } from "vitest";

import { retroactiveWrap, type EditingContext } from "../src/smart-edit";

function context(source: string): EditingContext {
  return { from: 0, to: source.length, languageId: "mud" };
}

function apply(source: string, position: number, typed: string): string | undefined {
  const proposal = retroactiveWrap(
    source,
    position,
    typed,
    context(source),
  );
  return proposal === undefined
    ? undefined
    : source.slice(0, proposal.from) +
        proposal.insert +
        source.slice(proposal.to);
}

describe("MUD retroactive wrapping", () => {
  it("completes collections from either edge", () => {
    expect(apply("1, 2, 3", 0, "[")).toBe("[1, 2, 3]");
    expect(apply("1, 2, 3", 7, "]")).toBe("[1, 2, 3]");
  });

  it("preserves multiline collection layout", () => {
    const source = "1,\n  2,\n  3";
    expect(apply(source, 0, "[")).toBe(`[${source}]`);
    expect(apply(source, source.length, "]")).toBe(`[${source}]`);
  });

  it("infers a closed opposite interval edge", () => {
    expect(apply("1..4", 0, "[")).toBe("[1..4]");
    expect(apply("1..4", 0, "(")).toBe("(1..4]");
    expect(apply("1..4", 4, "]")).toBe("[1..4]");
    expect(apply("1..4", 4, ")")).toBe("[1..4)");
  });

  it("supports nested bounds and unbounded markers", () => {
    expect(apply("min(a, b)..*", "min(a, b)..*".length, ")")).toBe(
      "[min(a, b)..*)",
    );
  });

  it("wraps only the right-hand expression after an assignment", () => {
    const source = "values = 1, 2, 3";
    expect(apply(source, source.length, "]")).toBe("values = [1, 2, 3]");
  });

  it("rejects ambiguous or already delimited candidates", () => {
    expect(apply("call(1, 2, 3)", "call(1, 2, 3)".length, "]")).toBeUndefined();
    expect(apply("for a: A, b: B", "for a: A, b: B".length, "]")).toBeUndefined();
    expect(apply("[1, 2, 3]", "[1, 2, 3]".length, "]")).toBeUndefined();
    expect(apply('"1,2,3"', '"1,2,3"'.length, "]")).toBeUndefined();
    expect(apply("# 1,2,3", "# 1,2,3".length, "]")).toBeUndefined();
  });

  it("is disabled outside MUD", () => {
    const source = "1,2,3";
    expect(
      retroactiveWrap(source, source.length, "]", {
        from: 0,
        to: source.length,
        languageId: "javascript",
      }),
    ).toBeUndefined();
  });
});
