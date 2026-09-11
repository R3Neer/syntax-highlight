import type { EditorView } from "@codemirror/view";

import { findCodeBlocks, type MudCodeBlock } from "./blocks";

export type HostDiagnosticPath =
  | "reading-specialized"
  | "reading-fallback"
  | "live-preview-rendered"
  | "live-preview-source";

export type HostDiagnosticPhase = "observed" | "claimed" | "rendered";

export interface HostDiagnosticElementSnapshot {
  tag: string;
  classes: string[];
  attributes: Record<string, string>;
}

export interface HostDiagnosticSourceBlock {
  openingLine: number;
  quoteDepth: number;
  from: number;
  to: number;
  bodyLines: Array<{
    lineFrom: number;
    lineTo: number;
    sourceFrom: number;
    sourceTo: number;
  }>;
}

export interface HostDiagnosticEvent {
  timestamp: number;
  phase: HostDiagnosticPhase;
  path: HostDiagnosticPath;
  fence: string;
  source: string;
  element: HostDiagnosticElementSnapshot;
  ancestors: HostDiagnosticElementSnapshot[];
  pre?: HostDiagnosticElementSnapshot;
  code?: HostDiagnosticElementSnapshot;
  auxiliaryChildren: HostDiagnosticElementSnapshot[];
  cmLines: Array<HostDiagnosticElementSnapshot & { text: string }>;
  block?: HostDiagnosticSourceBlock;
}

export interface HostDiagnosticComputedStyle {
  display?: string;
  visibility?: string;
  position?: string;
  color?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  textAlign?: string;
  whiteSpace?: string;
  borderRadius?: string;
  paddingLeft?: string;
  paddingRight?: string;
  left?: string;
  right?: string;
  styleError?: true;
}

export interface HostDiagnosticStyledElementSnapshot
  extends HostDiagnosticElementSnapshot {
  text: string;
  connected: boolean;
  style: HostDiagnosticComputedStyle;
  isViewDom?: boolean;
}

export interface LivePreviewFenceSnapshot {
  language: string;
  quoteDepth: number;
  openingLine: number;
  openingLineFrom: number;
  closingLineFrom?: number;
  bodyLines: Array<{
    lineFrom: number;
    lineTo: number;
    sourceFrom: number;
    sourceTo: number;
  }>;
}

export interface LivePreviewLineRole {
  role: "opening" | "body" | "closing" | "outside";
  language?: string;
  quoteDepth?: number;
  bodyIndex?: number;
}

export interface LivePreviewLineSnapshot {
  documentPosition?: number;
  documentLine?: number;
  documentLineFrom?: number;
  documentText?: string;
  mappingError?: true;
  role?: LivePreviewLineRole;
  element: HostDiagnosticStyledElementSnapshot;
  ancestors: HostDiagnosticStyledElementSnapshot[];
  descendants: HostDiagnosticStyledElementSnapshot[];
  descendantsTruncated: boolean;
  snapshotError?: true;
}

export interface LivePreviewEmbeddedSnapshot {
  element: HostDiagnosticStyledElementSnapshot;
  ancestors: HostDiagnosticStyledElementSnapshot[];
  descendants: HostDiagnosticStyledElementSnapshot[];
  descendantsTruncated: boolean;
  contains: {
    callout: boolean;
    pre: boolean;
    code: boolean;
    cmLine: boolean;
    syntaxClass: boolean;
    inlineCode: boolean;
    hyperMdCodeblock: boolean;
  };
  snapshotError?: true;
}

export interface LivePreviewPostFrameCapture {
  timestamp: number;
  viewId: number;
  hasFocus?: boolean;
  connected?: boolean;
  selection?: { anchor: number; head: number };
  viewport?: { from: number; to: number };
  documentLength?: number;
  fences?: LivePreviewFenceSnapshot[];
  lines?: LivePreviewLineSnapshot[];
  linesTruncated?: boolean;
  embeddedHosts?: LivePreviewEmbeddedSnapshot[];
  captureError?: true;
}

