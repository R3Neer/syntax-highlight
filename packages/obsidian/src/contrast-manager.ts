import {
  MINIMUM_TEXT_CONTRAST,
  compositeOver,
  ensureContrast,
  parseCssColor,
  toCssColor,
  type RgbaColor,
} from "./contrast";

const COMMON_TOKEN_SELECTORS = [
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
  ".syntax-common-invalid",
] as const;

const OWNED_FRAME_SELECTOR = ".syntax-highlight-frame";
const SOURCE_EDITOR_SELECTOR = ".syntax-source-editor";
const OWNED_SURFACE_SELECTOR = `${OWNED_FRAME_SELECTOR},${SOURCE_EDITOR_SELECTOR}`;
const RENDERED_COMMON_TOKEN_SELECTOR = COMMON_TOKEN_SELECTORS
  .map((selector) => `${OWNED_FRAME_SELECTOR} ${selector}`)
  .join(",");
const SOURCE_TOKEN_SELECTOR = '[class*="syntax-common-"],[class*="syntax-color-"]';
const SOURCE_SCOPE_ATTRIBUTE = "data-syntax-contrast-source";
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

function renderedContrastTargets(root: ParentNode): HTMLElement[] {
  const result: HTMLElement[] = [];
  if (
    root instanceof HTMLElement &&
    root.matches(RENDERED_COMMON_TOKEN_SELECTOR)
  ) {
    result.push(root);
  }
  for (const element of root.querySelectorAll<HTMLElement>(
    RENDERED_COMMON_TOKEN_SELECTOR,
  )) {
    result.push(element);
  }
  return result;
}

function sourceEditors(root: ParentNode): HTMLElement[] {
  const result: HTMLElement[] = [];
  if (root instanceof HTMLElement) {
    const owner = root.closest<HTMLElement>(SOURCE_EDITOR_SELECTOR);
    if (owner !== null) result.push(owner);
  }
  for (const editor of root.querySelectorAll<HTMLElement>(SOURCE_EDITOR_SELECTOR)) {
    if (!result.includes(editor)) result.push(editor);
  }
  return result;
}

function sourceTokenClasses(editor: HTMLElement): Map<string, HTMLElement> {
  const result = new Map<string, HTMLElement>();
  for (const element of editor.querySelectorAll<HTMLElement>(SOURCE_TOKEN_SELECTOR)) {
    for (const className of element.classList) {
      if (
        /^(?:syntax-common|syntax-color)-[a-z0-9_-]+$/i.test(className) &&
        !result.has(className)
      ) {
        result.set(className, element);
      }
    }
  }
  return result;
}

function parentNode(value: Node): ParentNode | undefined {
  return value instanceof HTMLElement || value instanceof DocumentFragment
    ? value
    : undefined;
}

function touchesOwnedSurface(root: ParentNode): boolean {
  if (root instanceof HTMLElement) {
    return (
      root.closest(OWNED_SURFACE_SELECTOR) !== null ||
      root.matches(OWNED_SURFACE_SELECTOR) ||
      root.querySelector(OWNED_SURFACE_SELECTOR) !== null
    );
  }
  return root.querySelector(OWNED_SURFACE_SELECTOR) !== null;
}

export class SyntaxContrastManager {
  private readonly observer: MutationObserver;
  private readonly rootObserver: MutationObserver;
  private readonly headObserver: MutationObserver;
  private readonly originalInlineColors = new WeakMap<HTMLElement, InlineColor>();
  private readonly sourceStyleElement = document.createElement("style");
  private readonly sourceRules = new Map<HTMLElement, string>();
  private readonly sourceIds = new WeakMap<HTMLElement, string>();
  private readonly pendingRoots = new Set<ParentNode>();
  private fullRefreshPending = false;
  private scheduled = false;
  private animationFrame?: number;
  private nextSourceId = 1;

