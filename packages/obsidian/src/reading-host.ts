import type {
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
} from "obsidian";

import { commonFenceMatch } from "./block-presentation";
import type { LanguageRegistry } from "./languages";
import { renderCommonCode, renderSyntaxCode } from "./reading";
import type { SyntaxPluginSettings } from "./settings";

export const READING_PROCESSED_ATTRIBUTE = "data-syntax-highlight-processed";
export const READING_FALLBACK_SORT_ORDER = 100;

export type EnableReadingBlockEditing = (
  element: HTMLElement,
  context: MarkdownPostProcessorContext,
  fence: string,
  renderedSource: string,
) => void;

export type ReadingFenceHandler = (
  source: string,
  element: HTMLElement,
  context: MarkdownPostProcessorContext,
  fence: string,
) => boolean;

export interface RenderedCodeBlockCandidate {
  pre: HTMLPreElement;
  code: HTMLElement;
  fence: string;
  source: string;
}

function renderPlainReadingBlock(source: string, element: HTMLElement): void {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = source;
  pre.append(code);
  element.replaceChildren(pre);
}

export function renderReadingFence(
  registry: LanguageRegistry,
  settings: SyntaxPluginSettings,
  source: string,
  element: HTMLElement,
  context: MarkdownPostProcessorContext,
  fence: string,
  enableEditing: EnableReadingBlockEditing,
  claimUnknown = false,
): boolean {
  const normalizedFence = fence.toLocaleLowerCase();
  const runtime = registry.byFence(normalizedFence);
  const common = runtime === undefined ? commonFenceMatch(normalizedFence) : undefined;
  const recognized = runtime !== undefined || common !== undefined;
  if (!recognized && !claimUnknown) return false;

  element.setAttribute(READING_PROCESSED_ATTRIBUTE, "true");
  if (!settings.markdownReading || !recognized) {
    renderPlainReadingBlock(source, element);
  } else if (runtime !== undefined) {
    renderSyntaxCode(source, element, runtime, settings.lineNumbers);
  } else {
    renderCommonCode(
      source,
      element,
      common!.language,
      settings.lineNumbers,
      normalizedFence,
    );
  }
  enableEditing(element, context, normalizedFence, source);
  return true;
}

function exactFenceClass(code: HTMLElement): string | undefined {
  const fences = new Set<string>();
  for (const className of code.classList) {
    if (!className.startsWith("language-")) continue;
    const fence = className.slice("language-".length);
    if (!fence) continue;
    fences.add(fence.toLocaleLowerCase());
  }
  return fences.size === 1 ? [...fences][0] : undefined;
}

function directCodeChild(pre: HTMLPreElement): HTMLElement | undefined {
  const codeChildren = [...pre.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName === "CODE",
  );
  return codeChildren.length === 1 ? codeChildren[0] : undefined;
}

function alreadyProcessed(pre: HTMLPreElement): boolean {
  return (
    pre.closest(`[${READING_PROCESSED_ATTRIBUTE}], .syntax-highlight-frame`) !== null
  );
}

export function collectUnprocessedRenderedCodeBlocks(
  root: HTMLElement,
): RenderedCodeBlockCandidate[] {
  const pres = new Set<HTMLPreElement>();
  if (root instanceof HTMLPreElement) pres.add(root);
  root.querySelectorAll("pre").forEach((pre) => {
    if (pre instanceof HTMLPreElement) pres.add(pre);
  });

  const candidates: RenderedCodeBlockCandidate[] = [];
  for (const pre of pres) {
    if (alreadyProcessed(pre)) continue;
    const code = directCodeChild(pre);
    if (code === undefined) continue;
    const fence = exactFenceClass(code);
    if (fence === undefined) continue;
    candidates.push({
      pre,
      code,
      fence,
      source: code.textContent ?? "",
    });
  }
  return candidates;
}

export function createReadingFallbackPostProcessor(
  handleFence: ReadingFenceHandler,
): MarkdownPostProcessor {
  return (root, context) => {
    // Snapshot before any replacement. Mutating a live DOM collection here can
    // otherwise make later sibling blocks disappear from the iteration.
    const candidates = collectUnprocessedRenderedCodeBlocks(root);
    for (const candidate of candidates) {
      if (candidate.pre.parentNode === null) continue;
      const host = document.createElement("div");
      let handled: boolean;
      try {
        handled = handleFence(
          candidate.source,
          host,
          context,
          candidate.fence,
        );
      } catch (error) {
        // Keep the original code and continue with later blocks. One broken
        // language runtime must not take down the entire preview section.
        console.error(
          `[Syntax Highlight] Reading fallback failed for ${candidate.fence}.`,
          error,
        );
        continue;
      }
      if (!handled) continue;
      host.setAttribute(READING_PROCESSED_ATTRIBUTE, "true");
      candidate.pre.replaceWith(host);
    }
  };
}

export type MarkdownPostProcessorRegistrar = (
  processor: MarkdownPostProcessor,
  sortOrder?: number,
) => MarkdownPostProcessor;

export function registerReadingFallbackPostProcessor(
  register: MarkdownPostProcessorRegistrar,
  handleFence: ReadingFenceHandler,
): MarkdownPostProcessor {
  const processor = createReadingFallbackPostProcessor(handleFence);
  // Keep the metadata and, critically, pass the documented sort-order argument
  // to Obsidian. Setting the property only after registration is too late to be
  // a reliable host-ordering contract.
  processor.sortOrder = READING_FALLBACK_SORT_ORDER;
  return register(processor, READING_FALLBACK_SORT_ORDER);
}