export interface HostDiagnosticsController {
  readonly version: number;
  enabled: boolean;
  readonly events: HostDiagnosticEvent[];
  readonly postFrameCaptures: LivePreviewPostFrameCapture[];
  enable(): void;
  disable(): void;
  clear(): void;
  dump(): string;
  dumpLivePreview(): string;
  captureLivePreview(): Promise<LivePreviewPostFrameCapture[]>;
}

type AcceptedFencesProvider = () => ReadonlySet<string>;

interface RegisteredLivePreviewView {
  id: number;
  view: EditorView;
  acceptedFences: AcceptedFencesProvider;
}

const GLOBAL_KEY = "SyntaxHighlightHostDiagnostics";
const DIAGNOSTICS_VERSION = 2;
const MAX_EVENTS = 250;
const MAX_CM_LINES = 80;
const MAX_POST_FRAME_CAPTURES = 20;
const MAX_POST_FRAME_LINES = 120;
const MAX_LINE_DESCENDANTS = 80;
const MAX_EMBEDDED_DESCENDANTS = 160;
const MAX_TEXT = 240;
const MAX_ANCESTORS = 14;

const registeredLivePreviewViews = new Map<number, RegisteredLivePreviewView>();
let nextLivePreviewViewId = 1;
let installedController: HostDiagnosticsController | undefined;

function snapshotElement(element: Element): HostDiagnosticElementSnapshot {
  return {
    tag: element.tagName,
    classes: [...element.classList],
    attributes: Object.fromEntries(
      [...element.attributes].map(({ name, value }) => [name, value]),
    ),
  };
}

function snapshotAncestors(element: Element): HostDiagnosticElementSnapshot[] {
  const result: HostDiagnosticElementSnapshot[] = [];
  let current = element.parentElement;
  while (current !== null && result.length < 10) {
    result.push(snapshotElement(current));
    current = current.parentElement;
  }
  return result;
}

function firstPre(element: Element): HTMLPreElement | undefined {
  if (element instanceof HTMLPreElement) return element;
  const found = element.querySelector("pre");
  return found instanceof HTMLPreElement ? found : undefined;
}

function directCode(pre: HTMLPreElement | undefined): HTMLElement | undefined {
  if (pre === undefined) return undefined;
  const codes = [...pre.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName === "CODE",
  );
  return codes.length === 1 ? codes[0] : undefined;
}

function languageClasses(element: Element): string[] {
  return [...element.classList]
    .filter((className) => className.startsWith("language-"))
    .map((className) => className.slice("language-".length).toLocaleLowerCase())
    .filter(Boolean);
}

function observedFence(pre: HTMLPreElement): string {
  const fences = new Set(languageClasses(pre));
  for (const child of pre.children) {
    if (child.tagName !== "CODE") continue;
    languageClasses(child).forEach((fence) => fences.add(fence));
  }
  if (fences.size === 0) return "<none>";
  return fences.size === 1
    ? [...fences][0]!
    : `<ambiguous:${[...fences].sort().join(",")}>`;
}

function observedSource(pre: HTMLPreElement): string {
  const codes = [...pre.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName === "CODE",
  );
  if (codes.length !== 1) return pre.textContent ?? "";
  return codes[0]!.textContent ?? "";
}

function snapshotCmLines(
  root: Element,
): Array<HostDiagnosticElementSnapshot & { text: string }> {
  return [...root.querySelectorAll<HTMLElement>(".cm-line")]
    .slice(0, MAX_CM_LINES)
    .map((line) => ({
      ...snapshotElement(line),
      text: line.textContent ?? "",
    }));
}

function truncateText(value: string): string {
  return value.length <= MAX_TEXT ? value : `${value.slice(0, MAX_TEXT)}…`;
}

function keepDiagnosticAttribute(name: string): boolean {
  return (
    name === "class" ||
    name === "style" ||
    name === "contenteditable" ||
    name === "role" ||
    name === "tabindex" ||
    name === "spellcheck" ||
    name === "data-line-number" ||
    name === "data-source-line" ||
    name === "data-language" ||
    name.startsWith("data-syntax-") ||
    name.startsWith("data-callout") ||
    name.startsWith("aria-")
  );
}

