import { describe, expect, it } from "vitest";

import defaultConfigData from "../mud-highlight.json";
import { parseHighlightConfig } from "../src/config";
import { tokenizeMud } from "../src/tokenizer";

describe("mud-highlight.json", () => {
  it("is a valid configuration", () => {
    expect(parseHighlightConfig(defaultConfigData).schemaVersion).toBe(1);
  });

  it("allows words and symbols to move between categories", () => {
    const modified = structuredClone(defaultConfigData);
    modified.words.keyword.push("custom");
    modified.symbols.brace = ["@", "}"];
    const config = parseHighlightConfig(modified);

    expect(tokenizeMud("custom @", config).map(({ text, kind }) => [text, kind])).toEqual([
      ["custom", "keyword"],
      ["@", "brace"],
    ]);
  });

  it("rejects ambiguous assignments", () => {
    const modified = structuredClone(defaultConfigData);
    modified.words.constant.push("thing");
    expect(() => parseHighlightConfig(modified)).toThrow(/aparece en words/);
  });

  it("rejects symbols that the lexical scanner reserves for other tokens", () => {
    const modified = structuredClone(defaultConfigData);
    modified.symbols.operator.push("#");
    expect(() => parseHighlightConfig(modified)).toThrow(/comillas ni #/);
  });
});
