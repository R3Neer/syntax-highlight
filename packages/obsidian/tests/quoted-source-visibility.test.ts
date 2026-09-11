import { describe, expect, it } from "vitest";

import {
  buildEditorBlockModel,
  lineSemanticIsMaterialized,
  type EditorLineSemantic,
} from "../src/editor-block-model";
import { LanguageRegistry } from "../src/languages";
import { DEFAULT_SETTINGS } from "../src/settings";

function line(
  from: number,
  to: number,
  visibilityFrom: number,
  visibilityTo: number,
): EditorLineSemantic {
  return {
    from,
    to,
    visibilityFrom,
    visibilityTo,
    classes: ["syntax-editor-code-source"],
  };
}

function registry(): LanguageRegistry {
  return new LanguageRegistry(
    structuredClone(DEFAULT_SETTINGS),
    () => Promise.resolve(""),
  );
}

describe("quoted source line materialization", () => {
  it("requires the physical line to intersect the viewport", () => {
    expect(
      lineSemanticIsMaterialized(
        line(10, 20, 12, 20),
        { from: 21, to: 40 },
        [{ from: 12, to: 20 }],
      ),
    ).toBe(false);
  });

  it("does not require the physical line start to be visible", () => {
    expect(
      lineSemanticIsMaterialized(
        line(10, 20, 12, 20),
        { from: 0, to: 40 },
        [{ from: 12, to: 20 }],
      ),
    ).toBe(true);
  });

  it("does not treat a non-empty visibility probe that only touches a range boundary as visible", () => {
    expect(
      lineSemanticIsMaterialized(
        line(10, 20, 10, 20),
        { from: 0, to: 40 },
        [{ from: 20, to: 30 }],
      ),
    ).toBe(false);
  });

  it("supports a zero-length logical visibility probe inside a visible range", () => {
    expect(
      lineSemanticIsMaterialized(
        line(10, 12, 12, 12),
        { from: 0, to: 40 },
        [{ from: 12, to: 30 }],
      ),
    ).toBe(true);
  });

  it("rejects a zero-length visibility probe outside visible ranges", () => {
    expect(
      lineSemanticIsMaterialized(
        line(10, 12, 12, 12),
        { from: 0, to: 40 },
        [{ from: 13, to: 30 }],
      ),
    ).toBe(false);
  });

  it("keeps quoted surface and presentation on one coherent body-line semantic", () => {
    const source = [
      "> [!task] Text",
      "> ```text-center-justified",
      "> alpha beta gamma",
      "> ```",
    ].join("\n");
    const model = buildEditorBlockModel(source, registry(), true);
    const resolved = model.blocks[0]!;
    const body = resolved.block.bodyLines[0]!;
    const semantics = resolved.lineSemantics.filter(
      ({ from }) => from === body.lineFrom,
    );

    expect(semantics).toHaveLength(1);
    expect(semantics[0]).toMatchObject({
      from: body.lineFrom,
      to: body.lineTo,
      visibilityFrom: body.sourceFrom,
      visibilityTo: body.sourceTo,
    });
    expect(semantics[0]!.classes).toEqual(expect.arrayContaining([
      "syntax-editor-code-source",
      "syntax-editor-code-source-body",
      "syntax-presentational",
      "syntax-presentation-align-center",
      "syntax-presentation-flow-justified",
    ]));
  });
});