function filteredAttributes(element: Element): Record<string, string> {
  return Object.fromEntries(
    [...element.attributes]
      .filter(({ name }) => keepDiagnosticAttribute(name))
      .map(({ name, value }) => [name, truncateText(value)]),
  );
}

function computedStyleSnapshot(element: Element): HostDiagnosticComputedStyle {
  try {
    const style = getComputedStyle(element);
    return {
      display: style.display,
      visibility: style.visibility,
      position: style.position,
      color: style.color,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      textAlign: style.textAlign,
      whiteSpace: style.whiteSpace,
      borderRadius: style.borderRadius,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      left: style.left,
      right: style.right,
    };
  } catch {
    return { styleError: true };
  }
}

function styledElementSnapshot(
  element: Element,
  viewDom?: HTMLElement,
): HostDiagnosticStyledElementSnapshot {
  return {
    tag: element.tagName,
    classes: [...element.classList],
    attributes: filteredAttributes(element),
    text: truncateText(element.textContent ?? ""),
    connected: element.isConnected,
    style: computedStyleSnapshot(element),
    isViewDom: viewDom === element ? true : undefined,
  };
}

function styledAncestors(
  element: Element,
  viewDom: HTMLElement,
): HostDiagnosticStyledElementSnapshot[] {
  const result: HostDiagnosticStyledElementSnapshot[] = [];
  let current = element.parentElement;
  while (current !== null && result.length < MAX_ANCESTORS) {
    result.push(styledElementSnapshot(current, viewDom));
    current = current.parentElement;
  }
  return result;
}

function isRelevantDescendant(element: HTMLElement): boolean {
  if (["SPAN", "CODE", "PRE", "BUTTON"].includes(element.tagName)) return true;
  return [...element.classList].some(
    (className) =>
      className.startsWith("syntax-") ||
      className.startsWith("cm-") ||
      className.startsWith("HyperMD-") ||
      className === "token" ||
      className.startsWith("token-"),
  );
}

function relevantDescendants(
  root: Element,
  viewDom: HTMLElement,
  limit: number,
): {
  elements: HostDiagnosticStyledElementSnapshot[];
  truncated: boolean;
} {
  try {
    const candidates = [...root.querySelectorAll<HTMLElement>("*")]
      .filter(isRelevantDescendant);
    return {
      elements: candidates
        .slice(0, limit)
        .map((element) => styledElementSnapshot(element, viewDom)),
      truncated: candidates.length > limit,
    };
  } catch {
    return { elements: [], truncated: false };
  }
}

function fenceSnapshot(block: MudCodeBlock): LivePreviewFenceSnapshot {
  return {
    language: block.language,
    quoteDepth: block.quoteDepth,
    openingLine: block.openingLine,
    openingLineFrom: block.openingLineFrom,
    closingLineFrom: block.closingLineFrom,
    bodyLines: block.bodyLines.map(({ lineFrom, lineTo, sourceFrom, sourceTo }) => ({
      lineFrom,
      lineTo,
      sourceFrom,
      sourceTo,
    })),
  };
}

function lineRole(
  lineFrom: number,
  blocks: readonly MudCodeBlock[],
): LivePreviewLineRole {
  for (const block of blocks) {
    if (block.openingLineFrom === lineFrom) {
      return {
        role: "opening",
        language: block.language,
        quoteDepth: block.quoteDepth,
      };
    }
    if (block.closingLineFrom === lineFrom) {
      return {
        role: "closing",
        language: block.language,
        quoteDepth: block.quoteDepth,
      };
    }
    const bodyIndex = block.bodyLines.findIndex((line) => line.lineFrom === lineFrom);
    if (bodyIndex >= 0) {
      return {
        role: "body",
        language: block.language,
        quoteDepth: block.quoteDepth,
        bodyIndex,
      };
    }
  }
  return { role: "outside" };
}

