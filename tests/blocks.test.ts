import { describe, expect, it } from "vitest";

import { findCodeBlocks, findMudCodeBlocks } from "../src/blocks";

describe("findMudCodeBlocks", () => {
  it("finds backtick and tilde MUD fences but ignores other languages", () => {
    const source = [
      "before",
      "```mud",
      "thing World {}",
      "```",
      "```js",
      "const x = 1",
      "```",
      "~~~MUD title",
      "rule Ready { true }",
      "~~~~",
    ].join("\n");
    const bodies = findMudCodeBlocks(source).map(({ from, to }) =>
      source.slice(from, to).trim(),
    );
    expect(bodies).toEqual(["thing World {}", "rule Ready { true }"]);
  });

  it("extends an unclosed MUD fence to the end of the document", () => {
    const source = "```mud\nthing World {}";
    const [block] = findMudCodeBlocks(source);
    expect(block).toBeDefined();
    expect(source.slice(block?.from, block?.to)).toBe("thing World {}");
  });
});

describe("findCodeBlocks", () => {
  it("resolves common language aliases without including fence lines", () => {
    const source = "```csharp\nvar value = 1;\n```\n";
    const [block] = findCodeBlocks(source, new Set(["cs", "csharp"]));
    expect(block?.language).toBe("csharp");
    expect(source.slice(block?.from, block?.to)).toBe("var value = 1;\n");
  });
});
