// @vitest-environment happy-dom

import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { MarkdownPostProcessorContext } from "obsidian";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  hostDiagnosticsController,
  registerLivePreviewDiagnosticView,
  traceHostDiagnostic,
  traceRenderedHostObservations,
} from "../src/_tmp-host-diagnostics";
import { createMarkdownEditorExtensions } from "../src/editor";
import { LanguageRegistry } from "../src/languages";
import { renderReadingFence } from "../src/reading-host";
import { DEFAULT_SETTINGS } from "../src/settings";

const views: EditorView[] = [];
const manualUnregisters: Array<() => void> = [];

function controller() {
  const value = hostDiagnosticsController();
  if (value === undefined) throw new Error("Missing diagnostics controller.");
  return value;
}

function context(): MarkdownPostProcessorContext {
  return {
    docId: "test",
    sourcePath: "note.md",
    frontmatter: null,
    addChild: vi.fn(),
    getSectionInfo: vi.fn(() => null),
  } as unknown as MarkdownPostProcessorContext;
}

function mountEditor(source: string, diagnosticsWiring = false): EditorView {
  const parent = document.body.appendChild(document.createElement("div"));
  let extensions: Extension[] = [];
  if (diagnosticsWiring) {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const registry = new LanguageRegistry(settings, () => Promise.resolve(""));
    extensions = createMarkdownEditorExtensions(registry, () => settings);
  }
  const state = EditorState.create({ doc: source, extensions });
  const view = new EditorView({ state, parent });
  views.push(view);
  return view;
}

function registerManually(
  view: EditorView,
  accepted: ReadonlySet<string>,
): void {
  manualUnregisters.push(
    registerLivePreviewDiagnosticView(view, () => accepted),
  );
}

function mockAnimationFrames() {
  let id = 1;
  return vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const current = id;
    id += 1;
    queueMicrotask(() => callback(current));
    return current;
  });
}

beforeEach(() => {
  document.body.replaceChildren();
  controller().clear();
  controller().disable();
});

afterEach(() => {
  for (const unregister of manualUnregisters.splice(0)) unregister();
  for (const view of views.splice(0)) view.destroy();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  controller().clear();
  controller().disable();
});

