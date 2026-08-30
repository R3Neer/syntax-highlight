import { describe, expect, it } from "vitest";

import { tokenizeJson } from "../src/json-editor";

describe("JSON descriptor highlighting", () => {
  it("distinguishes keys, values, numbers, literals and punctuation", () => {
    const tokens = tokenizeJson(
      '{"name":"MUD","version":2,"enabled":true,"value":null}',
    ).map(({ kind }) => kind);

    expect(tokens).toContain("key");
    expect(tokens).toContain("string");
    expect(tokens).toContain("number");
    expect(tokens).toContain("literal");
    expect(tokens).toContain("punctuation");
  });
});
