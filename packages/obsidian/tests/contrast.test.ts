import { describe, expect, it } from "vitest";

import {
  MINIMUM_TEXT_CONTRAST,
  contrastRatio,
  ensureContrast,
  parseCssColor,
  toCssColor,
} from "../src/contrast";

function color(value: string) {
  const parsed = parseCssColor(value);
  if (parsed === undefined) throw new Error(`Could not parse ${value}`);
  return parsed;
}

describe("contrast normalization", () => {
  it("parses common computed CSS color serializations", () => {
    expect(parseCssColor("#fff")).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(parseCssColor("rgb(255, 128, 0)")).toEqual({
      r: 1,
      g: 128 / 255,
      b: 0,
      a: 1,
    });
    expect(parseCssColor("rgba(255, 128, 0, 0.5)")?.a).toBe(0.5);
    expect(parseCssColor("rgb(100% 50% 0% / 25%)")?.a).toBe(0.25);
  });

  it("uses the WCAG relative-luminance contrast ratio", () => {
    expect(contrastRatio(color("#000000"), color("#ffffff"))).toBeCloseTo(21, 6);
  });

  it("leaves an already legible theme color untouched", () => {
    const foreground = color("#222222");
    const background = color("#f5f5f5");
    const result = ensureContrast(foreground, background);

    expect(result.changed).toBe(false);
    expect(result.adjusted).toEqual(foreground);
    expect(result.after).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
  });

  it("changes only the foreground and reaches AA on a light background", () => {
    const foreground = color("#e5c07b");
    const background = color("#ddd8c7");
    const originalBackground = structuredClone(background);
    const result = ensureContrast(foreground, background);

    expect(result.before).toBeLessThan(MINIMUM_TEXT_CONTRAST);
    expect(result.changed).toBe(true);
    expect(result.after).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST - 0.001);
    expect(background).toEqual(originalBackground);
    expect(toCssColor(result.adjusted)).not.toBe(toCssColor(foreground));
  });

  it("can increase lightness instead of blindly darkening on a dark background", () => {
    const foreground = color("#24324a");
    const background = color("#111318");
    const result = ensureContrast(foreground, background);

    expect(result.before).toBeLessThan(MINIMUM_TEXT_CONTRAST);
    expect(result.after).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST - 0.001);
    expect(result.adjusted.r + result.adjusted.g + result.adjusted.b)
      .toBeGreaterThan(foreground.r + foreground.g + foreground.b);
  });
});
