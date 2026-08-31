import { describe, expect, it } from "vitest";
import { format, highlight } from "@r3nner/syntax-highlight-core";
import {
  DEFAULT_HIGHLIGHT_CONFIG,
  createMudAdapter,
  formatMudHorizontalSpacing,
} from "../src";

const adapter = createMudAdapter();

function category(source: string, text: string): string | undefined {
  const document = highlight(source, adapter);
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

  it("distinguishes semantic keyword families without host-specific rules", () => {
    expect(category("family Terrain {}", "family")).toBe("declaration-keyword");
    expect(category("mut cost: Nat = 1", "mut")).toBe("declaration-modifier");
    expect(category("if ready then destroy target", "if")).toBe("control-flow");
    expect(category("if ready then destroy target", "then")).toBe("control-flow");
    expect(category("if ready then destroy target", "destroy")).toBe("effect-keyword");
    expect(category("exists items", "exists")).toBe("quantifier-keyword");
    expect(category("for each item in items: destroy item", "for")).toBe("quantifier-keyword");
    expect(category("for each item in items: destroy item", "each")).toBe("quantifier-keyword");
    expect(category("action Move for actor: Thing {}", "for")).toBe("clause-keyword");
    expect(category("abstract thing Place {}", "abstract")).toBe("declaration-modifier");
    expect(category("always rule Stable { true }", "always")).toBe("declaration-modifier");
    expect(category("root unit meter", "unit")).toBe("declaration-keyword");

    for (const word of DEFAULT_HIGHLIGHT_CONFIG.words["reserved-word"] ?? []) {
      expect(category(word, word), word).not.toBe("reserved-word");
    }
  });

  it("highlights callable receiver tuple types", () => {
    const document = highlight("(Player, Room).action(Text)", adapter);
    const types = document.spans
      .filter(({ categoryId }) => categoryId === "type-reference")
      .map(({ from, to }) => document.source.slice(from, to));
    expect(types).toEqual(expect.arrayContaining(["Player", "Room"]));
  });

  it("formats idempotently and returns reproducible edits", () => {
    const once = format("value  |=  other\nnext ~ format", adapter);
    expect(once.formatted).toBe("value |= other\nnext~format");
    expect(format(once.formatted, adapter).edits).toEqual([]);
  });
});
