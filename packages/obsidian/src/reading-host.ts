import type {
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
} from "obsidian";

import {
  traceHostDiagnostic,
  traceRenderedHostObservations,
} from "./_tmp-host-diagnostics";
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
): boolean {
  const normalizedFence = fence.toLocaleLowerCase();
  const recognized =
    registry.byFence(normalizedFence) !== undefined ||
    commonFenceMatch(normalizedFence) !== undefined;
  if (!recognized && !claimUnknown) return false;

  const diagnosticPath = claimUnknown ? "reading-specialized" : "reading-fallback";
  if (claimUnknown) {
    traceHostDiagnostic(
      diagnosticPath,
      normalizedFence,
      source,
      element,
    );
  }

  element.setAttribute(READING_PROCESSED_ATTRIBUTE, "true");
  if (!settings.markdownReading || !recognized) {
    renderPlainReadingBlock(source, element);
  } else {
    renderResolvedFence(registry, settings, source, element, normalizedFence);
  }
  enableEditing(element, context, normalizedFence, source);
  traceHostDiagnostic(
    diagnosticPath,
    normalizedFence,
    source,
    element,
    undefined,
    "rendered",
  );
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

export function replaceRenderedCodeBlockCandidate(
  candidate: RenderedCodeBlockCandidate,
  host: HTMLElement,
): void {
  const auxiliaryChildren = [...candidate.pre.children].filter(
    (child) => child !== candidate.code,
  );
  const renderedPre = host.querySelector("pre");
  if (renderedPre !== null) renderedPre.append(...auxiliaryChildren);
  candidate.pre.replaceWith(host);
}

export function createReadingFallbackPostProcessor(
  handleFence: ReadingFenceHandler,
): MarkdownPostProcessor {
  return (root, context) => {
    traceRenderedHostObservations("reading-fallback", root);
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
        console.error(
          `[Syntax Highlight] Reading fallback failed for ${candidate.fence}.`,
          error,
        );
        continue;
      }
      if (!handled) continue;
      traceHostDiagnostic(
        "reading-fallback",
        candidate.fence,
        candidate.source,
        candidate.pre,
      );
      host.setAttribute(READING_PROCESSED_ATTRIBUTE, "true");
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