function captureLine(
  view: EditorView,
  line: HTMLElement,
  blocks: readonly MudCodeBlock[],
): LivePreviewLineSnapshot {
  const descendants = relevantDescendants(line, view.dom, MAX_LINE_DESCENDANTS);
  const result: LivePreviewLineSnapshot = {
    element: styledElementSnapshot(line, view.dom),
    ancestors: styledAncestors(line, view.dom),
    descendants: descendants.elements,
    descendantsTruncated: descendants.truncated,
  };

  try {
    const position = view.posAtDOM(line, 0);
    const safePosition = Math.min(Math.max(position, 0), view.state.doc.length);
    const documentLine = view.state.doc.lineAt(safePosition);
    result.documentPosition = position;
    result.documentLine = documentLine.number;
    result.documentLineFrom = documentLine.from;
    result.documentText = truncateText(documentLine.text);
    result.role = lineRole(documentLine.from, blocks);
  } catch {
    result.mappingError = true;
  }

  return result;
}

function containsClassPrefix(root: Element, prefix: string): boolean {
  if ([...root.classList].some((className) => className.startsWith(prefix))) {
    return true;
  }
  return [...root.querySelectorAll<HTMLElement>("[class]")].some((element) =>
    [...element.classList].some((className) => className.startsWith(prefix)),
  );
}

function captureEmbeddedHost(
  view: EditorView,
  host: HTMLElement,
): LivePreviewEmbeddedSnapshot {
  const descendants = relevantDescendants(
    host,
    view.dom,
    MAX_EMBEDDED_DESCENDANTS,
  );
  return {
    element: styledElementSnapshot(host, view.dom),
    ancestors: styledAncestors(host, view.dom),
    descendants: descendants.elements,
    descendantsTruncated: descendants.truncated,
    contains: {
      callout: host.matches(".cm-callout") || host.querySelector(".cm-callout") !== null,
      pre: host.matches("pre") || host.querySelector("pre") !== null,
      code: host.matches("code") || host.querySelector("code") !== null,
      cmLine: host.matches(".cm-line") || host.querySelector(".cm-line") !== null,
      syntaxClass: containsClassPrefix(host, "syntax-"),
      inlineCode:
        host.matches(".cm-inline-code") || host.querySelector(".cm-inline-code") !== null,
      hyperMdCodeblock: containsClassPrefix(host, "HyperMD-codeblock"),
    },
  };
}

