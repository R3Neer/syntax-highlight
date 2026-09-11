import {
  MINIMUM_TEXT_CONTRAST,
  compositeOver,
  ensureContrast,
  parseCssColor,
  toCssColor,
  type RgbaColor,
} from "./contrast";

const COMMON_TOKEN_SELECTOR = [
  ".syntax-common-plain",
  ".syntax-common-comment",
  ".syntax-common-keyword",
  ".syntax-common-type",
  ".syntax-common-variable",
  ".syntax-common-callable",
  ".syntax-common-declaration",
  ".syntax-common-property",
  ".syntax-common-string",
  ".syntax-common-regex",
  ".syntax-common-number",
  ".syntax-common-operator",
  ".syntax-common-delimiter",
  ".syntax-common-punctuation",
  ".syntax-common-meta",
].join(",");

const OWNED_FRAME_SELECTOR = ".syntax-highlight-frame";
const ADJUSTED_ATTRIBUTE = "data-syntax-contrast-adjusted";
const OPAQUE_EPSILON = 0.999;
const resolvedColorCache = new Map<string, RgbaColor | undefined>();

interface InlineColor {
  value: string;
  priority: string;
}

function resolveCssColor(value: string): RgbaColor | undefined {
  const direct = parseCssColor(value);
  if (direct !== undefined) return direct;
  if (resolvedColorCache.has(value)) return resolvedColorCache.get(value);

  // Computed styles in current Chromium usually serialize to rgb()/rgba(), but
  // CSS Color 4 permits resolved values such as oklab(), oklch() and color().
  // Let the browser convert those to the canvas' sRGB pixel space rather than
  // maintaining our own ever-growing parser for every CSS color syntax.
  let resolved: RgbaColor | undefined;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context !== null) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      resolved = {
        r: (pixel[0] ?? 0) / 255,
        g: (pixel[1] ?? 0) / 255,
        b: (pixel[2] ?? 0) / 255,
        a: (pixel[3] ?? 0) / 255,
      };
    }
  } catch {
    resolved = undefined;
  }
  resolvedColorCache.set(value, resolved);
  return resolved;
}

function effectiveBackground(element: Element): RgbaColor {
  let result: RgbaColor = { r: 0, g: 0, b: 0, a: 0 };
  let current: Element | null = element;

  while (current !== null) {
    const background = resolveCssColor(getComputedStyle(current).backgroundColor);
    if (background !== undefined && background.a > 0) {
      result = compositeOver(result, background);
      if (result.a >= OPAQUE_EPSILON) return { ...result, a: 1 };
    }
    current = current.parentElement;
  }

  return compositeOver(result, { r: 1, g: 1, b: 1, a: 1 });
}

function isInsideOwnedFrame(element: Element): boolean {
  return element.closest(OWNED_FRAME_SELECTOR) !== null;
}

function commonTokens(root: ParentNode): HTMLElement[] {
  const result: HTMLElement[] = [];
  if (
    root instanceof HTMLElement &&
    root.matches(COMMON_TOKEN_SELECTOR) &&
    isInsideOwnedFrame(root)
  ) {
    result.push(root);
  }
  for (const element of root.querySelectorAll<HTMLElement>(COMMON_TOKEN_SELECTOR)) {
    if (isInsideOwnedFrame(element)) result.push(element);
  }
  return result;
}

function parentNode(value: Node): ParentNode | undefined {
  return value instanceof HTMLElement || value instanceof DocumentFragment
    ? value
    : undefined;
}

function touchesOwnedFrame(root: ParentNode): boolean {
  if (root instanceof HTMLElement) {
    return (
      isInsideOwnedFrame(root) ||
      root.matches(OWNED_FRAME_SELECTOR) ||
      root.querySelector(OWNED_FRAME_SELECTOR) !== null
    );
  }
  return root.querySelector(OWNED_FRAME_SELECTOR) !== null;
}

export class CommonContrastManager {
  private readonly observer: MutationObserver;
  private readonly rootObserver: MutationObserver;
  private readonly headObserver: MutationObserver;
  private readonly originalInlineColors = new WeakMap<HTMLElement, InlineColor>();
  private readonly pendingRoots = new Set<ParentNode>();
  private fullRefreshPending = false;
  private scheduled = false;

