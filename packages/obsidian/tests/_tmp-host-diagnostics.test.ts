// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";

import {
  hostDiagnosticsController,
  traceHostDiagnostic,
} from "../src/_tmp-host-diagnostics";

function controller() {
  const value = hostDiagnosticsController();
  if (value === undefined) throw new Error("Missing diagnostics controller.");
  return value;
}

beforeEach(() => {
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
    expect(event.path).toBe("reading-fallback");
    expect(event.fence).toBe("text");
    expect(event.pre?.classes).toContain("host-pre");
    expect(event.code?.classes).toContain("is-loaded");
    expect(event.auxiliaryChildren[0]?.classes).toContain("copy-code-button");
    expect(event.ancestors[0]?.classes).toContain("callout-content");
    expect(event.block?.quoteDepth).toBe(1);
    expect(controller().dump()).toContain('"reading-fallback"');
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
});
