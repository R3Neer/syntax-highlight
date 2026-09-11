// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";

import {
  RENDERED_PROCESSED_ATTRIBUTE,
  collectUnprocessedRenderedCodeBlocks,
  replaceRenderedCodeBlockCandidate,
} from "../src/rendered-code-candidate";

function preWith(
  preClasses: string[],
  codeClasses: string[],
  source = "payload",
): HTMLPreElement {
  const pre = document.createElement("pre");
  pre.classList.add(...preClasses);
  const code = document.createElement("code");
  code.classList.add(...codeClasses);
  code.textContent = source;
  pre.append(code);
  return pre;
}

function candidate(pre: HTMLPreElement) {
  const root = document.createElement("div");
  root.append(pre);
  return collectUnprocessedRenderedCodeBlocks(root);
}

describe("rendered code candidate contract", () => {
  it("accepts PRE-only language metadata", () => {
    const result = candidate(preWith(["language-powershell"], []));
    expect(result).toHaveLength(1);
    expect(result[0]?.fence).toBe("powershell");
  });

  it("accepts CODE-only language metadata", () => {
    const result = candidate(preWith([], ["language-powershell"]));
    expect(result).toHaveLength(1);
    expect(result[0]?.fence).toBe("powershell");
  });

  it("accepts agreeing PRE/CODE metadata case-insensitively", () => {
    const result = candidate(
      preWith(["language-PowerShell"], ["language-powershell"]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.fence).toBe("powershell");
  });

  it("fails closed on conflicting or ambiguous metadata", () => {
    expect(
      candidate(preWith(["language-text"], ["language-powershell"])),
    ).toEqual([]);
    expect(
      candidate(preWith([], ["language-text", "language-powershell"])),
    ).toEqual([]);
  });

  it("requires exactly one direct CODE child", () => {
    const pre = preWith([], ["language-text"]);
    const second = document.createElement("code");
    second.className = "language-text";
    pre.append(second);

    expect(candidate(pre)).toEqual([]);
  });

  it("skips previously processed output and Syntax Highlight frames", () => {
    const marked = document.createElement("div");
    marked.setAttribute(RENDERED_PROCESSED_ATTRIBUTE, "true");
    marked.append(preWith([], ["language-text"]));
    expect(collectUnprocessedRenderedCodeBlocks(marked)).toEqual([]);

    const frame = document.createElement("div");
    frame.className = "syntax-highlight-frame";
    frame.append(preWith([], ["language-text"]));
    expect(collectUnprocessedRenderedCodeBlocks(frame)).toEqual([]);
  });

  it("preserves auxiliary host nodes by identity when replacing a candidate", () => {
    const pre = preWith([], ["language-text"], "hello");
    const copy = document.createElement("button");
    copy.className = "copy-code-button";
    let clicks = 0;
    copy.addEventListener("click", () => clicks += 1);
    pre.append(copy);
    const root = document.createElement("div");
    root.append(pre);
    const found = collectUnprocessedRenderedCodeBlocks(root)[0]!;

    const host = document.createElement("div");
    const renderedPre = document.createElement("pre");
    host.append(renderedPre);
    replaceRenderedCodeBlockCandidate(found, host);

    expect(root.firstElementChild).toBe(host);
    expect(renderedPre.querySelector(".copy-code-button")).toBe(copy);
    copy.click();
    expect(clicks).toBe(1);
  });

  it("leaves unknown/unclaimed candidates untouched until a renderer explicitly handles them", () => {
    const pre = preWith([], ["language-unknown-x"], "raw <&>");
    const root = document.createElement("div");
    root.append(pre);
    const before = root.innerHTML;
    const handler = vi.fn(() => false);

    const found = collectUnprocessedRenderedCodeBlocks(root);
    for (const item of found) handler(item);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(root.innerHTML).toBe(before);
    expect(root.firstElementChild).toBe(pre);
  });
});
