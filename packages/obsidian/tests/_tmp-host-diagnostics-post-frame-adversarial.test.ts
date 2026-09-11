// @vitest-environment happy-dom

import { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  hostDiagnosticsController,
  registerLivePreviewDiagnosticView,
} from "../src/_tmp-host-diagnostics";

const unregisters: Array<() => void> = [];

function controller() {
  const value = hostDiagnosticsController();
  if (value === undefined) throw new Error("Missing diagnostics controller.");
  return value;
}

function fakeView(source: string): { view: EditorView; lines: HTMLElement[] } {
  const state = EditorState.create({ doc: source });
  const dom = document.body.appendChild(document.createElement("div"));
  const positions = new Map<HTMLElement, number>();
  const lines: HTMLElement[] = [];
  let position = 0;

  for (const text of source.split("\n")) {
    const line = dom.appendChild(document.createElement("div"));
    line.className = "cm-line";
    line.textContent = text;
    positions.set(line, position);
    lines.push(line);
    position += text.length + 1;
  }

  const view = {
    state,
    dom,
    hasFocus: false,
    viewport: { from: 0, to: state.doc.length },
    posAtDOM(node: Node) {
      const element =
        node instanceof HTMLElement
          ? node.closest<HTMLElement>(".cm-line")
          : node.parentElement?.closest<HTMLElement>(".cm-line") ?? null;
      return element === null ? 0 : positions.get(element) ?? 0;
    },
  } as unknown as EditorView;

  return { view, lines };
}

function mockAnimationFrames(): void {
  let id = 1;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
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
  for (const unregister of unregisters.splice(0)) unregister();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  controller().clear();
  controller().disable();
});

describe("post-frame diagnostic adversarials", () => {
  it("keeps healthy lines when one materialized line fails to snapshot", async () => {
    const { view, lines } = fakeView("first\nsecond");
    unregisters.push(
      registerLivePreviewDiagnosticView(view, () => new Set()),
    );

    // Root-level `.cm-line` discovery has already succeeded when the snapshot
    // later walks a line's ancestry. Make only that per-line operation fail so
    // this exercises captureLineSafely rather than the enclosing view capture.
    Object.defineProperty(lines[0]!, "parentElement", {
      configurable: true,
      get() {
        throw new Error("reconciled while reading ancestry");
      },
    });

    mockAnimationFrames();
    controller().enable();
    const [capture] = await controller().captureLivePreview();

    expect(capture?.captureError).not.toBe(true);
    expect(capture?.lines).toHaveLength(2);
    expect(capture?.lines?.[0]).toMatchObject({
      snapshotError: true,
      element: {
        tag: "<unavailable>",
        classes: [],
        attributes: {},
        text: "",
        connected: false,
        style: { styleError: true },
      },
    });
    expect(capture?.lines?.[1]?.snapshotError).not.toBe(true);
    expect(capture?.lines?.[1]?.documentText).toBe("second");
  });

  it("re-evaluates accepted fences for every capture of the same view", async () => {
    const source = "```text\nhello\n```";
    const { view } = fakeView(source);
    let accepted: ReadonlySet<string> = new Set();
    unregisters.push(
      registerLivePreviewDiagnosticView(view, () => accepted),
    );

    mockAnimationFrames();
    controller().enable();
    const [before] = await controller().captureLivePreview();
    expect(before?.fences).toEqual([]);

    accepted = new Set(["text"]);
    controller().clear();
    const [after] = await controller().captureLivePreview();

    expect(after?.fences).toHaveLength(1);
    expect(after?.fences?.[0]).toMatchObject({
      language: "text",
      quoteDepth: 0,
      openingLine: 0,
    });
  });
});
