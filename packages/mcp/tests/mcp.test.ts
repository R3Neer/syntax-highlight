import { describe, expect, it } from "vitest";
import {
  createMcpHighlightResource,
  createRenderToolResult,
  MCP_HIGHLIGHT_RESOURCE_URI,
} from "../src";

const document = {
  schemaVersion: 1 as const,
  languageId: "demo",
  languageVersion: "1.0.0",
  source: "<safe>",
  spans: [],
  diagnostics: [],
};

describe("MCP Apps adapter", () => {
  it("uses the shared resourceUri metadata and structured content", () => {
    const result = createRenderToolResult({ document });
    expect(result._meta.ui.resourceUri).toBe(MCP_HIGHLIGHT_RESOURCE_URI);
    expect(result.structuredContent.document).toBe(document);
  });

  it("renders source through textContent in a portable bridge widget", () => {
    const resource = createMcpHighlightResource();
    expect(resource.mimeType).toBe("text/html;profile=mcp-app");
    expect(resource.text).toContain("ui/notifications/tool-result");
    expect(resource.text).toContain("ui/initialize");
    expect(resource.text).toContain("textContent");
    expect(resource.text).not.toContain("innerHTML");
  });
});