  constructor(private readonly minimumContrast = MINIMUM_TEXT_CONTRAST) {
    this.observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") {
          const root = parentNode(record.target);
          if (root !== undefined && touchesOwnedFrame(root)) {
            this.pendingRoots.add(root);
          }
          continue;
        }
        for (const node of record.addedNodes) {
          const root = parentNode(node);
          if (root !== undefined && touchesOwnedFrame(root)) {
            this.pendingRoots.add(root);
          }
        }
      }
      if (this.pendingRoots.size > 0) this.schedule();
    });
    this.rootObserver = new MutationObserver(() => this.scheduleFullRefresh());
    this.headObserver = new MutationObserver(() => {
      resolvedColorCache.clear();
      this.scheduleFullRefresh();
    });
  }

  start(): void {
    if (document.body === null) return;
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    this.rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    this.rootObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    if (document.head !== null) {
      this.headObserver.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["href", "media"],
      });
    }
    this.refreshAll();
  }

  normalize(root: ParentNode): void {
    if (
      root instanceof HTMLElement &&
      root.hasAttribute(ADJUSTED_ATTRIBUTE) &&
      isInsideOwnedFrame(root) &&
      !root.matches(COMMON_TOKEN_SELECTOR)
    ) {
      this.restoreThemeColor(root);
    }
    for (const element of commonTokens(root)) this.normalizeElement(element);
  }

  refreshAll(): void {
    this.pendingRoots.clear();
    this.fullRefreshPending = false;
    this.normalize(document);
  }

  dispose(): void {
    this.observer.disconnect();
    this.rootObserver.disconnect();
    this.headObserver.disconnect();
    this.pendingRoots.clear();
    this.fullRefreshPending = false;
    this.scheduled = false;
    for (const element of document.querySelectorAll<HTMLElement>(
      `${OWNED_FRAME_SELECTOR} [${ADJUSTED_ATTRIBUTE}]`,
    )) {
      this.restoreThemeColor(element);
    }
  }

  private normalizeElement(element: HTMLElement): void {
    if (!isInsideOwnedFrame(element)) return;

    // Settings previews intentionally show their selected semantic preset rather
    // than the active vault theme, so runtime normalization must not rewrite it.
    if (element.closest(".syntax-preview-output") !== null) {
      this.restoreThemeColor(element);
      return;
    }
    if ((element.textContent ?? "").trim().length === 0) {
      this.restoreThemeColor(element);
      return;
    }

    this.restoreThemeColor(element);
    const foreground = resolveCssColor(getComputedStyle(element).color);
    if (foreground === undefined) return;
    const background = effectiveBackground(element);
    const adjustment = ensureContrast(foreground, background, this.minimumContrast);
    if (!adjustment.changed) return;

    this.originalInlineColors.set(element, {
      value: element.style.getPropertyValue("color"),
      priority: element.style.getPropertyPriority("color"),
    });
    element.style.setProperty("color", toCssColor(adjustment.adjusted), "important");
    element.setAttribute(ADJUSTED_ATTRIBUTE, "true");
  }

  private restoreThemeColor(element: HTMLElement): void {
    if (!element.hasAttribute(ADJUSTED_ATTRIBUTE)) return;
    const original = this.originalInlineColors.get(element);
    if (original === undefined || original.value === "") {
      element.style.removeProperty("color");
    } else {
      element.style.setProperty("color", original.value, original.priority);
    }
    this.originalInlineColors.delete(element);
    element.removeAttribute(ADJUSTED_ATTRIBUTE);
  }

  private scheduleFullRefresh(): void {
    resolvedColorCache.clear();
    this.fullRefreshPending = true;
    this.pendingRoots.clear();
    this.schedule();
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    window.requestAnimationFrame(() => {
      this.scheduled = false;
      if (this.fullRefreshPending) {
        this.refreshAll();
        return;
      }
      const roots = [...this.pendingRoots];
      this.pendingRoots.clear();
      for (const root of roots) this.normalize(root);
    });
  }
}