function captureLivePreviewView(
  registration: RegisteredLivePreviewView,
): LivePreviewPostFrameCapture {
  const { id, view } = registration;
  let base: LivePreviewPostFrameCapture;

  try {
    const selection = view.state.selection.main;
    base = {
      timestamp: Date.now(),
      viewId: id,
      hasFocus: view.hasFocus,
      connected: view.dom.isConnected,
      selection: { anchor: selection.anchor, head: selection.head },
      viewport: { from: view.viewport.from, to: view.viewport.to },
      documentLength: view.state.doc.length,
      fences: [],
      lines: [],
      linesTruncated: false,
      embeddedHosts: [],
    };
  } catch {
    return {
      timestamp: Date.now(),
      viewId: id,
      captureError: true,
    };
  }

  try {
    const source = view.state.doc.toString();
    const blocks = findCodeBlocks(source, registration.acceptedFences());
    base.fences = blocks.map(fenceSnapshot);

    const lines = [...view.dom.querySelectorAll<HTMLElement>(".cm-line")];
    base.linesTruncated = lines.length > MAX_POST_FRAME_LINES;
    base.lines = lines
      .slice(0, MAX_POST_FRAME_LINES)
      .map((line) => captureLine(view, line, blocks));

    base.embeddedHosts = [
      ...view.dom.querySelectorAll<HTMLElement>(".cm-embed-block"),
    ].map((host) => {
      try {
        return captureEmbeddedHost(view, host);
      } catch {
        return {
          element: styledElementSnapshot(host, view.dom),
          ancestors: [],
          descendants: [],
          descendantsTruncated: false,
          contains: {
            callout: false,
            pre: false,
            code: false,
            cmLine: false,
            syntaxClass: false,
            inlineCode: false,
            hyperMdCodeblock: false,
          },
          snapshotError: true,
        };
      }
    });
  } catch {
    base.captureError = true;
  }

  return base;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function createController(): HostDiagnosticsController {
  const events: HostDiagnosticEvent[] = [];
  const postFrameCaptures: LivePreviewPostFrameCapture[] = [];
  return {
    version: DIAGNOSTICS_VERSION,
    enabled: false,
    events,
    postFrameCaptures,
    enable() {
      this.enabled = true;
    },
    disable() {
      this.enabled = false;
    },
    clear() {
      events.length = 0;
      postFrameCaptures.length = 0;
    },
    dump() {
      return JSON.stringify(events, null, 2);
    },
    dumpLivePreview() {
      return JSON.stringify(postFrameCaptures, null, 2);
    },
    async captureLivePreview() {
      if (!this.enabled || typeof window === "undefined") return [];
      await nextAnimationFrame();
      await nextAnimationFrame();
      const captures: LivePreviewPostFrameCapture[] = [];
      for (const registration of registeredLivePreviewViews.values()) {
        try {
          captures.push(captureLivePreviewView(registration));
        } catch {
          captures.push({
            timestamp: Date.now(),
            viewId: registration.id,
            captureError: true,
          });
        }
      }
      postFrameCaptures.push(...captures);
      if (postFrameCaptures.length > MAX_POST_FRAME_CAPTURES) {
        postFrameCaptures.splice(
          0,
          postFrameCaptures.length - MAX_POST_FRAME_CAPTURES,
        );
      }
      return captures;
    },
  };
}

function installController(): HostDiagnosticsController | undefined {
  if (typeof window === "undefined") return undefined;
  const controller = createController();
  const target = window as unknown as Record<string, unknown>;
  target[GLOBAL_KEY] = controller;
  installedController = controller;
  return controller;
}

export function hostDiagnosticsController(): HostDiagnosticsController | undefined {
  if (typeof window === "undefined") return undefined;
  if (installedController === undefined) return installController();
  const target = window as unknown as Record<string, unknown>;
  if (target[GLOBAL_KEY] !== installedController) target[GLOBAL_KEY] = installedController;
  return installedController;
}

export function registerLivePreviewDiagnosticView(
  view: EditorView,
  acceptedFences: AcceptedFencesProvider,
): () => void {
  const id = nextLivePreviewViewId;
  nextLivePreviewViewId += 1;
  registeredLivePreviewViews.set(id, { id, view, acceptedFences });
  return () => {
    registeredLivePreviewViews.delete(id);
  };
}

export function traceHostDiagnostic(
  path: HostDiagnosticPath,
  fence: string,
  source: string,
  element: HTMLElement,
  block?: HostDiagnosticSourceBlock,
  phase: HostDiagnosticPhase = "claimed",
): void {
  const controller = hostDiagnosticsController();
  if (controller === undefined || !controller.enabled) return;

  const pre = firstPre(element);
  const code = directCode(pre);
  const auxiliaryChildren =
    pre === undefined
      ? []
      : [...pre.children]
          .filter((child) => child !== code)
          .map((child) => snapshotElement(child));

  controller.events.push({
    timestamp: Date.now(),
    phase,
    path,
    fence: fence.toLocaleLowerCase(),
    source,
    element: snapshotElement(element),
    ancestors: snapshotAncestors(element),
    pre: pre === undefined ? undefined : snapshotElement(pre),
    code: code === undefined ? undefined : snapshotElement(code),
    auxiliaryChildren,
    cmLines: snapshotCmLines(element),
    block,
  });
  if (controller.events.length > MAX_EVENTS) {
    controller.events.splice(0, controller.events.length - MAX_EVENTS);
  }
}

export function traceRenderedHostObservations(
  path: "reading-fallback" | "live-preview-rendered",
  root: HTMLElement,
): void {
  const controller = hostDiagnosticsController();
  if (controller === undefined || !controller.enabled) return;

  const pres = new Set<HTMLPreElement>();
  if (root instanceof HTMLPreElement) pres.add(root);
  root.querySelectorAll("pre").forEach((pre) => {
    if (pre instanceof HTMLPreElement) pres.add(pre);
  });

  for (const pre of pres) {
    traceHostDiagnostic(
      path,
      observedFence(pre),
      observedSource(pre),
      pre,
      undefined,
      "observed",
    );
  }
}

// Reinstall the explicit, inert-by-default DevTools controller on every bundle
// load. Obsidian keeps the window alive across plugin reloads, so reusing the
// previous global object would retain an obsolete schema and stale view hooks.
installController();
