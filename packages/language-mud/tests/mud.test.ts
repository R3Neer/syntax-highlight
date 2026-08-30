import { describe, expect, it } from "vitest";
import { format, highlight } from "@r3neer/syntax-highlight-core";
import {
  DEFAULT_HIGHLIGHT_CONFIG,
  createMudAdapter,
  formatMudHorizontalSpacing,
} from "../src";

function category(source: string, text: string): string | undefined {
  const document = highlight(source, createMudAdapter());
  const span = document.spans.find((entry) => source.slice(entry.from, entry.to) === text);
  return span?.categoryId;
}

describe("MUD language pack", () => {
  it("derives current compact and compound operators from the lexical grammar", () => {
    expect(DEFAULT_HIGHLIGHT_CONFIG.symbols["symbolic-operator"]).toEqual(
      expect.arrayContaining(["-->", "--=", "--", "|=", "&=", "^=", "~"]),
    );
    for (const operator of ["-->", "--=", "--", "|=", "&=", "^="]) {
      expect(formatMudHorizontalSpacing(`left ${operator} right`)).toBe(
        `left ${operator} right`,
      );
    }
    expect(formatMudHorizontalSpacing("value ~ format")).toBe("value~format");
  });

  it("highlights indirect metadata and point-domain cycle", () => {
    expect(category("~format = value", "format")).toBe("contextual-word");
    expect(category("[0..10] cycle", "cycle")).toBe("contextual-word");
  });

  it("highlights callable receiver tuple types", () => {
    const document = highlight("(Player, Room).action(Text)", createMudAdapter());
    const types = document.spans
      .filter(({ categoryId }) => categoryId === "type-reference")
      .map(({ from, to }) => document.source.slice(from, to));
    expect(types).toEqual(expect.arrayContaining(["Player", "Room"]));
  });

  it("formats idempotently and returns reproducible edits", () => {
    const once = format("value  |=  other\nnext ~ format", createMudAdapter());
    expect(once.formatted).toBe("value |= other\nnext~format");
    expect(format(once.formatted, createMudAdapter()).edits).toEqual([]);
  });
});
