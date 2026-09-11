// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";

import { CommonContrastManager } from "../src/contrast-manager";
import {
  MINIMUM_TEXT_CONTRAST,
  contrastRatioCss,
} from "../src/contrast";

function mountedToken(
  foreground: string,
  background: string,
  className = "syntax-common-keyword token keyword",
): HTMLElement {
  const host = document.createElement("div");
  host.className = "syntax-highlight-frame";
  host.style.backgroundColor = background;
  const token = document.createElement("span");
  token.className = className;
  token.style.color = foreground;
  token.textContent = "token";
  host.append(token);
  document.body.append(host);
  return token;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("CommonContrastManager", () => {
  it("adjusts only a low-contrast common token in plugin-owned rendered DOM", () => {
    const token = mountedToken("rgb(229, 192, 123)", "rgb(221, 216, 199)");
    const manager = new CommonContrastManager();

    manager.normalize(document.body);

    expect(token.getAttribute("data-syntax-contrast-adjusted")).toBe("true");
    const adjusted = token.style.getPropertyValue("color");
    expect(token.style.getPropertyPriority("color")).toBe("important");
    expect(adjusted).not.toBe("rgb(229, 192, 123)");
    expect(contrastRatioCss(adjusted, "rgb(221, 216, 199)"))
      .toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST - 0.01);
  });

  it("applies the same contrast floor to rendered parserless Text spans", () => {
    const token = mountedToken(
      "rgb(229, 192, 123)",
      "rgb(221, 216, 199)",
      "syntax-common-plain",
    );
    const host = token.parentElement!;
    const originalBackground = host.style.backgroundColor;
    const manager = new CommonContrastManager();

    manager.normalize(document.body);

    expect(token.getAttribute("data-syntax-contrast-adjusted")).toBe("true");
    expect(contrastRatioCss(
      token.style.getPropertyValue("color"),
      host.style.backgroundColor,
    )).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST - 0.01);
    expect(host.style.backgroundColor).toBe(originalBackground);
  });

  it("leaves a theme color alone when it already passes", () => {
    const token = mountedToken("rgb(35, 35, 35)", "rgb(245, 245, 245)");
    const manager = new CommonContrastManager();

    manager.normalize(document.body);

    expect(token.hasAttribute("data-syntax-contrast-adjusted")).toBe(false);
    expect(token.style.getPropertyValue("color")).toBe("rgb(35, 35, 35)");
  });

  it("recomputes from the original theme color after the rendered background changes", () => {
    const token = mountedToken("rgb(229, 192, 123)", "rgb(221, 216, 199)");
    const host = token.parentElement!;
    const manager = new CommonContrastManager();

    manager.normalize(document.body);
    expect(token.hasAttribute("data-syntax-contrast-adjusted")).toBe(true);

    host.style.backgroundColor = "rgb(25, 25, 25)";
    manager.normalize(document.body);

    expect(token.hasAttribute("data-syntax-contrast-adjusted")).toBe(false);
    expect(token.style.getPropertyValue("color")).toBe("rgb(229, 192, 123)");
  });

  it("restores the theme color when owned rendered DOM reuses a span for non-syntax text", () => {
    const token = mountedToken("rgb(229, 192, 123)", "rgb(221, 216, 199)");
    const manager = new CommonContrastManager();
    manager.normalize(token);
    expect(token.hasAttribute("data-syntax-contrast-adjusted")).toBe(true);

    token.className = "cm-content";
    manager.normalize(token);

    expect(token.hasAttribute("data-syntax-contrast-adjusted")).toBe(false);
    expect(token.style.getPropertyValue("color")).toBe("rgb(229, 192, 123)");
  });

  it("does not mutate CodeMirror-owned source tokens", () => {
    const editor = document.createElement("div");
    editor.className = "cm-content";
    editor.style.backgroundColor = "rgb(221, 216, 199)";
    const token = document.createElement("span");
    token.className = "syntax-common-keyword cm-keyword";
    token.style.color = "rgb(229, 192, 123)";
    token.textContent = "source";
    editor.append(token);
    document.body.append(editor);

    new CommonContrastManager().normalize(document.body);

    expect(token.hasAttribute("data-syntax-contrast-adjusted")).toBe(false);
    expect(token.style.getPropertyValue("color")).toBe("rgb(229, 192, 123)");
    expect(token.style.getPropertyPriority("color")).toBe("");
  });

  it("restores a pre-existing inline theme color when disposed", () => {
    const token = mountedToken("rgb(229, 192, 123)", "rgb(221, 216, 199)");
    const manager = new CommonContrastManager();
    manager.normalize(document.body);

    manager.dispose();

    expect(token.hasAttribute("data-syntax-contrast-adjusted")).toBe(false);
    expect(token.style.getPropertyValue("color")).toBe("rgb(229, 192, 123)");
  });

  it("does not rewrite semantic theme previews even when they use plugin-owned frames", () => {
    const preview = document.createElement("div");
    preview.className = "syntax-preview-output";
    preview.style.backgroundColor = "rgb(250, 250, 250)";
    const frame = document.createElement("div");
    frame.className = "syntax-highlight-frame";
    const token = document.createElement("span");
    token.className = "syntax-common-keyword";
    token.style.color = "rgb(245, 245, 245)";
    token.textContent = "preview";
    frame.append(token);
    preview.append(frame);
    document.body.append(preview);

    new CommonContrastManager().normalize(document.body);

    expect(token.hasAttribute("data-syntax-contrast-adjusted")).toBe(false);
    expect(token.style.getPropertyValue("color")).toBe("rgb(245, 245, 245)");
  });
});
