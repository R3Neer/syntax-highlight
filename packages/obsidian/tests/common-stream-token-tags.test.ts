import type { StreamParser } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { describe, expect, it } from "vitest";

import {
  effectiveCommonStreamParser,
  type CommonLanguage,
  type CommonStreamEngine,
} from "../src/common-languages";
import { commonSemanticRanges } from "../src/common-semantic-ranges";

function languageWithEngineTag(): CommonLanguage {
  const parser: StreamParser<true> = {
    startState: () => true,
    token(stream) {
      stream.next();
      return "custom-role";
    },
  };
  const engine: CommonStreamEngine = {
    kind: "stream",
    parser: parser as StreamParser<unknown>,
    startState: () => true,
    tokenTags: { "custom-role": tags.keyword },
  };
  return {
    id: "engine-token-tag",
    name: "Engine token tag",
    fences: ["engine-token-tag"],
    extensions: [],
    engine,
  };
}

describe("stream engine tokenTags", () => {
  it("fills styles absent from parser.tokenTable for manual and native paths", () => {
    const language = languageWithEngineTag();
    const engine = language.engine as CommonStreamEngine;
    const ranges = commonSemanticRanges(language, "x");
    const effective = effectiveCommonStreamParser(engine);
    const nativeStyle = effective.token({
      next: () => "x",
    } as never, true);

    expect(ranges).toEqual([
      { from: 0, to: 1, classes: "syntax-common-keyword" },
    ]);
    expect(nativeStyle).toMatch(/^syntaxStreamToken\d+$/);
    expect(effective.tokenTable?.[nativeStyle!]).toBe(tags.keyword);
  });
});
