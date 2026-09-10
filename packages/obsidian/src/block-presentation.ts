import { findCodeBlocks } from "./blocks";
import {
  commonLanguages,
  type CommonLanguage,
  type CommonPresentationFamily,
} from "./common-languages";

export type BlockAlignment = "left" | "center" | "right";
export type BlockFlow = "ragged" | "justified";

export interface BlockPresentationDefaults {
  alignment: BlockAlignment;
  flow: BlockFlow;
}

export type BlockPresentationSettings = Record<
  CommonPresentationFamily,
  BlockPresentationDefaults
>;

export interface CommonFenceMatch {
  fence: string;
  baseFence: string;
  language: CommonLanguage;
  family?: CommonPresentationFamily;
  alignment?: BlockAlignment;
  flow?: BlockFlow;
}

export interface PresentationRewriteResult {
  source: string;
  changedBlocks: number;
}

const ALIGNMENTS: readonly BlockAlignment[] = ["left", "center", "right"];
const FLOWS: readonly BlockFlow[] = ["ragged", "justified"];

function normalized(value: string): string {
  return value.toLocaleLowerCase().replace(/^\./, "");
}

function isAlignment(value: string): value is BlockAlignment {
  return (ALIGNMENTS as readonly string[]).includes(value);
}

function isFlow(value: string): value is BlockFlow {
  return (FLOWS as readonly string[]).includes(value);
}

function parseSuffix(
  suffix: string,
): Pick<CommonFenceMatch, "alignment" | "flow"> | undefined {
  const parts = suffix.split("-");
  if (parts.length === 1) {
    const [part] = parts;
    if (part !== undefined && isAlignment(part)) return { alignment: part };
    if (part !== undefined && isFlow(part)) return { flow: part };
    return undefined;
  }
  if (parts.length === 2) {
    const [alignment, flow] = parts;
    if (
      alignment !== undefined &&
      flow !== undefined &&
      isAlignment(alignment) &&
      isFlow(flow)
    ) {
      return { alignment, flow };
    }
  }
  return undefined;
}

export function commonFenceMatch(value: string): CommonFenceMatch | undefined {
  const target = normalized(value);
  for (const language of commonLanguages()) {
    for (const rawBaseFence of language.fences) {
      const baseFence = normalized(rawBaseFence);
      const family = language.presentation?.family;
      if (target === baseFence) {
        return { fence: target, baseFence, language, family };
      }
      if (family === undefined || !target.startsWith(`${baseFence}-`)) continue;
      const overrides = parseSuffix(target.slice(baseFence.length + 1));
      if (overrides === undefined) continue;
      return {
        fence: target,
        baseFence,
        language,
        family,
        ...overrides,
      };
    }
  }
  return undefined;
}

function presentationalFenceNames(baseFence: string): string[] {
  const names = [baseFence];
  for (const alignment of ALIGNMENTS) names.push(`${baseFence}-${alignment}`);
  for (const flow of FLOWS) names.push(`${baseFence}-${flow}`);
  for (const alignment of ALIGNMENTS) {
    for (const flow of FLOWS) names.push(`${baseFence}-${alignment}-${flow}`);
  }
  return names;
}

export function commonFenceNames(): readonly string[] {
  const names = new Set<string>();
  for (const language of commonLanguages()) {
    for (const rawFence of language.fences) {
      const baseFence = normalized(rawFence);
      const variants = language.presentation?.family === undefined
        ? [baseFence]
        : presentationalFenceNames(baseFence);
      for (const variant of variants) names.add(variant);
    }
  }
  return [...names];
}

export function presentationClassNames(match: CommonFenceMatch): readonly string[] {
  if (match.family === undefined) return [];
  const classes = [
    "syntax-presentational",
    `syntax-presentation-family-${match.family}`,
  ];
  if (match.alignment !== undefined) {
    classes.push(`syntax-presentation-align-${match.alignment}`);
  }
  if (match.flow !== undefined) {
    classes.push(`syntax-presentation-flow-${match.flow}`);
  }
  return classes;
}

export function resolveBlockPresentation(
  match: CommonFenceMatch,
  defaults: BlockPresentationDefaults,
): BlockPresentationDefaults {
  return {
    alignment: match.alignment ?? defaults.alignment,
    flow: match.flow ?? defaults.flow,
  };
}

export function canonicalPresentationFence(
  match: CommonFenceMatch,
  presentation: BlockPresentationDefaults,
): string {
  return `${match.baseFence}-${presentation.alignment}-${presentation.flow}`;
}

function samePresentation(
  left: BlockPresentationDefaults,
  right: BlockPresentationDefaults,
): boolean {
  return left.alignment === right.alignment && left.flow === right.flow;
}

export function rewritePresentationFences(
  source: string,
  family: CommonPresentationFamily,
  previousDefaults: BlockPresentationDefaults,
  nextDefaults: BlockPresentationDefaults,
): PresentationRewriteResult {
  const accepted = new Set(commonFenceNames());
  const replacements: Array<{ from: number; to: number; text: string }> = [];

  for (const block of findCodeBlocks(source, accepted)) {
    const match = commonFenceMatch(block.language);
    if (match?.family !== family) continue;
    const previous = resolveBlockPresentation(match, previousDefaults);
    const next = resolveBlockPresentation(match, nextDefaults);
    if (samePresentation(previous, next)) continue;
    replacements.push({
      from: block.languageFrom,
      to: block.languageTo,
      text: canonicalPresentationFence(match, previous),
    });
  }

  let rewritten = source;
  for (const replacement of replacements.reverse()) {
    rewritten =
      rewritten.slice(0, replacement.from) +
      replacement.text +
      rewritten.slice(replacement.to);
  }
  return { source: rewritten, changedBlocks: replacements.length };
}

function flowDeclarations(flow: BlockFlow): string {
  return flow === "justified"
    ? "--syntax-presentation-text-align:justify;" +
        "--syntax-presentation-text-align-last:var(--syntax-presentation-alignment)"
    : "--syntax-presentation-text-align:var(--syntax-presentation-alignment);" +
        "--syntax-presentation-text-align-last:auto";
}

export function buildBlockPresentationCss(
  settings: BlockPresentationSettings,
): string {
  const rules: string[] = [];
  for (const family of ["text", "markdown"] as const) {
    const defaults = settings[family];
    rules.push(
      `.syntax-presentation-family-${family}{` +
        `--syntax-presentation-alignment:${defaults.alignment};` +
        `${flowDeclarations(defaults.flow)}}`,
    );
  }
  for (const alignment of ALIGNMENTS) {
    rules.push(
      `.syntax-presentation-align-${alignment}{` +
        `--syntax-presentation-alignment:${alignment}}`,
    );
  }
  for (const flow of FLOWS) {
    rules.push(
      `.syntax-presentation-flow-${flow}{${flowDeclarations(flow)}}`,
    );
  }
  return rules.join("\n");
}
