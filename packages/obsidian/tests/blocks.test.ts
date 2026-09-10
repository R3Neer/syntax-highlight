import { describe, expect, it } from "vitest";

import {
  findCodeBlocks,
  findMudCodeBlocks,
  isCodeBlockContentPosition,
  isSafeMarkdownProcessorLanguage,
  mapCodeBlockRange,
} from "../src/blocks";

describe("isSafeMarkdownProcessorLanguage", () => {
  it("rejects aliases that Obsidian cannot embed in a CSS selector", () => {
    expect(isSafeMarkdownProcessorLanguage("cpp")).toBe(true);
    expect(isSafeMarkdownProcessorLanguage("c++")).toBe(false);
  });
});

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
    const bodies = findMudCodeBlocks(source).map(({ body }) => body.trim());
    expect(bodies).toEqual(["thing World {}", "rule Ready { true }"]);
  });

  it("extends an unclosed MUD fence to the end of the document", () => {
    const source = "```mud\nthing World {}";
    const [block] = findMudCodeBlocks(source);
    expect(block).toBeDefined();
    expect(block?.body).toBe("thing World {}");
  });
});

describe("findCodeBlocks", () => {
  it("resolves common language aliases without including fence lines", () => {
    const source = "```csharp\nvar value = 1;\n```\n";
    const [block] = findCodeBlocks(source, new Set(["cs", "csharp"]));
    expect(block?.language).toBe("csharp");
    expect(source.slice(block?.languageFrom, block?.languageTo)).toBe("csharp");
    expect(source.slice(block?.from, block?.to)).toBe("var value = 1;\n");
    expect(block?.body).toBe("var value = 1;\n");
    expect(block?.quoteDepth).toBe(0);
  });

  it("recognizes fences inside blockquotes and Obsidian callouts", () => {
    const source = [
      "> [!note]",
      "> texto previo",
      "> ```powershell title=demo",
      "> $items = Get-ChildItem",
      "> Write-Host $items",
      "> ```",
      "> texto posterior",
    ].join("\n");

    const [block] = findCodeBlocks(source, new Set(["powershell"]));
    expect(block).toBeDefined();
    expect(block?.quoteDepth).toBe(1);
    expect(source.slice(block?.languageFrom, block?.languageTo)).toBe("powershell");
    expect(block?.body).toBe("$items = Get-ChildItem\nWrite-Host $items\n");
    expect(block?.bodyLines.map(({ sourceFrom, sourceTo }) =>
      source.slice(sourceFrom, sourceTo)
    )).toEqual(["$items = Get-ChildItem", "Write-Host $items"]);
    expect(source.slice(block!.from, block!.to)).toContain("> $items");
  });

  it("supports nested blockquotes while stripping exactly the container depth", () => {
    const source = [
      "> > ~~~text-right-justified",
      "> > alpha",
      "> > > literal deeper quote marker",
      "> > ~~~",
    ].join("\n");

    const [block] = findCodeBlocks(source, new Set(["text-right-justified"]));
    expect(block?.quoteDepth).toBe(2);
    expect(block?.body).toBe("alpha\n> literal deeper quote marker\n");
  });

  it("maps logical token offsets back to physical source without quote markers", () => {
    const source = [
      "> ```bash",
      "> echo one",
      "> echo two",
      "> ```",
    ].join("\n");
    const [block] = findCodeBlocks(source, new Set(["bash"]));
    expect(block).toBeDefined();

    const logicalFrom = block!.body.indexOf("one");
    const logicalTo = block!.body.indexOf("two") + "two".length;
    const mapped = mapCodeBlockRange(block!, logicalFrom, logicalTo);
    expect(mapped.map(({ from, to }) => source.slice(from, to))).toEqual([
      "one",
      "echo two",
    ]);
    expect(mapped.every(({ from }) => source[from] !== ">" )).toBe(true);
    expect(isCodeBlockContentPosition(block!, block!.bodyLines[0]!.sourceFrom)).toBe(true);
    expect(isCodeBlockContentPosition(block!, block!.bodyLines[0]!.lineFrom)).toBe(false);
  });

  it("does not surface target-looking fences nested in unrelated fenced blocks", () => {
    const source = [
      "````example",
      "```text",
      "documented, not a real top-level Text block",
      "```",
      "> ```text",
      "> quoted literal content inside the outer fence",
      "> ```",
      "````",
      "~~~~",
      "```text",
      "also only literal content",
      "```",
      "~~~~",
      "```text",
      "real target",
      "```",
    ].join("\n");

    const blocks = findCodeBlocks(source, new Set(["text"]));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.body.trim()).toBe("real target");
  });

  it("treats an unclosed unrelated fence as containing the rest of the document", () => {
    const source = [
      "```example",
      "literal documentation",
      "```text",
      "must not be rewritten",
      "```",
    ].join("\n");

    expect(findCodeBlocks(source, new Set(["text"]))).toEqual([]);
  });

  it("ends an unclosed quoted fence when its blockquote container ends", () => {
    const source = [
      "> ```text",
      "> quoted body",
      "outside quote",
      "```text",
      "real top-level",
      "```",
    ].join("\n");

    const blocks = findCodeBlocks(source, new Set(["text"]));
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.body).toBe("quoted body\n");
    expect(blocks[1]?.body).toBe("real top-level\n");
  });
});
