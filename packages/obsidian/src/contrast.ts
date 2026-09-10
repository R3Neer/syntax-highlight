export const MINIMUM_TEXT_CONTRAST = 4.5;

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface OklabColor {
  l: number;
  a: number;
  b: number;
}

export interface ContrastAdjustment {
  original: RgbaColor;
  adjusted: RgbaColor;
  before: number;
  after: number;
  changed: boolean;
}

const EPSILON = 1e-7;
const SEARCH_STEPS = 28;
const WHITE: RgbaColor = { r: 1, g: 1, b: 1, a: 1 };

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function parseHexChannel(value: string): number {
  return Number.parseInt(value, 16) / 255;
}

function parseRgbChannel(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    const percentage = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(percentage) ? clamp01(percentage / 100) : undefined;
  }
  const channel = Number.parseFloat(trimmed);
  return Number.isFinite(channel) ? clamp01(channel / 255) : undefined;
}

function parseAlpha(value: string | undefined): number | undefined {
  if (value === undefined) return 1;
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    const percentage = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(percentage) ? clamp01(percentage / 100) : undefined;
  }
  const alpha = Number.parseFloat(trimmed);
  return Number.isFinite(alpha) ? clamp01(alpha) : undefined;
}

export function parseCssColor(value: string): RgbaColor | undefined {
  const color = value.trim().toLocaleLowerCase();
  if (color === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const hex = color.match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex !== undefined) {
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: parseHexChannel(hex[0]! + hex[0]!),
        g: parseHexChannel(hex[1]! + hex[1]!),
        b: parseHexChannel(hex[2]! + hex[2]!),
        a: hex.length === 4 ? parseHexChannel(hex[3]! + hex[3]!) : 1,
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseHexChannel(hex.slice(0, 2)),
        g: parseHexChannel(hex.slice(2, 4)),
        b: parseHexChannel(hex.slice(4, 6)),
        a: hex.length === 8 ? parseHexChannel(hex.slice(6, 8)) : 1,
      };
    }
    return undefined;
  }

  const functional = color.match(/^rgba?\((.*)\)$/i)?.[1];
  if (functional === undefined) return undefined;
  const normalized = functional.replace(/,/g, " ");
  const [channelsPart, alphaPart] = normalized.split("/").map((part) => part.trim());
  const channels = channelsPart?.split(/\s+/).filter(Boolean) ?? [];
  if (channels.length !== 3) return undefined;
  const r = parseRgbChannel(channels[0]!);
  const g = parseRgbChannel(channels[1]!);
  const b = parseRgbChannel(channels[2]!);
  let alpha = parseAlpha(alphaPart);

  // Legacy rgba(r,g,b,a) becomes four whitespace-separated values after commas
  // are normalized, so support that serialization as well.
  if (alphaPart === undefined && channels.length === 3) {
    const legacy = functional.split(",").map((part) => part.trim());
    if (legacy.length === 4) alpha = parseAlpha(legacy[3]);
  }

  if (r === undefined || g === undefined || b === undefined || alpha === undefined) {
    return undefined;
  }
  return { r, g, b, a: alpha };
}

export function toCssColor(color: RgbaColor): string {
  const r = Math.round(clamp01(color.r) * 255);
  const g = Math.round(clamp01(color.g) * 255);
  const b = Math.round(clamp01(color.b) * 255);
  if (color.a >= 1 - EPSILON) return `rgb(${r}, ${g}, ${b})`;
  const alpha = Math.round(clamp01(color.a) * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function compositeOver(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha <= EPSILON) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha,
  };
}

function opaque(color: RgbaColor): RgbaColor {
  return color.a >= 1 - EPSILON ? color : compositeOver(color, WHITE);
}

