import type { Extension } from "@codemirror/state";
import { ViewPlugin, type EditorView } from "@codemirror/view";

import { commonFenceNames } from "./block-presentation";
import {
  registerLivePreviewDiagnosticView,
  traceHostDiagnostic,
  traceRenderedHostObservations,
} from "./_tmp-host-diagnostics";
import type { LanguageRegistry } from "./languages";
import {
  READING_PROCESSED_ATTRIBUTE,
  collectUnprocessedRenderedCodeBlocks,
  renderResolvedFence,
  replaceRenderedCodeBlockCandidate,
  type RenderedCodeBlockCandidate,
} from "./reading-host";
import type { SyntaxPluginSettings } from "./settings";

export const LIVE_PREVIEW_HOST_ATTRIBUTE = "data-syntax-live-preview-host";

export type LivePreviewFenceHandler = (
  source: string,
  element: HTMLElement,
  fence: string,
) => boolean;

function embeddedRoots(root: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  if (root.matches(".cm-embed-block")) result.push(root);
  root.querySelectorAll<HTMLElement>(".cm-embed-block").forEach((element) => {
    result.push(element);
  });
  return result;
}

export function collectLivePreviewRenderedCodeBlocks(
  root: HTMLElement,
): RenderedCodeBlockCandidate[] {
  const seen = new Set<HTMLPreElement>();
  const result: RenderedCodeBlockCandidate[] = [];
  for (const embedded of embeddedRoots(root)) {
    for (const candidate of collectUnprocessedRenderedCodeBlocks(embedded)) {
      if (seen.has(candidate.pre)) continue;
      seen.add(candidate.pre);
      result.push(candidate);
    }
  }
  return result;
}

export class LivePreviewRenderedBlockBridge {
  private observer?: MutationObserver;
  private scheduledFrame?: number;

  constructor(
    private readonly root: HTMLElement,
    private readonly handleFence: LivePreviewFenceHandler,
  ) {}

  start(): void {
    if (this.observer !== undefined) return;
    this.observer = new MutationObserver(() => this.scheduleScan());
    this.observer.observe(this.root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    this.scan();
  }

  scan(): void {
    traceRenderedHostObservations("live-preview-rendered", this.root);
    const candidates = collectLivePreviewRenderedCodeBlocks(this.root);
    for (const candidate of candidates) this.process(candidate);
  }

  scheduleScan(): void {
    if (this.scheduledFrame !== undefined) return;
    this.scheduledFrame = window.requestAnimationFrame(() => {
      this.scheduledFrame = undefined;
      this.scan();
    });
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    if (this.scheduledFrame !== undefined) {
      window.cancelAnimationFrame(this.scheduledFrame);
      this.scheduledFrame = undefined;
    }
  }

  private process(candidate: RenderedCodeBlockCandidate): void {
    if (!this.root.contains(candidate.pre)) return;
    const host = document.createElement("div");
    host.setAttribute(LIVE_PREVIEW_HOST_ATTRIBUTE, "true");
    let handled: boolean;
    try {
      handled = this.handleFence(candidate.source, host, candidate.fence);
    } catch (error) {
      console.error(
        `[Syntax Highlight] Live Preview bridge failed for ${candidate.fence}.`,
        error,
      );
      return;
    }
    if (!handled) return;
    traceHostDiagnostic(
      "live-preview-rendered",
      candidate.fence,
      candidate.source,
      candidate.pre,
    );
    host.setAttribute(READING_PROCESSED_ATTRIBUTE, "true");
    replaceRenderedCodeBlockCandidate(candidate, host);
  }
}

export function createLivePreviewEmbeddedBlockExtension(
  registry: LanguageRegistry,
  getSettings: () => SyntaxPluginSettings,
): Extension {
  const acceptedFences = (): ReadonlySet<string> =>
    new Set(
      [
        ...registry.enabled().flatMap(({ descriptor }) => descriptor.fences),
        ...commonFenceNames(),
      ].map((fence) => fence.toLocaleLowerCase()),
    );

  return ViewPlugin.fromClass(
    class {
      private readonly bridge: LivePreviewRenderedBlockBridge;
      private readonly unregisterDiagnostics: () => void;

      constructor(view: EditorView) {
        this.unregisterDiagnostics = registerLivePreviewDiagnosticView(
          view,
          acceptedFences,
        );
        this.bridge = new LivePreviewRenderedBlockBridge(
          view.dom,
          (source, element, fence) => {
            const settings = getSettings();
            if (!settings.markdownEditor) return false;
            return renderResolvedFence(registry, settings, source, element, fence);
          },
        );
        this.bridge.start();
      }

      destroy(): void {
        this.unregisterDiagnostics();
        this.bridge.dispose();
      }
    },
  );
}