  constructor(private readonly minimumContrast = MINIMUM_TEXT_CONTRAST) {
    this.observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") {
          const root = parentNode(record.target);
          if (root !== undefined && touchesOwnedSurface(root)) {
            this.pendingRoots.add(root);
          }
          continue;
        }
        for (const node of record.addedNodes) {
          const root = parentNode(node);
          if (root !== undefined && touchesOwnedSurface(root)) {
            this.pendingRoots.add(root);
          }
        }
      }
      if (this.pendingRoots.size > 0) this.schedule();
    });
    this.rootObserver = new MutationObserver(() => this.scheduleFullRefresh());
    this.headObserver = new MutationObserver((records) => {
      if (records.every((record) =>
        record.target === this.sourceStyleElement ||
        this.sourceStyleElement.contains(record.target)
      )) return;
      resolvedColorCache.clear();
      this.scheduleFullRefresh();
    });
    this.sourceStyleElement.dataset.syntaxHighlightSourceContrast = "true";
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
      document.head.append(this.sourceStyleElement);
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
    this.normalizeRoots([root]);
  }

  refreshAll(): void {
    this.pendingRoots.clear();
    this.fullRefreshPending = false;
    this.sourceRules.clear();
    this.renderSourceRules();
    this.normalize(document);
  }

  dispose(): void {
    this.observer.disconnect();
    this.rootObserver.disconnect();
    this.headObserver.disconnect();
    this.pendingRoots.clear();
    this.fullRefreshPending = false;
    this.scheduled = false;
    if (this.animationFrame !== undefined) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
    for (const element of document.querySelectorAll<HTMLElement>(
      `[${ADJUSTED_ATTRIBUTE}]`,
    )) {
      this.restoreThemeColor(element);
    }
    for (const editor of document.querySelectorAll<HTMLElement>(
      `[${SOURCE_SCOPE_ATTRIBUTE}]`,
    )) {
      editor.removeAttribute(SOURCE_SCOPE_ATTRIBUTE);
    }
    this.sourceRules.clear();
    this.sourceStyleElement.remove();
  }

  private normalizeRenderedElement(element: HTMLElement): void {
    if (!element.matches(RENDERED_COMMON_TOKEN_SELECTOR)) return;

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

  private normalizeSourceEditor(editor: HTMLElement): void {
    if (!editor.isConnected) {
      this.sourceRules.delete(editor);
      this.renderSourceRules();
      return;
    }

    // Remove our previous rules before reading computed colors. The resulting
    // rules are scoped to the plugin-owned editor host, never written onto
    // CodeMirror's managed content DOM.
    this.sourceRules.delete(editor);
    this.renderSourceRules();

    const content = editor.querySelector<HTMLElement>(".cm-content");
    if (content === null || (content.textContent ?? "").trim().length === 0) return;

    let id = this.sourceIds.get(editor);
    if (id === undefined) {
      id = String(this.nextSourceId++);
      this.sourceIds.set(editor, id);
      editor.setAttribute(SOURCE_SCOPE_ATTRIBUTE, id);
    }
    const scope = `${SOURCE_EDITOR_SELECTOR}[${SOURCE_SCOPE_ATTRIBUTE}="${id}"]`;
    const background = effectiveBackground(content);
    const activeLine = editor.querySelector<HTMLElement>(".cm-activeLine");
    const activeBackground = activeLine === null
      ? background
      : effectiveBackground(activeLine);
    const rules: string[] = [];

    this.appendSourceColorRules(
      rules,
      scope,
      ".cm-content",
      getComputedStyle(content).color,
      background,
      activeBackground,
      ".cm-activeLine",
    );

    for (const [className, element] of sourceTokenClasses(editor)) {
      this.appendSourceColorRules(
        rules,
        scope,
        `.${className}`,
        getComputedStyle(element).color,
        background,
        activeBackground,
        `.cm-activeLine .${className}`,
      );
    }

    this.sourceRules.set(editor, rules.join("\n"));
    this.renderSourceRules();
  }

  private appendSourceColorRules(
    rules: string[],
    scope: string,
    selector: string,
    foregroundCss: string,
    background: RgbaColor,
    activeBackground: RgbaColor,
    activeSelector: string,
  ): void {
    const foreground = resolveCssColor(foregroundCss);
    if (foreground === undefined) return;

    const normal = ensureContrast(foreground, background, this.minimumContrast);
    if (normal.changed) {
      rules.push(`${scope} ${selector}{color:${toCssColor(normal.adjusted)}!important}`);
    }

    const active = ensureContrast(
      foreground,
      activeBackground,
      this.minimumContrast,
    );
    if (toCssColor(active.adjusted) !== toCssColor(normal.adjusted)) {
      rules.push(`${scope} ${activeSelector}{color:${toCssColor(active.adjusted)}!important}`);
    }
  }

  private renderSourceRules(): void {
    if (!this.sourceStyleElement.isConnected && document.head !== null) {
      document.head.append(this.sourceStyleElement);
    }
    for (const editor of [...this.sourceRules.keys()]) {
      if (!editor.isConnected) this.sourceRules.delete(editor);
    }
    this.sourceStyleElement.textContent = [...this.sourceRules.values()]
      .filter((value) => value.length > 0)
      .join("\n");
  }

  private normalizeRoots(roots: Iterable<ParentNode>): void {
    const editors = new Set<HTMLElement>();
    for (const root of roots) {
      if (
        root instanceof HTMLElement &&
        root.hasAttribute(ADJUSTED_ATTRIBUTE) &&
        !root.matches(RENDERED_COMMON_TOKEN_SELECTOR)
      ) {
        this.restoreThemeColor(root);
      }
      for (const element of renderedContrastTargets(root)) {
        this.normalizeRenderedElement(element);
      }
      for (const editor of sourceEditors(root)) editors.add(editor);
    }
    for (const editor of editors) this.normalizeSourceEditor(editor);
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
    this.animationFrame = window.requestAnimationFrame(() => {
      this.animationFrame = undefined;
      this.scheduled = false;
      if (this.fullRefreshPending) {
        this.refreshAll();
        return;
      }
      const roots = [...this.pendingRoots];
      this.pendingRoots.clear();
      this.normalizeRoots(roots);
    });
  }
}
