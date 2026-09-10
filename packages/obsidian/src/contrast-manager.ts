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

const ADJUSTED_ATTRIBUTE = "data-syntax-contrast-adjusted";
const ADJUSTED_VARIABLE = "--syntax-contrast-color";
const OPAQUE_EPSILON = 0.999;

function effectiveBackground(element: Element): RgbaColor | undefined {
  let result: RgbaColor = { r: 0, g: 0, b: 0, a: 0 };
  let current: Element | null = element;

  while (current !== null) {
    const background = parseCssColor(getComputedStyle(current).backgroundColor);
    if (background !== undefined && background.a > 0) {
      result = compositeOver(result, background);
      if (result.a >= OPAQUE_EPSILON) return { ...result, a: 1 };
    }
    current = current.parentElement;
  }

  // CSS can legitimately leave every ancestor transparent. In that case the
  // browser ultimately paints over the canvas, which is white in Obsidian's
  // normal document environment. Keeping this final fallback explicit also
  // makes the contrast calculation deterministic.
  return compositeOver(result, { r: 1, g: 1, b: 1, a: 1 });
}

function commonTokens(root: ParentNode): HTMLElement[] {
  const result: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.matches(COMMON_TOKEN_SELECTOR)) {
    result.push(root);
  }
  for (const element of root.querySelectorAll<HTMLElement>(COMMON_TOKEN_SELECTOR)) {
    result.push(element);
  }
  return result;
}

export class CommonContrastManager {
  private readonly observer: MutationObserver;
  private readonly rootObserver: MutationObserver;
  private scheduled = false;

  constructor(private readonly minimumContrast = MINIMUM_TEXT_CONTRAST) {
    this.observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.type === "childList" ||
            (record.type === "attributes" && record.attributeName === "class"),
        )
      ) {
        this.schedule();
      }
    });
    this.rootObserver = new MutationObserver(() => this.schedule());
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
    this.refreshAll();
  }

  normalize(root: ParentNode): void {
    for (const element of commonTokens(root)) this.normalizeElement(element);
  }

  refreshAll(): void {
    this.normalize(document);
  }

  dispose(): void {
    this.observer.disconnect();
    this.rootObserver.disconnect();
    this.scheduled = false;
    for (const element of commonTokens(document)) this.clearAdjustment(element);
  }

  private normalizeElement(element: HTMLElement): void {
    // Settings previews intentionally show their selected semantic preset rather
    // than the active vault theme, so runtime normalization must not rewrite it.
    if (element.closest(".syntax-preview-output") !== null) return;
    if ((element.textContent ?? "").trim().length === 0) {
      this.clearAdjustment(element);
      return;
    }

    this.clearAdjustment(element);
    const foreground = parseCssColor(getComputedStyle(element).color);
    const background = effectiveBackground(element);
    if (foreground === undefined || background === undefined) return;

    const adjustment = ensureContrast(foreground, background, this.minimumContrast);
    if (!adjustment.changed) return;

    element.style.setProperty(ADJUSTED_VARIABLE, toCssColor(adjustment.adjusted));
    element.setAttribute(ADJUSTED_ATTRIBUTE, "true");
  }

  private clearAdjustment(element: HTMLElement): void {
    element.removeAttribute(ADJUSTED_ATTRIBUTE);
    element.style.removeProperty(ADJUSTED_VARIABLE);
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    window.requestAnimationFrame(() => {
      this.scheduled = false;
      this.refreshAll();
    });
  }
}
