import type {
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
} from "obsidian";

import { commonFenceMatch } from "./block-presentation";
import type { LanguageRegistry } from "./languages";
import { renderCommonCode, renderSyntaxCode } from "./reading";
import {
  RENDERED_PROCESSED_ATTRIBUTE,
  collectUnprocessedRenderedCodeBlocks,
  replaceRenderedCodeBlockCandidate,
} from "./rendered-code-candidate";
import type { SyntaxPluginSettings } from "./settings";

export const READING_PROCESSED_ATTRIBUTE = RENDERED_PROCESSED_ATTRIBUTE;
export const READING_FALLBACK_SORT_ORDER = 100;
export {
  collectUnprocessedRenderedCodeBlocks,
  replaceRenderedCodeBlockCandidate,
} from "./rendered-code-candidate";
export type { RenderedCodeBlockCandidate } from "./rendered-code-candidate";

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
  sourceElement?: HTMLElement,
) => boolean;

function renderPlainReadingBlock(source: string, element: HTMLElement): void {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = source;
  pre.append(code);
  element.replaceChildren(pre);
}

export function renderResolvedFence(
  registry: LanguageRegistry,
  settings: SyntaxPluginSettings,
  source: string,
  element: HTMLElement,
  fence: string,
): boolean {
  const normalizedFence = fence.toLocaleLowerCase();
  const runtime = registry.byFence(normalizedFence);
  const common = runtime === undefined ? commonFenceMatch(normalizedFence) : undefined;
  if (runtime === undefined && common === undefined) return false;

  if (runtime !== undefined) {
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
  return true;
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
  highlightEnabled = settings.markdownReading,
): boolean {
  const normalizedFence = fence.toLocaleLowerCase();
  const recognized =
    registry.byFence(normalizedFence) !== undefined ||
    commonFenceMatch(normalizedFence) !== undefined;
  if (!recognized && !claimUnknown) return false;


  element.setAttribute(RENDERED_PROCESSED_ATTRIBUTE, "true");
  if (!highlightEnabled || !recognized) {
    renderPlainReadingBlock(source, element);
  } else {
    renderResolvedFence(registry, settings, source, element, normalizedFence);
  }
  enableEditing(element, context, normalizedFence, source);
  return true;
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
          candidate.pre,
        );
      } catch (error) {
        console.error(
          `[Syntax Highlight] Reading fallback failed for ${candidate.fence}.`,
          error,
        );
        continue;
      }
      if (!handled) continue;
      host.setAttribute(RENDERED_PROCESSED_ATTRIBUTE, "true");
      replaceRenderedCodeBlockCandidate(candidate, host);
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
  processor.sortOrder = READING_FALLBACK_SORT_ORDER;
  return register(processor, READING_FALLBACK_SORT_ORDER);
}
