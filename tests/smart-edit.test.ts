import { describe, expect, it } from "vitest";

import {
  formatMudHorizontalSpacing,
  retroactiveWrap,
  type EditingContext,
} from "../src/smart-edit";

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

describe("MUD horizontal spacing", () => {
  it("normalizes declarations, blocks and terminators", () => {
    expect(formatMudHorizontalSpacing("thing  A{")).toBe("thing A {");
    expect(formatMudHorizontalSpacing('mut  title :Text= "A" ;')).toBe(
      'mut title: Text = "A";',
    );
    expect(formatMudHorizontalSpacing("{  value  }")).toBe("{ value }");
  });

  it("normalizes collections, calls and ordinary operators", () => {
    expect(formatMudHorizontalSpacing("values=[ 1 ,2,3 ]")).toBe(
      "values = [1, 2, 3]",
    );
    expect(formatMudHorizontalSpacing("call( a,b )")).toBe("call(a, b)");
    expect(formatMudHorizontalSpacing("a+b* c")).toBe("a + b * c");
  });

  it("keeps intervals, point literals and units compact", () => {
    expect(formatMudHorizontalSpacing("range = [ 1 .. 4 )")).toBe(
      "range = [1..4)",
    );
    expect(formatMudHorizontalSpacing("at 12 : 30")).toBe("at 12:30");
    expect(formatMudHorizontalSpacing("speed = 10 m / s")).toBe(
      "speed = 10 m/s",
    );
    expect(formatMudHorizontalSpacing("distance=3m")).toBe(
      "distance = 3 m",
    );
    expect(formatMudHorizontalSpacing("speed=90km / h")).toBe(
      "speed = 90 km/h",
    );
    expect(formatMudHorizontalSpacing("error=r0.1m")).toBe(
      "error = r0.1 m",
    );
  });

  it("keeps canonical union types free of inserted parentheses", () => {
    expect(formatMudHorizontalSpacing("values:Nat in 0..10|Int in -10..-1[1..*]")).toBe(
      "values: Nat in 0..10 | Int in -10..-1 [1..*]",
    );
    expect(
      formatMudHorizontalSpacing(
        "values:((Nat in 0..10)|(Int in -10..-1))[1..*]",
      ),
    ).toBe("values: Nat in 0..10 | Int in -10..-1 [1..*]");
  });

  it("does not rewrite string or comment contents", () => {
    expect(formatMudHorizontalSpacing('name = "a  +  b" #comment  x')).toBe(
      'name = "a  +  b" # comment  x',
    );
  });
});
