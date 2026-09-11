import type { StreamParser } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { describe, expect, it, vi } from "vitest";

import {
  COMMON_SEMANTIC_HIGHLIGHTER,
  commonLanguageByFence,
  commonLanguageSupport,
  commonStreamTagsForStyle,
  effectiveCommonStreamParser,
  rewriteCommonStreamStyle,
  type CommonLanguage,
  type CommonStreamEngine,
  type CommonStreamTokenTable,
} from "../src/common-languages";
import { commonSemanticRanges } from "../src/common-semantic-ranges";

function streamLanguage<State>(
  parser: StreamParser<State>,
  tokenTags: CommonStreamTokenTable = {},
): CommonLanguage {
  const startState = parser.startState?.bind(parser);
  const engine: CommonStreamEngine = {
    kind: "stream",
    parser: parser as unknown as StreamParser<unknown>,
    startState: (indentUnit) => startState?.(indentUnit) ?? true,
    tokenTags,
  };
  return {
    id: "test-stream",
    name: "Test stream",
    fences: ["test-stream"],
    extensions: [],
    engine,
  };
}

function classesFor(language: CommonLanguage, source: string): string[] {
  return commonSemanticRanges(language, source).map(({ classes }) => classes);
}

function expectRole(classes: readonly string[], role: string): void {
  expect(classes.some((value) => value.split(/\s+/).includes(role))).toBe(true);
}

describe("common semantic engine", () => {
  it("keeps tree, stream and plain languages in one plugin taxonomy", () => {
    const bash = commonLanguageByFence("bash")!;
    const text = commonLanguageByFence("text")!;
    const powershell = commonLanguageByFence("powershell")!;

    const bashClasses = classesFor(bash, 'echo "hello"');
    const textRanges = commonSemanticRanges(text, "alpha\nbeta");
    const psClasses = classesFor(powershell, "$foo = 42");

    expect(bashClasses.length).toBeGreaterThan(0);
    expect(bashClasses.every((value) => value.includes("syntax-common-"))).toBe(true);
    expect(textRanges).toEqual([
      { from: 0, to: 5, classes: "syntax-common-plain" },
      { from: 6, to: 10, classes: "syntax-common-plain" },
    ]);
    expectRole(psClasses, "syntax-common-variable");
    expectRole(psClasses, "syntax-common-number");
  });

  it("classifies the PowerShell legacy stream vocabulary directly", () => {
    const powershell = commonLanguageByFence("powershell")!;
    const source = [
      "if ($foo -eq 42) {",
      '  Write-Host "hello"',
      "  # comment",
      "  §",
      "}",
    ].join("\n");
    const classes = classesFor(powershell, source);

    for (const role of [
      "syntax-common-keyword",
      "syntax-common-variable",
      "syntax-common-operator",
      "syntax-common-number",
      "syntax-common-punctuation",
      "syntax-common-callable",
      "syntax-common-string",
      "syntax-common-comment",
      "syntax-common-invalid",
    ]) {
      expectRole(classes, role);
    }
    expect(classes.some((value) => /(?:^|\s)(?:cm-|token\s)/.test(value))).toBe(false);
  });

  it("gives parser.tokenTable precedence over engine tokenTags", () => {
    const parser: StreamParser<true> = {
      startState: () => true,
      tokenTable: { custom: tags.string },
      token(stream) {
        stream.next();
        return "custom";
      },
    };
    const language = streamLanguage(parser, { custom: tags.number });
    const classes = classesFor(language, "x");

    expectRole(classes, "syntax-common-string");
    expect(classes.some((value) => value.includes("syntax-common-number"))).toBe(false);
  });

  it("resolves public modifiers, multiple styles and unknown words locally", () => {
    const parser: StreamParser<{ index: number }> = {
      startState: () => ({ index: 0 }),
      token(stream, state) {
        stream.next();
        state.index += 1;
        if (state.index === 1) return "unknown-style";
        return "variableName.standard number";
      },
    };
    const language = streamLanguage(parser);
    const ranges = commonSemanticRanges(language, "ab");

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({ from: 1, to: 2 });
    expect(ranges[0]!.classes).toContain("syntax-common-callable");
    expect(ranges[0]!.classes).toContain("syntax-common-number");
  });

  it("rewrites explicit legacy-looking styles to deterministic synthetic names", () => {
    const parser: StreamParser<true> = {
      startState: () => true,
      tokenTable: { variable: tags.string },
      token(stream) {
        stream.next();
        return "variable";
      },
    };
    const language = streamLanguage(parser, { variable: tags.number });
    const engine = language.engine as CommonStreamEngine;
    const rewritten = rewriteCommonStreamStyle(engine, "variable");
    const effective = effectiveCommonStreamParser(engine);

    expect(rewritten).toMatch(/^syntaxStreamToken\d+$/);
    expect(rewritten).not.toBe("variable");
    expect(Object.keys(effective.tokenTable ?? {})).toContain(rewritten!);
    expect(commonStreamTagsForStyle(engine, "variable")).toEqual([tags.string]);
    expect(classesFor(language, "x")).toEqual(["syntax-common-string"]);
  });

  it("preserves the public StreamParser contract in the effective parser", () => {
    const blankLine = vi.fn();
    const copyState = vi.fn((state: { value: number }) => ({ ...state }));
    const indent = vi.fn(() => 3);
    const parser: StreamParser<{ value: number }> = {
      name: "contract-test",
      startState: () => ({ value: 1 }),
      token(stream) {
        stream.next();
        return "number";
      },
      blankLine,
      copyState,
      indent,
      languageData: { commentTokens: { line: "#" } },
      mergeTokens: false,
    };
    const language = streamLanguage(parser);
    const effective = effectiveCommonStreamParser(language.engine as CommonStreamEngine);

    expect(effective.name).toBe("contract-test");
    expect(effective.startState?.(2)).toEqual({ value: 1 });
    effective.blankLine?.({ value: 1 }, 2);
    expect(blankLine).toHaveBeenCalledOnce();
    expect(effective.copyState?.({ value: 2 })).toEqual({ value: 2 });
    expect(copyState).toHaveBeenCalledOnce();
    expect(effective.indent?.({ value: 1 }, "", {} as never)).toBe(3);
    expect(indent).toHaveBeenCalledOnce();
    expect(effective.languageData).toEqual({ commentTokens: { line: "#" } });
    expect(effective.mergeTokens).toBe(false);
  });

  it("supports a parser without startState through the normalized engine state", () => {
    const parser: StreamParser<unknown> = {
      token(stream) {
        stream.next();
        return "number";
      },
    };
    const language = streamLanguage(parser);

    expect((language.engine as CommonStreamEngine).startState(2)).toBe(true);
    expect(classesFor(language, "1")).toEqual(["syntax-common-number"]);
    expect(commonLanguageSupport(language)?.language).toBeDefined();
  });
});