describe("temporary Obsidian host diagnostics", () => {
  it("is inert until explicitly enabled", () => {
    const root = document.body.appendChild(document.createElement("div"));
    traceHostDiagnostic("reading-specialized", "text", "hello", root);
    expect(controller().events).toHaveLength(0);
  });

  it("captures host structure, controls and source lines without mutating DOM", () => {
    const root = document.body.appendChild(document.createElement("section"));
    root.className = "callout-content";
    const pre = root.appendChild(document.createElement("pre"));
    pre.className = "language-text host-pre";
    const code = pre.appendChild(document.createElement("code"));
    code.className = "language-text is-loaded";
    code.textContent = "hello";
    const copy = pre.appendChild(document.createElement("button"));
    copy.className = "copy-code-button";
    copy.textContent = "Copy";
    const line = root.appendChild(document.createElement("div"));
    line.className = "cm-line HyperMD-codeblock";
    line.dataset.test = "source";
    line.textContent = "> hello";
    const before = root.innerHTML;

    controller().enable();
    traceHostDiagnostic("reading-fallback", "TEXT", "hello", pre, {
      openingLine: 1,
      quoteDepth: 1,
      from: 10,
      to: 20,
      bodyLines: [{ lineFrom: 12, lineTo: 19, sourceFrom: 14, sourceTo: 19 }],
    });

    expect(root.innerHTML).toBe(before);
    expect(controller().events).toHaveLength(1);
    const event = controller().events[0]!;
    expect(event.phase).toBe("claimed");
    expect(event.path).toBe("reading-fallback");
    expect(event.fence).toBe("text");
    expect(event.pre?.classes).toContain("host-pre");
    expect(event.code?.classes).toContain("is-loaded");
    expect(event.auxiliaryChildren[0]?.classes).toContain("copy-code-button");
    expect(event.ancestors[0]?.classes).toContain("callout-content");
    expect(event.block?.quoteDepth).toBe(1);
    expect(controller().dump()).toContain('"reading-fallback"');
  });

  it("observes PRE-only metadata before production candidate filtering", () => {
    const root = document.body.appendChild(document.createElement("div"));
    const pre = root.appendChild(document.createElement("pre"));
    pre.className = "language-text";
    const code = pre.appendChild(document.createElement("code"));
    code.textContent = "nested";

    controller().enable();
    traceRenderedHostObservations("reading-fallback", root);

    expect(controller().events).toHaveLength(1);
    expect(controller().events[0]).toMatchObject({
      phase: "observed",
      path: "reading-fallback",
      fence: "text",
      source: "nested",
    });
  });

  it("records conflicting PRE/CODE language metadata as ambiguous", () => {
    const root = document.body.appendChild(document.createElement("div"));
    const pre = root.appendChild(document.createElement("pre"));
    pre.className = "language-text";
    const code = pre.appendChild(document.createElement("code"));
    code.className = "language-powershell";

    controller().enable();
    traceRenderedHostObservations("live-preview-rendered", root);

    expect(controller().events[0]?.fence).toBe("<ambiguous:powershell,text>");
  });

  it("captures CodeMirror line classes from a Live Preview root", () => {
    const editor = document.body.appendChild(document.createElement("div"));
    const line = editor.appendChild(document.createElement("div"));
    line.className = "cm-line HyperMD-codeblock-begin";
    line.textContent = "> ```text";

    controller().enable();
    traceHostDiagnostic("live-preview-source", "text", "hello", editor);

    expect(controller().events[0]?.cmLines).toEqual([
      expect.objectContaining({
        text: "> ```text",
        classes: ["cm-line", "HyperMD-codeblock-begin"],
      }),
    ]);
  });

  it("captures the specialized Reading DOM after PowerShell rendering", () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    const registry = new LanguageRegistry(settings, () => Promise.resolve(""));
    const element = document.body.appendChild(document.createElement("div"));

    controller().enable();
    const handled = renderReadingFence(
      registry,
      settings,
      "$foo = 42\nWrite-Host $foo",
      element,
      context(),
      "powershell",
      vi.fn(),
      true,
    );

    expect(handled).toBe(true);
    const events = controller().events.filter(
      ({ path }) => path === "reading-specialized",
    );
    expect(events.map(({ phase }) => phase)).toEqual(["claimed", "rendered"]);
    expect(events[1]?.pre?.classes).toContain("syntax-highlight-block");
    expect(events[1]?.code?.classes).toContain("language-powershell");
    expect(element.querySelector(".syntax-language-badge-text")?.textContent)
      .toBe("PowerShell");
  });

  it("exposes a versioned post-frame controller and stays inert while disabled", async () => {
    const diagnostics = controller();
    const global = (window as unknown as Record<string, unknown>)[
      "SyntaxHighlightHostDiagnostics"
    ];

    expect(diagnostics.version).toBe(2);
    expect(global).toBe(diagnostics);
    expect(typeof diagnostics.captureLivePreview).toBe("function");
    expect(typeof diagnostics.dumpLivePreview).toBe("function");
    expect(await diagnostics.captureLivePreview()).toEqual([]);
    expect(diagnostics.postFrameCaptures).toEqual([]);
  });

  it("captures top-level and quoted fences after two frames through the real editor wiring", async () => {
    const source = [
      "```powershell",
      "$top = 1",
      "Write-Host $top",
      "```",
      "",
      "> [!task] Nested",
      "> ```powershell",
      "> $foo = 42",
      "> Write-Host $foo",
      "> ```",
    ].join("\n");
    const view = mountEditor(source, true);
    const before = view.dom.innerHTML;
    const frames = mockAnimationFrames();

    controller().enable();
    const captures = await controller().captureLivePreview();

    expect(frames).toHaveBeenCalledTimes(2);
    expect(captures).toHaveLength(1);
    const capture = captures[0]!;
    expect(capture.captureError).not.toBe(true);
    expect(capture.documentLength).toBe(source.length);
    expect(capture.fences?.map(({ language, quoteDepth }) => ({ language, quoteDepth })))
      .toEqual([
        { language: "powershell", quoteDepth: 0 },
        { language: "powershell", quoteDepth: 1 },
      ]);

    const quotedBody = capture.lines?.find(
      ({ documentText, role }) =>
        documentText === "> $foo = 42" &&
        role?.role === "body" &&
        role.quoteDepth === 1,
    );
    expect(quotedBody).toBeDefined();
    expect(quotedBody?.role?.bodyIndex).toBe(0);
    expect(quotedBody?.ancestors.at(-1)?.isViewDom).toBe(true);
    expect(quotedBody?.ancestors.at(-1)?.text).toBe("");
    expect(
      quotedBody?.descendants.some(({ classes }) =>
        classes.some(
          (className) =>
            className === "cm-variable" ||
            className === "cm-number" ||
            className.startsWith("syntax-common-"),
        ),
      ),
    ).toBe(true);
    expect(view.dom.innerHTML).toBe(before);
    expect(controller().postFrameCaptures).toHaveLength(1);

    controller().clear();
    expect(controller().postFrameCaptures).toHaveLength(0);

    view.destroy();
    views.splice(views.indexOf(view), 1);
    expect(await controller().captureLivePreview()).toEqual([]);
  });

  it("captures embedded callout structure while filtering URL-bearing attributes", async () => {
    const view = mountEditor("plain");
    registerManually(view, new Set());

    const host = view.dom.appendChild(document.createElement("div"));
    host.className = "cm-embed-block cm-callout";
    host.setAttribute(
      "style",
      'background-image:url("file:///D:/Secret/(wallpaper).png"); color:red',
    );
    host.setAttribute("href", "file:///D:/Secret/note.md");
    host.setAttribute("src", "file:///D:/Secret/asset.png");
    const pre = host.appendChild(document.createElement("pre"));
    const code = pre.appendChild(document.createElement("code"));
    code.className = "language-powershell is-loaded";
    const inline = code.appendChild(document.createElement("span"));
    inline.className = "cm-inline-code HyperMD-codeblock-bg syntax-common-callable cm-builtin";
    inline.textContent = "Write-Host";
    const before = host.outerHTML;

    mockAnimationFrames();
    controller().enable();
    const [capture] = await controller().captureLivePreview();

    const embedded = capture?.embeddedHosts?.find(({ element }) =>
      element.classes.includes("cm-callout"),
    );
    expect(embedded).toBeDefined();
    expect(embedded?.contains).toEqual({
      callout: true,
      pre: true,
      code: true,
      cmLine: false,
      syntaxClass: true,
      inlineCode: true,
      hyperMdCodeblock: true,
    });
    expect(embedded?.element.attributes.style).toBe("<url-redacted>");
    expect(embedded?.element.attributes.href).toBeUndefined();
    expect(embedded?.element.attributes.src).toBeUndefined();
    expect(embedded?.ancestors.at(-1)?.isViewDom).toBe(true);
    expect(embedded?.ancestors.every(({ text }) => text === "")).toBe(true);
    expect(host.outerHTML).toBe(before);
    expect(controller().dumpLivePreview()).not.toContain("file:///D:/Secret");
  });

  it("isolates a broken registered view instead of losing healthy captures", async () => {
    const broken = {} as EditorView;
    Object.defineProperty(broken, "state", {
      get() {
        throw new Error("destroyed view");
      },
    });
    manualUnregisters.push(
      registerLivePreviewDiagnosticView(broken, () => new Set(["text"])),
    );

    const healthySource = "```text\nok\n```";
    const healthy = mountEditor(healthySource);
    registerManually(healthy, new Set(["text"]));

    mockAnimationFrames();
    controller().enable();
    const captures = await controller().captureLivePreview();

    expect(captures).toHaveLength(2);
    expect(captures.some(({ captureError }) => captureError === true)).toBe(true);
    const good = captures.find(({ documentLength }) => documentLength === healthySource.length);
    expect(good?.captureError).not.toBe(true);
    expect(good?.fences?.[0]).toMatchObject({
      language: "text",
      quoteDepth: 0,
    });
  });
});
