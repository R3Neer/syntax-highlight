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
  it("adjusts only a low-contrast common token", () => {
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

  it("leaves a theme color alone when it already passes", () => {
    const token = mountedToken("rgb(35, 35, 35)", "rgb(245, 245, 245)");
    const manager = new CommonContrastManager();

    manager.normalize(document.body);

    expect(token.hasAttribute("data-syntax-contrast-adjusted")).toBe(false);
    expect(token.style.getPropertyValue("color")).toBe("rgb(35, 35, 35)");
  });

  it("recomputes from the original theme color after the background changes", () => {
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

  it("restores a pre-existing inline theme color when disposed", () => {
    const token = mountedToken("rgb(229, 192, 123)", "rgb(221, 216, 199)");
    const manager = new CommonContrastManager();
    manager.normalize(document.body);

    manager.dispose();

    expect(token.hasAttribute("data-syntax-contrast-adjusted")).toBe(false);
    expect(token.style.getPropertyValue("color")).toBe("rgb(229, 192, 123)");
  });

  it("does not rewrite semantic theme previews", () => {
    const preview = document.createElement("div");
    preview.className = "syntax-preview-output";
    preview.style.backgroundColor = "rgb(250, 250, 250)";
    const token = document.createElement("span");
    token.className = "syntax-common-keyword";
    token.style.color = "rgb(245, 245, 245)";
    token.textContent = "preview";
    preview.append(token);
    document.body.append(preview);

    new CommonContrastManager().normalize(document.body);

    expect(token.hasAttribute("data-syntax-contrast-adjusted")).toBe(false);
    expect(token.style.getPropertyValue("color")).toBe("rgb(245, 245, 245)");
  });
});