function linearChannel(channel: number): number {
  const value = clamp01(channel);
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function gammaChannel(channel: number): number {
  return channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * channel ** (1 / 2.4) - 0.055;
}

export function relativeLuminance(color: RgbaColor): number {
  const flattened = opaque(color);
  return (
    0.2126 * linearChannel(flattened.r) +
    0.7152 * linearChannel(flattened.g) +
    0.0722 * linearChannel(flattened.b)
  );
}

export function contrastRatio(foreground: RgbaColor, background: RgbaColor): number {
  const bg = opaque(background);
  const fg = opaque(compositeOver(foreground, bg));
  const left = relativeLuminance(fg);
  const right = relativeLuminance(bg);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

export function contrastRatioCss(foreground: string, background: string): number | undefined {
  const fg = parseCssColor(foreground);
  const bg = parseCssColor(background);
  return fg === undefined || bg === undefined ? undefined : contrastRatio(fg, bg);
}

function srgbToOklab(color: RgbaColor): OklabColor {
  const r = linearChannel(color.r);
  const g = linearChannel(color.g);
  const b = linearChannel(color.b);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

function oklabToLinearRgb(color: OklabColor): [number, number, number] {
  const lRoot = color.l + 0.3963377774 * color.a + 0.2158037573 * color.b;
  const mRoot = color.l - 0.1055613458 * color.a - 0.0638541728 * color.b;
  const sRoot = color.l - 0.0894841775 * color.a - 1.291485548 * color.b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function inGamut(rgb: readonly number[]): boolean {
  return rgb.every((channel) => channel >= -EPSILON && channel <= 1 + EPSILON);
}

function gamutMappedOklab(color: OklabColor): OklabColor {
  if (inGamut(oklabToLinearRgb(color))) return color;
  let low = 0;
  let high = 1;
  for (let index = 0; index < SEARCH_STEPS; index += 1) {
    const scale = (low + high) / 2;
    const candidate = { l: color.l, a: color.a * scale, b: color.b * scale };
    if (inGamut(oklabToLinearRgb(candidate))) low = scale;
    else high = scale;
  }
  return { l: color.l, a: color.a * low, b: color.b * low };
}

function oklabToSrgb(color: OklabColor, alpha: number): RgbaColor {
  const mapped = gamutMappedOklab(color);
  const [r, g, b] = oklabToLinearRgb(mapped);
  return {
    r: clamp01(gammaChannel(clamp01(r))),
    g: clamp01(gammaChannel(clamp01(g))),
    b: clamp01(gammaChannel(clamp01(b))),
    a: clamp01(alpha),
  };
}

function perceptualDistance(left: RgbaColor, right: RgbaColor): number {
  const a = srgbToOklab(left);
  const b = srgbToOklab(right);
  const delta = Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);
  return delta + Math.abs(left.a - right.a) * 0.25;
}

function candidateAt(
  original: OklabColor,
  targetLightness: number,
  alpha: number,
): RgbaColor {
  return oklabToSrgb(
    {
      l: clamp01(targetLightness),
      a: original.a,
      b: original.b,
    },
    alpha,
  );
}

function nearestPassingCandidate(
  originalColor: RgbaColor,
  background: RgbaColor,
  minimum: number,
  targetLightness: 0 | 1,
  alpha: number,
): RgbaColor | undefined {
  const original = srgbToOklab(originalColor);
  const endpoint = candidateAt(original, targetLightness, alpha);
  if (contrastRatio(endpoint, background) + EPSILON < minimum) return undefined;

  let failing = 0;
  let passing = 1;
  for (let index = 0; index < SEARCH_STEPS; index += 1) {
    const amount = (failing + passing) / 2;
    const lightness = original.l + (targetLightness - original.l) * amount;
    const candidate = candidateAt(original, lightness, alpha);
    if (contrastRatio(candidate, background) + EPSILON >= minimum) passing = amount;
    else failing = amount;
  }
  const lightness = original.l + (targetLightness - original.l) * passing;
  return candidateAt(original, lightness, alpha);
}

export function ensureContrast(
  foreground: RgbaColor,
  background: RgbaColor,
  minimum = MINIMUM_TEXT_CONTRAST,
): ContrastAdjustment {
  const before = contrastRatio(foreground, background);
  if (before + EPSILON >= minimum) {
    return { original: foreground, adjusted: foreground, before, after: before, changed: false };
  }

  const candidates: RgbaColor[] = [];
  for (const target of [0, 1] as const) {
    const candidate = nearestPassingCandidate(
      foreground,
      background,
      minimum,
      target,
      foreground.a,
    );
    if (candidate !== undefined) candidates.push(candidate);
  }

  // Very transparent text may be unable to reach the target while preserving
  // alpha. In that case allow opacity to rise, but still minimize perceptual
  // movement in the resulting visible color.
  if (candidates.length === 0 && foreground.a < 1 - EPSILON) {
    for (const target of [0, 1] as const) {
      const candidate = nearestPassingCandidate(
        { ...foreground, a: 1 },
        background,
        minimum,
        target,
        1,
      );
      if (candidate !== undefined) candidates.push(candidate);
    }
  }

  const adjusted = candidates.sort(
    (left, right) => perceptualDistance(foreground, left) - perceptualDistance(foreground, right),
  )[0] ?? foreground;
  const after = contrastRatio(adjusted, background);
  return {
    original: foreground,
    adjusted,
    before,
    after,
    changed: after > before + EPSILON,
  };
}
