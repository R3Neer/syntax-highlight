import { describe, expect, it } from "vitest";

import { findMudCodeBlocks } from "../src/blocks";

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
