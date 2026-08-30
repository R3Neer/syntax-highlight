import { describe, expect, it } from "vitest";
import { renderHighlightHtml } from "../src";

describe("safe HTML renderer", () => {
  it("escapes both styled and unstyled source", () => {
    const html = renderHighlightHtml({
      schemaVersion: 1,
      languageId: "demo",
      languageVersion: "1.0.0",
      source: "<x>&",
      spans: [{ from: 1, to: 2, categoryId: "keyword" }],
      diagnostics: [],
    });
    expect(html).toContain("&lt;");
    expect(html).toContain("&amp;");
    expect(html).not.toContain("<x>");
  });
});
