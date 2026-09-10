from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, got {count}: {old[:100]!r}")
    write(path, text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# Pure presentation model
# ---------------------------------------------------------------------------
write(
    "packages/obsidian/src/block-presentation.ts",
    r'''import { findCodeBlocks } from "./blocks";
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
''',
)

# ---------------------------------------------------------------------------
# Common-language capabilities: Text + Markdown are presentational families
# ---------------------------------------------------------------------------
replace_once(
    "packages/obsidian/src/common-languages.ts",
    '''export interface CommonLanguagePresentation {\n  badge?: boolean;\n  lineNumbers?: boolean;\n}\n''',
    '''export type CommonPresentationFamily = "text" | "markdown";\n\nexport interface CommonLanguagePresentation {\n  badge?: boolean;\n  lineNumbers?: boolean;\n  family?: CommonPresentationFamily;\n}\n''',
)
replace_once(
    "packages/obsidian/src/common-languages.ts",
    '''  {\n    id: "markdown",\n    name: "Markdown",\n    fences: ["md", "markdown"],\n    extensions: ["md", "markdown"],\n    support: markdown,\n  },\n''',
    '''  {\n    id: "markdown",\n    name: "Markdown",\n    fences: ["md", "markdown"],\n    extensions: ["md", "markdown"],\n    support: markdown,\n    presentation: {\n      badge: false,\n      lineNumbers: false,\n      family: "markdown",\n    },\n  },\n''',
)
replace_once(
    "packages/obsidian/src/common-languages.ts",
    '''    presentation: {\n      badge: false,\n      lineNumbers: false,\n    },\n  },\n];\n''',
    '''    presentation: {\n      badge: false,\n      lineNumbers: false,\n      family: "text",\n    },\n  },\n];\n''',
)

# ---------------------------------------------------------------------------
# Fence offsets for safe source rewrites
# ---------------------------------------------------------------------------
replace_once(
    "packages/obsidian/src/blocks.ts",
    '''export interface MudCodeBlock {\n  from: number;\n  to: number;\n  language: string;\n}\n''',
    '''export interface MudCodeBlock {\n  from: number;\n  to: number;\n  language: string;\n  languageFrom: number;\n  languageTo: number;\n}\n''',
)
replace_once(
    "packages/obsidian/src/blocks.ts",
    '''    const language = opening[2]?.toLocaleLowerCase() ?? "";\n    if (!acceptedLanguages.has(language)) continue;\n\n    const fence = opening[1] ?? "```";\n''',
    '''    const rawLanguage = opening[2] ?? "";\n    const language = rawLanguage.toLocaleLowerCase();\n    if (!acceptedLanguages.has(language)) continue;\n    const languageOffset = line.text.indexOf(rawLanguage);\n    if (languageOffset < 0) continue;\n    const languageFrom = line.from + languageOffset;\n    const languageTo = languageFrom + rawLanguage.length;\n\n    const fence = opening[1] ?? "```";\n''',
)
replace_once(
    "packages/obsidian/src/blocks.ts",
    '''    blocks.push({ from: bodyFrom, to: bodyTo, language });\n''',
    '''    blocks.push({\n      from: bodyFrom,\n      to: bodyTo,\n      language,\n      languageFrom,\n      languageTo,\n    });\n''',
)

# ---------------------------------------------------------------------------
# Settings schema 8 and persisted family defaults
# ---------------------------------------------------------------------------
replace_once(
    "packages/obsidian/src/settings.ts",
    '''} from "./descriptor";\n\nexport type ColorMode = "light" | "dark";\n''',
    '''} from "./descriptor";\nimport type { BlockPresentationSettings } from "./block-presentation";\n\nexport type ColorMode = "light" | "dark";\n''',
)
replace_once(
    "packages/obsidian/src/settings.ts",
    '''export interface SyntaxPluginSettings {\n  schemaVersion: 7;\n''',
    '''export interface SyntaxPluginSettings {\n  schemaVersion: 8;\n''',
)
replace_once(
    "packages/obsidian/src/settings.ts",
    '''  markdownEditor: boolean;\n  sourceEditor: boolean;\n  indentStyle: "spaces" | "tabs";\n''',
    '''  markdownEditor: boolean;\n  sourceEditor: boolean;\n  blockPresentation: BlockPresentationSettings;\n  indentStyle: "spaces" | "tabs";\n''',
)
replace_once(
    "packages/obsidian/src/settings.ts",
    '''const OPTIONAL_BUILTIN_PROFILES = {\n  mud: defaultProfile("mud", "catppuccin"),\n} as const;\n\nexport const DEFAULT_SETTINGS: SyntaxPluginSettings = {\n  schemaVersion: 7,\n''',
    '''const OPTIONAL_BUILTIN_PROFILES = {\n  mud: defaultProfile("mud", "catppuccin"),\n} as const;\n\nexport const DEFAULT_BLOCK_PRESENTATION: BlockPresentationSettings = {\n  text: { alignment: "left", flow: "ragged" },\n  markdown: { alignment: "left", flow: "ragged" },\n};\n\nexport const DEFAULT_SETTINGS: SyntaxPluginSettings = {\n  schemaVersion: 8,\n''',
)
replace_once(
    "packages/obsidian/src/settings.ts",
    '''  markdownReading: true,\n  markdownEditor: true,\n  sourceEditor: true,\n  indentStyle: "spaces",\n''',
    '''  markdownReading: true,\n  markdownEditor: true,\n  sourceEditor: true,\n  blockPresentation: structuredClone(DEFAULT_BLOCK_PRESENTATION),\n  indentStyle: "spaces",\n''',
)
replace_once(
    "packages/obsidian/src/settings.ts",
    '''export function loadSettings(value: unknown): SyntaxPluginSettings {\n''',
    '''function mergeBlockPresentationSettings(value: unknown): BlockPresentationSettings {\n  const object =\n    typeof value === "object" && value !== null && !Array.isArray(value)\n      ? (value as Record<string, unknown>)\n      : {};\n  const merge = (\n    raw: unknown,\n    fallback: BlockPresentationSettings["text"],\n  ): BlockPresentationSettings["text"] => {\n    const entry =\n      typeof raw === "object" && raw !== null && !Array.isArray(raw)\n        ? (raw as Record<string, unknown>)\n        : {};\n    const alignment =\n      entry.alignment === "left" ||\n      entry.alignment === "center" ||\n      entry.alignment === "right"\n        ? entry.alignment\n        : fallback.alignment;\n    const flow =\n      entry.flow === "ragged" || entry.flow === "justified"\n        ? entry.flow\n        : fallback.flow;\n    return { alignment, flow };\n  };\n  return {\n    text: merge(object.text, DEFAULT_BLOCK_PRESENTATION.text),\n    markdown: merge(object.markdown, DEFAULT_BLOCK_PRESENTATION.markdown),\n  };\n}\n\nexport function loadSettings(value: unknown): SyntaxPluginSettings {\n''',
)
replace_once(
    "packages/obsidian/src/settings.ts",
    '''  return {\n    schemaVersion: 7,\n    locale:\n''',
    '''  return {\n    schemaVersion: 8,\n    locale:\n''',
)
replace_once(
    "packages/obsidian/src/settings.ts",
    '''    sourceEditor:\n      typeof object.sourceEditor === "boolean" ? object.sourceEditor : true,\n    indentStyle: object.indentStyle === "tabs" ? "tabs" : "spaces",\n''',
    '''    sourceEditor:\n      typeof object.sourceEditor === "boolean" ? object.sourceEditor : true,\n    blockPresentation: mergeBlockPresentationSettings(object.blockPresentation),\n    indentStyle: object.indentStyle === "tabs" ? "tabs" : "spaces",\n''',
)

replace_once(
    "packages/obsidian/scripts/install-local.mjs",
    "const CURRENT_SETTINGS_SCHEMA_VERSION = 7;\n",
    "const CURRENT_SETTINGS_SCHEMA_VERSION = 8;\n",
)

# ---------------------------------------------------------------------------
# Theme manager owns the live defaults, so changing settings updates existing DOM
# ---------------------------------------------------------------------------
replace_once(
    "packages/obsidian/src/themes.ts",
    '''import { CommonContrastManager } from "./contrast-manager";\n''',
    '''import { buildBlockPresentationCss } from "./block-presentation";\nimport { CommonContrastManager } from "./contrast-manager";\n''',
)
replace_once(
    "packages/obsidian/src/themes.ts",
    '''  const rules: string[] = [];\n\n  // Common-language blocks use the active Obsidian theme in normal views. Keep\n''',
    '''  const rules: string[] = [buildBlockPresentationCss(settings.blockPresentation)];\n\n  // Common-language blocks use the active Obsidian theme in normal views. Keep\n''',
)

# ---------------------------------------------------------------------------
# Register all finite presentational fence variants in Reading View
# ---------------------------------------------------------------------------
replace_once(
    "packages/obsidian/src/main.ts",
    '''import { commonLanguages } from "./common-languages";\n''',
    '''import { commonFenceMatch, commonFenceNames } from "./block-presentation";\nimport { commonLanguages } from "./common-languages";\n''',
)
old_register = '''  private registerCommonFences(): void {\n    for (const language of commonLanguages()) {\n      for (const rawFence of language.fences) {\n        const fence = rawFence.toLocaleLowerCase();\n        if (!isSafeMarkdownProcessorLanguage(fence)) continue;\n        if (this.registeredFences.has(fence)) continue;\n        this.registeredFences.add(fence);\n        this.registerMarkdownCodeBlockProcessor(\n          fence,\n          (source, element, context) => {\n            if (!this.pluginSettings.markdownReading) {\n              const pre = document.createElement("pre");\n              const code = document.createElement("code");\n              code.textContent = source;\n              pre.append(code);\n              element.replaceChildren(pre);\n              this.enableReadingBlockEditing(element, context);\n              return;\n            }\n            renderCommonCode(\n              source,\n              element,\n              language,\n              this.pluginSettings.lineNumbers,\n            );\n            this.enableReadingBlockEditing(element, context);\n          },\n        );\n      }\n    }\n  }\n'''
new_register = '''  private registerCommonFences(): void {\n    for (const fence of commonFenceNames()) {\n      const match = commonFenceMatch(fence);\n      if (match === undefined) continue;\n      if (!isSafeMarkdownProcessorLanguage(fence)) continue;\n      if (this.registeredFences.has(fence)) continue;\n      this.registeredFences.add(fence);\n      this.registerMarkdownCodeBlockProcessor(\n        fence,\n        (source, element, context) => {\n          if (!this.pluginSettings.markdownReading) {\n            const pre = document.createElement("pre");\n            const code = document.createElement("code");\n            code.textContent = source;\n            pre.append(code);\n            element.replaceChildren(pre);\n            this.enableReadingBlockEditing(element, context);\n            return;\n          }\n          renderCommonCode(\n            source,\n            element,\n            match.language,\n            this.pluginSettings.lineNumbers,\n            fence,\n          );\n          this.enableReadingBlockEditing(element, context);\n        },\n      );\n    }\n  }\n'''
replace_once("packages/obsidian/src/main.ts", old_register, new_register)

# ---------------------------------------------------------------------------
# Reading renderer: family + explicit modifiers become classes on the frame
# ---------------------------------------------------------------------------
replace_once(
    "packages/obsidian/src/reading.ts",
    '''import { highlightTree } from "@lezer/highlight";\n\n''',
    '''import { highlightTree } from "@lezer/highlight";\n\nimport { commonFenceMatch, presentationClassNames } from "./block-presentation";\n''',
)
replace_once(
    "packages/obsidian/src/reading.ts",
    '''  badge?: LanguageBadge,\n  plainClass?: string,\n): void {\n  container.replaceChildren();\n  const frame = document.createElement("div");\n  frame.className = "syntax-highlight-frame";\n''',
    '''  badge?: LanguageBadge,\n  plainClass?: string,\n  frameClasses: readonly string[] = [],\n): void {\n  container.replaceChildren();\n  const frame = document.createElement("div");\n  frame.className = "syntax-highlight-frame";\n  if (frameClasses.length > 0) frame.classList.add(...frameClasses);\n''',
)
replace_once(
    "packages/obsidian/src/reading.ts",
    '''export function renderCommonCode(\n  source: string,\n  container: HTMLElement,\n  language: CommonLanguage,\n  showLineNumbers = true,\n): void {\n''',
    '''export function renderCommonCode(\n  source: string,\n  container: HTMLElement,\n  language: CommonLanguage,\n  showLineNumbers = true,\n  fence = language.fences[0] ?? language.id,\n): void {\n''',
)
replace_once(
    "packages/obsidian/src/reading.ts",
    '''  const badge = language.presentation?.badge === false\n    ? undefined\n    : { label: language.name };\n  renderRanges(\n''',
    '''  const badge = language.presentation?.badge === false\n    ? undefined\n    : { label: language.name };\n  const match = commonFenceMatch(fence);\n  const frameClasses = match === undefined ? [] : presentationClassNames(match);\n  renderRanges(\n''',
)
replace_once(
    "packages/obsidian/src/reading.ts",
    '''    badge,\n    "syntax-common-plain",\n  );\n}\n''',
    '''    badge,\n    "syntax-common-plain",\n    frameClasses,\n  );\n}\n''',
)

# ---------------------------------------------------------------------------
# Markdown editor: recognize variants + decorate body lines with presentation
# ---------------------------------------------------------------------------
replace_once(
    "packages/obsidian/src/editor.ts",
    '''import { findCodeBlocks, findMudCodeBlocks } from "./blocks";\nimport {\n  COMMON_EDITOR_HIGHLIGHT_STYLE,\n  commonLanguageByFence,\n  commonLanguages,\n} from "./common-languages";\n''',
    '''import { findCodeBlocks, findMudCodeBlocks } from "./blocks";\nimport {\n  commonFenceMatch,\n  commonFenceNames,\n  presentationClassNames,\n  type CommonFenceMatch,\n} from "./block-presentation";\nimport {\n  COMMON_EDITOR_HIGHLIGHT_STYLE,\n  type CommonLanguage,\n} from "./common-languages";\n''',
)
replace_once(
    "packages/obsidian/src/editor.ts",
    '''function addCommonLanguageRanges(\n  ranges: Range<Decoration>[],\n  source: string,\n  base: number,\n  fence: string,\n): void {\n  const language = commonLanguageByFence(fence);\n  if (language === undefined) return;\n  const support = language.support?.();\n''',
    '''function addCommonLanguageRanges(\n  ranges: Range<Decoration>[],\n  source: string,\n  base: number,\n  language: CommonLanguage,\n): void {\n  const support = language.support?.();\n''',
)
insert_after_common = '''  highlightTree(tree, COMMON_EDITOR_HIGHLIGHT_STYLE, (from, to, classes) => {\n    if (from >= to) return;\n    ranges.push(\n      Decoration.mark({ class: classes }).range(base + from, base + to),\n    );\n  });\n}\n'''
replacement_common = insert_after_common + '''\nfunction addPresentationLineRanges(\n  ranges: Range<Decoration>[],\n  view: EditorView,\n  from: number,\n  to: number,\n  match: CommonFenceMatch,\n): void {\n  const classes = presentationClassNames(match).join(" ");\n  if (!classes || from >= to) return;\n  let line = view.state.doc.lineAt(from);\n  while (line.from < to) {\n    ranges.push(\n      Decoration.line({ attributes: { class: classes } }).range(line.from),\n    );\n    if (line.number >= view.state.doc.lines) break;\n    line = view.state.doc.line(line.number + 1);\n  }\n}\n'''
replace_once("packages/obsidian/src/editor.ts", insert_after_common, replacement_common)
replace_once(
    "packages/obsidian/src/editor.ts",
    '''      ...commonLanguages().flatMap(({ fences: aliases }) => aliases),\n''',
    '''      ...commonFenceNames(),\n''',
)
old_loop = '''  for (const block of findCodeBlocks(source, fences)) {\n    const body = source.slice(block.from, block.to);\n    const runtime = registry.byFence(block.language);\n    if (runtime !== undefined) {\n      for (const token of runtime.tokenize(body)) {\n        addTokenRanges(ranges, token, block.from, runtime.settings.id);\n      }\n    } else {\n      addCommonLanguageRanges(ranges, body, block.from, block.language);\n    }\n    if (\n      lineNumbers &&\n      (runtime !== undefined ||\n        commonLanguageByFence(block.language)?.presentation?.lineNumbers !== false)\n    ) {\n'''
new_loop = '''  for (const block of findCodeBlocks(source, fences)) {\n    const body = source.slice(block.from, block.to);\n    const runtime = registry.byFence(block.language);\n    const common = runtime === undefined ? commonFenceMatch(block.language) : undefined;\n    if (runtime !== undefined) {\n      for (const token of runtime.tokenize(body)) {\n        addTokenRanges(ranges, token, block.from, runtime.settings.id);\n      }\n    } else if (common !== undefined) {\n      addCommonLanguageRanges(ranges, body, block.from, common.language);\n      addPresentationLineRanges(ranges, view, block.from, block.to, common);\n    }\n    if (\n      lineNumbers &&\n      (runtime !== undefined || common?.language.presentation?.lineNumbers !== false)\n    ) {\n'''
replace_once("packages/obsidian/src/editor.ts", old_loop, new_loop)
replace_once(
    "packages/obsidian/src/editor.ts",
    '''        ...commonLanguages().flatMap(({ fences }) => fences),\n''',
    '''        ...commonFenceNames(),\n''',
)
replace_once(
    "packages/obsidian/src/editor.ts",
    '''          commonLanguageByFence(block.language)?.id;\n''',
    '''          commonFenceMatch(block.language)?.language.id;\n''',
)

# ---------------------------------------------------------------------------
# CSS consumer rules for generated presentation variables + settings controls
# ---------------------------------------------------------------------------
replace_once(
    "packages/obsidian/styles.css",
    '''.syntax-code-line-content {\n  min-width: 0;\n  white-space: pre;\n}\n\n''',
    '''.syntax-code-line-content {\n  min-width: 0;\n  white-space: pre;\n}\n\n.syntax-highlight-frame.syntax-presentational .syntax-code-line {\n  text-align: var(--syntax-presentation-text-align, left);\n  text-align-last: var(--syntax-presentation-text-align-last, auto);\n}\n\n.syntax-highlight-frame.syntax-presentational .syntax-code-line-content {\n  overflow-wrap: break-word;\n  white-space: pre-wrap;\n}\n\n.cm-line.syntax-presentational {\n  text-align: var(--syntax-presentation-text-align, left);\n  text-align-last: var(--syntax-presentation-text-align-last, auto);\n}\n\n''',
)
replace_once(
    "packages/obsidian/styles.css",
    '''.syntax-settings-section[open] > summary {\n  margin-bottom: 0.85rem;\n}\n\n''',
    '''.syntax-settings-section[open] > summary {\n  margin-bottom: 0.85rem;\n}\n\n.syntax-presentation-group-title {\n  margin: 1rem 0 0.25rem;\n  font-size: var(--font-ui-medium);\n}\n\n.syntax-segmented-control {\n  display: inline-flex;\n  gap: 0.2rem;\n  padding: 0.2rem;\n  border: 1px solid var(--background-modifier-border);\n  border-radius: var(--radius-s);\n  background: var(--background-secondary);\n}\n\n.syntax-segmented-button {\n  min-width: 4.8rem;\n  margin: 0;\n  border: 0;\n  box-shadow: none;\n  background: transparent;\n}\n\n.syntax-segmented-button.is-active {\n  background: var(--interactive-accent);\n  color: var(--text-on-accent);\n}\n\n.syntax-presentation-info {\n  margin-top: 1rem;\n  padding: 0.75rem 0.9rem;\n  border-left: 3px solid var(--interactive-accent);\n  border-radius: var(--radius-s);\n  background: var(--background-secondary);\n  color: var(--text-muted);\n}\n\n.syntax-presentation-info p {\n  margin: 0.35rem 0 0;\n}\n\n''',
)

# ---------------------------------------------------------------------------
# Settings UI + safe vault migration flow
# ---------------------------------------------------------------------------
replace_once(
    "packages/obsidian/src/settings-tab.ts",
    '''import type SyntaxHighlightPlugin from "./main";\n''',
    '''import {\n  rewritePresentationFences,\n  type BlockAlignment,\n  type BlockFlow,\n  type BlockPresentationDefaults,\n} from "./block-presentation";\nimport type { CommonPresentationFamily } from "./common-languages";\nimport type SyntaxHighlightPlugin from "./main";\n''',
)
insert_display = '''    this.editorToggle(\n      general,\n      "continueLineComments",\n      tr("Continue line comments", "Continuar comentarios de línea"),\n    );\n\n'''
replace_once(
    "packages/obsidian/src/settings-tab.ts",
    insert_display,
    insert_display + '''    const presentation = this.section(\n      containerEl,\n      tr("Text and Markdown blocks", "Bloques Text y Markdown"),\n      true,\n    );\n    this.renderPresentationGroup(\n      presentation,\n      "text",\n      tr("Text blocks", "Bloques Text"),\n    );\n    this.renderPresentationGroup(\n      presentation,\n      "markdown",\n      tr("Markdown blocks", "Bloques Markdown"),\n    );\n    this.renderPresentationInfo(presentation);\n\n''',
)
marker = '''  private renderLanguage(\n    language: LanguageProfileSettings,\n    parent: HTMLElement,\n  ): void {\n'''
methods = r'''  private renderPresentationGroup(
    parent: HTMLElement,
    family: CommonPresentationFamily,
    title: string,
  ): void {
    const tr = (en: string, es: string): string =>
      translate(this.plugin.pluginSettings, en, es);
    const current = this.plugin.pluginSettings.blockPresentation[family];
    parent.createEl("h3", {
      text: title,
      cls: "syntax-presentation-group-title",
    });

    const alignment = new Setting(parent).setName(tr("Alignment", "Alineación"));
    this.segmentedControl<BlockAlignment>(
      alignment.controlEl,
      current.alignment,
      [
        ["left", tr("Left", "Izquierda")],
        ["center", tr("Center", "Centro")],
        ["right", tr("Right", "Derecha")],
      ],
      async (value) => {
        await this.changePresentationDefault(family, {
          ...current,
          alignment: value,
        });
      },
    );

    const flow = new Setting(parent).setName(tr("Flow", "Flujo"));
    this.segmentedControl<BlockFlow>(
      flow.controlEl,
      current.flow,
      [
        ["ragged", "Ragged"],
        ["justified", tr("Justified", "Justificado")],
      ],
      async (value) => {
        await this.changePresentationDefault(family, {
          ...current,
          flow: value,
        });
      },
    );
  }

  private segmentedControl<T extends string>(
    parent: HTMLElement,
    current: T,
    options: readonly (readonly [T, string])[],
    onChange: (value: T) => Promise<void>,
  ): void {
    const group = parent.createDiv("syntax-segmented-control");
    group.setAttribute("role", "group");
    for (const [value, label] of options) {
      const button = group.createEl("button", {
        text: label,
        cls: "syntax-segmented-button",
      });
      button.type = "button";
      const active = value === current;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.addEventListener("click", () => {
        if (!active) void onChange(value);
      });
    }
  }

  private renderPresentationInfo(parent: HTMLElement): void {
    const tr = (en: string, es: string): string =>
      translate(this.plugin.pluginSettings, en, es);
    const info = parent.createDiv("syntax-presentation-info");
    info.createEl("strong", {
      text: tr("Per-block overrides", "Overrides por bloque"),
    });
    info.createEl("p", {
      text: tr(
        "A fence without modifiers inherits these defaults. Add hyphen modifiers to override alignment and/or flow for one block. Canonical order is base-alignment-flow.",
        "Un fence sin modificadores hereda estos valores. Añade modificadores con guiones para sobrescribir la alineación y/o el flujo de un bloque. El orden canónico es base-alineación-flujo.",
      ),
    });
    const examples = info.createEl("p");
    examples.append(
      document.createTextNode(`${tr("Examples", "Ejemplos")}: `),
      info.ownerDocument.createElement("code"),
      document.createTextNode(", "),
      info.ownerDocument.createElement("code"),
      document.createTextNode(". "),
      document.createTextNode(
        tr(
          "Justified stretches wrapped lines; Alignment controls the last line. Ragged uses Alignment directly.",
          "Justified expande las líneas envueltas; Alineación controla la última línea. Ragged usa Alineación directamente.",
        ),
      ),
    );
    const codes = examples.querySelectorAll("code");
    if (codes[0] !== undefined) codes[0].textContent = "text-right-justified";
    if (codes[1] !== undefined) codes[1].textContent = "markdown-center-ragged";
  }

  private async changePresentationDefault(
    family: CommonPresentationFamily,
    next: BlockPresentationDefaults,
  ): Promise<void> {
    const previous = structuredClone(
      this.plugin.pluginSettings.blockPresentation[family],
    );
    if (
      previous.alignment === next.alignment &&
      previous.flow === next.flow
    ) {
      return;
    }
    const tr = (en: string, es: string): string =>
      translate(this.plugin.pluginSettings, en, es);

    let impact: { blocks: number; files: number };
    try {
      impact = await this.presentationImpact(family, previous, next);
    } catch (error) {
      new Notice(
        error instanceof Error
          ? error.message
          : tr(
              "Could not inspect existing blocks.",
              "No se pudieron revisar los bloques existentes.",
            ),
      );
      this.display();
      return;
    }

    let action = "apply";
    if (impact.blocks > 0) {
      const familyName = family === "text" ? "Text" : "Markdown";
      action = await this.choose(
        tr(
          `Change ${familyName} defaults?`,
          `¿Cambiar los valores de ${familyName}?`,
        ),
        [
          [
            "preserve",
            tr("Keep current appearance", "Mantener apariencia actual"),
          ],
          [
            "apply",
            tr("Apply new default", "Aplicar nuevo valor predeterminado"),
          ],
          ["cancel", tr("Cancel", "Cancelar")],
        ],
        tr(
          `${impact.blocks} blocks in ${impact.files} Markdown files depend on the value being changed. Keeping their appearance rewrites only those opening fences with explicit alignment and flow modifiers.`,
          `${impact.blocks} bloques en ${impact.files} archivos Markdown dependen del valor que cambia. Mantener su apariencia reescribirá solo esos fences de apertura con alineación y flujo explícitos.`,
        ),
      );
    }
    if (action === "cancel") {
      this.display();
      return;
    }

    try {
      let rewritten = { blocks: 0, files: 0 };
      if (action === "preserve") {
        rewritten = await this.rewritePresentationVault(family, previous, next);
      }
      this.plugin.pluginSettings.blockPresentation[family] = next;
      try {
        await this.plugin.commitSettings(false);
      } catch (error) {
        this.plugin.pluginSettings.blockPresentation[family] = previous;
        throw error;
      }
      if (action === "preserve") {
        new Notice(
          tr(
            `Preserved ${rewritten.blocks} blocks in ${rewritten.files} files.`,
            `Se ha conservado la apariencia de ${rewritten.blocks} bloques en ${rewritten.files} archivos.`,
          ),
        );
      }
      this.display();
    } catch (error) {
      new Notice(
        error instanceof Error
          ? error.message
          : tr(
              "Could not update block presentation.",
              "No se pudo actualizar la presentación de los bloques.",
            ),
      );
      this.display();
    }
  }

  private async presentationImpact(
    family: CommonPresentationFamily,
    previous: BlockPresentationDefaults,
    next: BlockPresentationDefaults,
  ): Promise<{ blocks: number; files: number }> {
    let blocks = 0;
    let files = 0;
    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      const source = await this.plugin.app.vault.cachedRead(file);
      const result = rewritePresentationFences(source, family, previous, next);
      if (result.changedBlocks === 0) continue;
      blocks += result.changedBlocks;
      files += 1;
    }
    return { blocks, files };
  }

  private async rewritePresentationVault(
    family: CommonPresentationFamily,
    previous: BlockPresentationDefaults,
    next: BlockPresentationDefaults,
  ): Promise<{ blocks: number; files: number }> {
    let blocks = 0;
    let files = 0;
    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      const source = await this.plugin.app.vault.read(file);
      const result = rewritePresentationFences(source, family, previous, next);
      if (result.changedBlocks === 0) continue;
      await this.plugin.app.vault.modify(file, result.source);
      blocks += result.changedBlocks;
      files += 1;
    }
    return { blocks, files };
  }

'''
replace_once("packages/obsidian/src/settings-tab.ts", marker, methods + marker)
replace_once(
    "packages/obsidian/src/settings-tab.ts",
    '''  private choose(\n    title: string,\n    choices: readonly [string, string][],\n  ): Promise<string> {\n''',
    '''  private choose(\n    title: string,\n    choices: readonly [string, string][],\n    description?: string,\n  ): Promise<string> {\n''',
)
replace_once(
    "packages/obsidian/src/settings-tab.ts",
    '''      const modal = new Modal(this.plugin.app);\n      modal.titleEl.setText(title);\n      for (const [value, label] of choices) {\n''',
    '''      const modal = new Modal(this.plugin.app);\n      modal.titleEl.setText(title);\n      if (description !== undefined) {\n        modal.contentEl.createEl("p", {\n          text: description,\n          cls: "setting-item-description",\n        });\n      }\n      for (const [value, label] of choices) {\n''',
)

# ---------------------------------------------------------------------------
# Tests: pure modifier grammar, rewrite, settings, renderer/editor, CSS
# ---------------------------------------------------------------------------
write(
    "packages/obsidian/tests/block-presentation.test.ts",
    r'''import { describe, expect, it } from "vitest";

import {
  buildBlockPresentationCss,
  canonicalPresentationFence,
  commonFenceMatch,
  commonFenceNames,
  presentationClassNames,
  resolveBlockPresentation,
  rewritePresentationFences,
} from "../src/block-presentation";

describe("presentational fence modifiers", () => {
  it("parses canonical full and partial overrides without creating languages", () => {
    const full = commonFenceMatch("TEXT-right-justified");
    expect(full).toMatchObject({
      baseFence: "text",
      family: "text",
      alignment: "right",
      flow: "justified",
    });
    expect(full?.language.id).toBe("text");

    expect(commonFenceMatch("md-center-ragged")).toMatchObject({
      baseFence: "md",
      family: "markdown",
      alignment: "center",
      flow: "ragged",
    });
    expect(commonFenceMatch("plaintext-justified")).toMatchObject({
      baseFence: "plaintext",
      flow: "justified",
    });
    expect(commonFenceMatch("markdown-right")).toMatchObject({
      baseFence: "markdown",
      alignment: "right",
    });
  });

  it("rejects invalid order, duplicate dimensions, and modifiers on code languages", () => {
    expect(commonFenceMatch("text-justified-right")).toBeUndefined();
    expect(commonFenceMatch("text-left-center")).toBeUndefined();
    expect(commonFenceMatch("markdown-ragged-justified")).toBeUndefined();
    expect(commonFenceMatch("bash-center")).toBeUndefined();
  });

  it("enumerates the finite variants Obsidian must register", () => {
    const names = new Set(commonFenceNames());
    for (const name of [
      "text",
      "text-left",
      "text-justified",
      "text-right-justified",
      "plaintext-center-ragged",
      "md-left-justified",
      "markdown-right-ragged",
      "powershell",
    ]) {
      expect(names.has(name)).toBe(true);
    }
    expect(names.has("bash-center")).toBe(false);
  });

  it("resolves omitted dimensions from defaults and canonicalizes full state", () => {
    const match = commonFenceMatch("text-right")!;
    const resolved = resolveBlockPresentation(match, {
      alignment: "center",
      flow: "justified",
    });
    expect(resolved).toEqual({ alignment: "right", flow: "justified" });
    expect(canonicalPresentationFence(match, resolved)).toBe(
      "text-right-justified",
    );
    expect(presentationClassNames(match)).toEqual([
      "syntax-presentational",
      "syntax-presentation-family-text",
      "syntax-presentation-align-right",
    ]);
  });
});

describe("presentation-preserving fence rewrite", () => {
  it("freezes only blocks whose resolved appearance would change", () => {
    const source = [
      "before",
      "```text title=demo",
      "implicit",
      "```",
      "```text-center",
      "explicit alignment",
      "```",
      "~~~plaintext-justified extra",
      "partial override",
      "~~~",
      "```markdown",
      "other family",
      "```",
    ].join("\n");
    const result = rewritePresentationFences(
      source,
      "text",
      { alignment: "left", flow: "ragged" },
      { alignment: "right", flow: "ragged" },
    );

    expect(result.changedBlocks).toBe(2);
    expect(result.source).toContain("```text-left-ragged title=demo");
    expect(result.source).toContain("```text-center\n");
    expect(result.source).toContain("~~~plaintext-left-justified extra");
    expect(result.source).toContain("```markdown\n");
  });

  it("freezes a previously inherited flow when that default changes", () => {
    const source = "```text-center\r\nalpha beta gamma\r\n```\r\n";
    const result = rewritePresentationFences(
      source,
      "text",
      { alignment: "left", flow: "ragged" },
      { alignment: "left", flow: "justified" },
    );
    expect(result.changedBlocks).toBe(1);
    expect(result.source).toBe(
      "```text-center-ragged\r\nalpha beta gamma\r\n```\r\n",
    );
  });

  it("does nothing to fully explicit blocks", () => {
    const source = "```md-right-justified\n# title\n```";
    const result = rewritePresentationFences(
      source,
      "markdown",
      { alignment: "left", flow: "ragged" },
      { alignment: "center", flow: "justified" },
    );
    expect(result).toEqual({ source, changedBlocks: 0 });
  });
});

describe("presentation CSS", () => {
  it("encodes live family defaults and local override rules", () => {
    const css = buildBlockPresentationCss({
      text: { alignment: "center", flow: "ragged" },
      markdown: { alignment: "right", flow: "justified" },
    });
    expect(css).toContain(
      ".syntax-presentation-family-text{--syntax-presentation-alignment:center;",
    );
    expect(css).toContain(
      ".syntax-presentation-family-markdown{--syntax-presentation-alignment:right;--syntax-presentation-text-align:justify;",
    );
    expect(css).toContain(
      ".syntax-presentation-flow-ragged{--syntax-presentation-text-align:var(--syntax-presentation-alignment);",
    );
    expect(css).toContain(
      ".syntax-presentation-flow-justified{--syntax-presentation-text-align:justify;",
    );
  });
});
''',
)

# Settings expectations + migration coverage
for path in [
    "packages/obsidian/tests/settings.test.ts",
    "packages/obsidian/tests/portability.test.ts",
    "packages/obsidian/tests/install-local.test.mjs",
]:
    text = read(path)
    text = text.replace("schemaVersion: 7,", "schemaVersion: 8,", 1) if path.endswith("settings.test.ts") else text
    text = text.replace("expect(loaded.schemaVersion).toBe(7);", "expect(loaded.schemaVersion).toBe(8);")
    text = text.replace("expect(settings.schemaVersion).toBe(7);", "expect(settings.schemaVersion).toBe(8);")
    write(path, text)

settings_test = "packages/obsidian/tests/settings.test.ts"
replace_once(
    settings_test,
    '''    expect(loadSettings({ indentSize: 20 }).indentSize).toBe(4);\n  });\n\n''',
    '''    expect(loadSettings({ indentSize: 20 }).indentSize).toBe(4);\n  });\n\n  it("loads block presentation defaults safely from old and partial settings", () => {\n    expect(loadSettings({ schemaVersion: 7 }).blockPresentation).toEqual({\n      text: { alignment: "left", flow: "ragged" },\n      markdown: { alignment: "left", flow: "ragged" },\n    });\n    expect(\n      loadSettings({\n        schemaVersion: 8,\n        blockPresentation: {\n          text: { alignment: "center", flow: "justified" },\n          markdown: { alignment: "sideways", flow: "dense" },\n        },\n      }).blockPresentation,\n    ).toEqual({\n      text: { alignment: "center", flow: "justified" },\n      markdown: { alignment: "left", flow: "ragged" },\n    });\n  });\n\n''',
)

# Blocks offsets
replace_once(
    "packages/obsidian/tests/blocks.test.ts",
    '''    expect(block?.language).toBe("csharp");\n    expect(source.slice(block?.from, block?.to)).toBe("var value = 1;\\n");\n''',
    '''    expect(block?.language).toBe("csharp");\n    expect(source.slice(block?.languageFrom, block?.languageTo)).toBe("csharp");\n    expect(source.slice(block?.from, block?.to)).toBe("var value = 1;\\n");\n''',
)

# Reading tests: Text variants and Markdown presentation
reading_test = "packages/obsidian/tests/reading.test.ts"
replace_once(
    reading_test,
    '''    expect(container.querySelector(".syntax-language-badge")).toBeNull();\n    expect(container.querySelector(".has-line-numbers")).toBeNull();\n''',
    '''    expect(container.querySelector(".syntax-language-badge")).toBeNull();\n    expect(container.querySelector(".has-line-numbers")).toBeNull();\n    expect(container.querySelector(".syntax-presentational")).not.toBeNull();\n    expect(container.querySelector(".syntax-presentation-family-text")).not.toBeNull();\n''',
)
insert_reading_before_bash = '''  it("keeps the exact Bash command source while exposing callable and operator semantics", () => {\n'''
new_reading_tests = r'''  it("propagates explicit Text presentation modifiers without restoring code furniture", () => {
    const language = commonLanguageByFence("text")!;
    const container = document.createElement("div");
    renderCommonCode(
      "alpha beta gamma",
      container,
      language,
      true,
      "text-right-justified",
    );

    const frame = container.querySelector(".syntax-highlight-frame");
    expect(frame?.classList.contains("syntax-presentation-family-text")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-align-right")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-flow-justified")).toBe(true);
    expect(container.querySelector(".syntax-language-badge")).toBeNull();
    expect(container.querySelector(".has-line-numbers")).toBeNull();
  });

  it("treats Markdown as presentational while retaining Markdown syntax tokens", () => {
    const language = commonLanguageByFence("markdown")!;
    const container = document.createElement("div");
    renderCommonCode(
      "# Heading\n**bold**",
      container,
      language,
      true,
      "markdown-center-ragged",
    );

    const frame = container.querySelector(".syntax-highlight-frame");
    expect(frame?.classList.contains("syntax-presentation-family-markdown")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-align-center")).toBe(true);
    expect(frame?.classList.contains("syntax-presentation-flow-ragged")).toBe(true);
    expect(container.querySelector(".syntax-language-badge")).toBeNull();
    expect(container.querySelector(".has-line-numbers")).toBeNull();
    expect(container.querySelector('[class*="syntax-common-"]')).not.toBeNull();
  });

'''
replace_once(reading_test, insert_reading_before_bash, new_reading_tests + insert_reading_before_bash)

# Editor tests: presentation line decorations and Markdown furniture
editor_test = "packages/obsidian/tests/plain-text-editor.test.ts"
replace_once(
    editor_test,
    '''  it("keeps line-number widgets for actual code blocks", () => {\n''',
    r'''  it("adds presentational line classes only to Text body lines", () => {
    const source = "before\n```text-right-justified\none two three\nfour five six\n```\nafter";
    const state = EditorState.create({ doc: source });
    const view = { state } as EditorView;
    const decorations = buildSyntaxDecorations(view, registry(), true);
    const lineClasses: Array<{ position: number; className: string }> = [];
    decorations.between(0, state.doc.length, (from, to, decoration) => {
      const attributes = (decoration.spec as { attributes?: { class?: string } }).attributes;
      if (from === to && attributes?.class?.includes("syntax-presentational")) {
        lineClasses.push({ position: from, className: attributes.class });
      }
    });

    expect(lineClasses).toHaveLength(2);
    expect(lineClasses.every(({ className }) =>
      className.includes("syntax-presentation-family-text") &&
      className.includes("syntax-presentation-align-right") &&
      className.includes("syntax-presentation-flow-justified")
    )).toBe(true);
  });

  it("suppresses line-number widgets for Markdown while keeping code languages unchanged", () => {
    expect(widgetCount("```markdown\n# one\n## two\n```", true)).toBe(0);
    expect(widgetCount("```md-right-ragged\n# one\n## two\n```", true)).toBe(0);
    expect(widgetCount("```powershell\nGet-ChildItem\nWrite-Host hi\n```", true)).toBe(2);
  });

  it("keeps line-number widgets for actual code blocks", () => {
''',
)

# Common-language catalog capabilities
common_test = "packages/obsidian/tests/common-languages.test.ts"
replace_once(
    common_test,
    '''  it("models Text as a parserless Markdown-block language", () => {\n''',
    r'''  it("marks Markdown and Text as presentational families", () => {
    const markdown = commonLanguageByFence("markdown");
    expect(markdown?.support).toBeDefined();
    expect(markdown?.presentation).toEqual({
      badge: false,
      lineNumbers: false,
      family: "markdown",
    });

    const text = commonLanguageByFence("text");
    expect(text?.presentation).toEqual({
      badge: false,
      lineNumbers: false,
      family: "text",
    });
  });

  it("models Text as a parserless Markdown-block language", () => {
''',
)

# Theme CSS integration regression
theme_test = "packages/obsidian/tests/theme-compat.test.ts"
replace_once(
    theme_test,
    '''  it("keeps syntax presets scoped to settings previews", () => {\n''',
    r'''  it("emits live Text and Markdown presentation defaults", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.blockPresentation.text = { alignment: "center", flow: "ragged" };
    settings.blockPresentation.markdown = { alignment: "right", flow: "justified" };
    const css = buildThemeCss(settings);

    expect(css).toContain(
      ".syntax-presentation-family-text{--syntax-presentation-alignment:center;",
    );
    expect(css).toContain(
      ".syntax-presentation-family-markdown{--syntax-presentation-alignment:right;--syntax-presentation-text-align:justify;",
    );
  });

  it("keeps syntax presets scoped to settings previews", () => {
''',
)

# ---------------------------------------------------------------------------
# Persistent documentation
# ---------------------------------------------------------------------------
changelog = read("CHANGELOG.md")
needle = '''- Treat `text`, `plaintext`, and `txt` Markdown fences as parserless common\n  blocks so they use the same active-vault theme and contrast policy without\n  inventing syntax categories or claiming `.txt` files from Obsidian's normal\n  file handling. Text deliberately suppresses code-only furniture: no language\n  badge and no line numbers in Reading view or Markdown editing.\n'''
if needle not in changelog:
    raise RuntimeError("CHANGELOG Text paragraph not found")
replacement = needle + '''- Add configurable Text/Markdown block presentation: left/center/right alignment\n  plus Ragged/Justified flow, per-block hyphen modifiers, presentation-preserving\n  vault rewrites when defaults change, and code-furniture suppression for Markdown\n  while retaining its syntax highlighting.\n'''
write("CHANGELOG.md", changelog.replace(needle, replacement, 1))

theme_doc = read("docs/theme-integration.md")
old_theme = '''The `text`, `plaintext`, and `txt` Markdown fences are deliberately parserless.\nThey use the same common block renderer, active-theme bridge, and contrast policy\nas parser-backed common languages, but the whole body stays `syntax-common-plain`.\nThey deliberately opt out of code-only furniture: no language badge and no line\nnumbers are rendered in Reading view, and the Markdown editor does not inject its\nline-number widgets for them even when line numbers are enabled globally. Editing\nview still marks each non-empty plain-text line with the same semantic class so a\nText block does not acquire fake syntax categories merely to participate in\ntheming. These aliases are block-only and do not claim `.txt` files from Obsidian's\nnormal file handling.\n'''
new_theme = '''The `text`, `plaintext`, and `txt` Markdown fences are deliberately parserless.\nThey use the same active-theme bridge and contrast policy as parser-backed common\nlanguages, but the whole body stays `syntax-common-plain`. Text and Markdown are\nnow *presentational families*: both omit code-only furniture (language badge and\nplugin line numbers), while Markdown keeps its normal syntax highlighting. Text\nremains block-only and does not claim `.txt`; Markdown keeps Obsidian's native\n`.md` editor.\n\nEach family has vault defaults for `left`, `center`, or `right` alignment and for\n`ragged` or `justified` flow. Missing fence modifiers inherit those defaults. A\nblock may override either dimension or both using the canonical\n`base-alignment-flow` order, for example `text-right-justified`, `text-center`,\n`markdown-ragged`, or `md-center-ragged`. Justified flow stretches visually\nwrapped lines and uses the selected alignment for the last line; Ragged uses the\nselected alignment directly. The source remains unchanged except when the user\nexplicitly chooses to preserve old appearance while changing a vault default, in\nwhich case only affected opening fence labels are rewritten to a fully explicit\nform.\n'''
if old_theme not in theme_doc:
    raise RuntimeError("theme-integration Text paragraph not found")
write("docs/theme-integration.md", theme_doc.replace(old_theme, new_theme, 1))

readme = read("packages/obsidian/README.md")
old_readme = '''Parserless `text`, `plaintext`, and `txt` Markdown fences use the same active-theme\nbridge and contrast normalization without inventing syntax categories. They are\npresented as text rather than code furniture: no language badge and no plugin line\nnumbers in Reading view or Markdown editing. The aliases remain Markdown-block\nonly and do not claim `.txt` files. No community theme is hardcoded. See\n[`docs/theme-integration.md`](../../docs/theme-integration.md) for the bridge and\nvault-level override variables.\n'''
new_readme = '''Parserless `text`, `plaintext`, and `txt` Markdown fences use the same active-theme\nbridge and contrast normalization without inventing syntax categories. Text and\nMarkdown are presentational families: neither shows a language badge nor plugin\nline numbers, while Markdown retains syntax highlighting. Each family has vault\ndefaults for left/center/right alignment and Ragged/Justified flow; hyphen\nmodifiers such as `text-right-justified` or `markdown-center-ragged` override a\nsingle block. Changing a default can either update inherited blocks or preserve\ntheir current appearance by rewriting only affected opening fences explicitly.\nText remains Markdown-block only and does not claim `.txt` files. No community\ntheme is hardcoded. See [`docs/theme-integration.md`](../../docs/theme-integration.md)\nfor the bridge and vault-level override variables.\n'''
if old_readme not in readme:
    raise RuntimeError("README presentation paragraph not found")
write("packages/obsidian/README.md", readme.replace(old_readme, new_readme, 1))

# Update manual check paragraph if present.
readme = read("packages/obsidian/README.md")
readme = readme.replace(
    '''After reloading Obsidian, verify Bash, Nushell, PowerShell, and `text` fences under\nthe active vault theme. Text blocks should keep literal content unclassified, meet\nthe same contrast policy, and show neither a language badge nor line numbers.\nPowerShell should resolve the `powershell`, `pwsh`, and `ps1` fences and open\n`.ps1`, `.psm1`, and `.psd1` source files with the common CodeMirror theme bridge.\n''',
    '''After reloading Obsidian, verify Bash, Nushell, PowerShell, Text, and Markdown\nfences under the active vault theme. Text/Markdown should show neither a language\nbadge nor plugin line numbers; check inherited alignment/flow plus explicit forms\nsuch as `text-right-justified` and `markdown-center-ragged`. Markdown must retain\nsyntax highlighting. PowerShell should resolve the `powershell`, `pwsh`, and `ps1`\nfences and open `.ps1`, `.psm1`, and `.psd1` source files with the common\nCodeMirror theme bridge.\n''',
)
write("packages/obsidian/README.md", readme)

# Remove the temporary patch machinery from the final implementation commit.
(ROOT / "scripts/.tmp-apply-text-markdown-presentation.py").unlink()
(ROOT / ".github/workflows/.tmp-apply-text-markdown-presentation.yml").unlink()
