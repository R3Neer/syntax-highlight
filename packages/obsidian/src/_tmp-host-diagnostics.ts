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

export interface HostDiagnosticsController {
  enabled: boolean;
  readonly events: HostDiagnosticEvent[];
  enable(): void;
  disable(): void;
  clear(): void;
  dump(): string;
}

const GLOBAL_KEY = "SyntaxHighlightHostDiagnostics";
const MAX_EVENTS = 250;
const MAX_CM_LINES = 80;

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

function createController(): HostDiagnosticsController {
  const events: HostDiagnosticEvent[] = [];
  return {
    enabled: false,
    events,
    enable() {
      this.enabled = true;
    },
    disable() {
      this.enabled = false;
    },
    clear() {
      events.length = 0;
    },
    dump() {
      return JSON.stringify(events, null, 2);
    },
  };
}

export function hostDiagnosticsController(): HostDiagnosticsController | undefined {
  if (typeof window === "undefined") return undefined;
  const target = window as unknown as Record<string, unknown>;
  const current = target[GLOBAL_KEY];
  if (current !== undefined) return current as HostDiagnosticsController;
  const controller = createController();
  target[GLOBAL_KEY] = controller;
  return controller;
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

// Install the explicit, inert-by-default DevTools controller as soon as this
// temporary diagnostics module is loaded by the development build.
hostDiagnosticsController();
