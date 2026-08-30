import { describe, expect, it } from "vitest";
import {
  applyEdits,
  highlight,
  minimalEdit,
  validateLanguagePack,
  type LanguageAdapter,
} from "../src";

const pack = validateLanguagePack({
  schemaVersion: 2,
  id: "demo",
  version: "1.0.0",
  name: "Demo",
  aliases: [],
  fences: ["demo"],
  extensions: ["demo"],
  categories: [{
    id: "keyword",
    name: "Keyword",
    description: "A keyword.",
    group: "words",
    role: "keyword",
  }],
});

describe("host-neutral runtime", () => {
  it("sorts and validates UTF-16 spans", () => {
    const adapter: LanguageAdapter = {
      pack,
      tokenize: () => [
        { from: 3, to: 4, categoryId: "keyword" },
        { from: 0, to: 2, categoryId: "keyword" },
      ],
    };
    expect(highlight("😀 x", adapter).spans).toEqual([
      { from: 0, to: 2, categoryId: "keyword" },
      { from: 3, to: 4, categoryId: "keyword" },
    ]);
  });

  it("creates deterministic minimal edits", () => {
    const edits = minimalEdit("a  b", "a b");
    expect(applyEdits("a  b", edits)).toBe("a b");
  });

  it("rejects overlapping spans", () => {
    expect(() => highlight("abc", {
      pack,
      tokenize: () => [
        { from: 0, to: 2, categoryId: "keyword" },
        { from: 1, to: 3, categoryId: "keyword" },
      ],
    })).toThrow(/overlapping/);
  });
});