describe("direct stream scanner", () => {
  it("keeps mutable state across physical lines", () => {
    const parser: StreamParser<{ opened: boolean }> = {
      startState: () => ({ opened: false }),
      token(stream, state) {
        const line = stream.string;
        stream.skipToEnd();
        if (line === "open") state.opened = true;
        return state.opened ? "string" : "number";
      },
    };
    const ranges = commonSemanticRanges(streamLanguage(parser), "open\nstill-open");

    expect(ranges.map(({ from, to, classes }) => ({ from, to, classes }))).toEqual([
      { from: 0, to: 4, classes: "syntax-common-string" },
      { from: 5, to: 15, classes: "syntax-common-string" },
    ]);
  });

  it("preserves LF and CRLF offsets and the unterminated last line", () => {
    const parser: StreamParser<true> = {
      startState: () => true,
      token(stream) {
        stream.skipToEnd();
        return "number";
      },
    };
    const ranges = commonSemanticRanges(streamLanguage(parser), "a\r\nbb\nc");

    expect(ranges.map(({ from, to }) => [from, to])).toEqual([
      [0, 1],
      [3, 5],
      [6, 7],
    ]);
  });

  it("calls blankLine only for physical empty lines, not empty source or final virtual lines", () => {
    const blankLine = vi.fn();
    const parser: StreamParser<true> = {
      startState: () => true,
      blankLine,
      token(stream) {
        stream.skipToEnd();
        return "number";
      },
    };
    const language = streamLanguage(parser);

    commonSemanticRanges(language, "a\n\nb");
    expect(blankLine).toHaveBeenCalledTimes(1);
    blankLine.mockClear();

    commonSemanticRanges(language, "a\n");
    commonSemanticRanges(language, "");
    expect(blankLine).not.toHaveBeenCalled();
  });

  it("allows zero-length state transitions before an advancing token", () => {
    const parser: StreamParser<{ primed: boolean }> = {
      startState: () => ({ primed: false }),
      token(stream, state) {
        if (!state.primed) {
          state.primed = true;
          return null;
        }
        stream.next();
        return "number";
      },
    };

    expect(classesFor(streamLanguage(parser), "x")).toEqual(["syntax-common-number"]);
  });

  it("stops a parser that never advances instead of looping forever", () => {
    const token = vi.fn(() => null);
    const parser: StreamParser<true> = {
      startState: () => true,
      token,
    };

    expect(commonSemanticRanges(streamLanguage(parser), "x")).toEqual([]);
    expect(token).toHaveBeenCalledTimes(10);
  });

  it("uses the same semantic highlighter object for direct styles", () => {
    expect(COMMON_SEMANTIC_HIGHLIGHTER.style([tags.number])).toBe(
      "syntax-common-number",
    );
    expect(COMMON_SEMANTIC_HIGHLIGHTER.style([tags.invalid])).toBe(
      "syntax-common-invalid",
    );
  });
});
