import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const stylesPath = fileURLToPath(new URL("../styles.css", import.meta.url));
const removedBridgePath = fileURLToPath(
  new URL("../src/live-preview-host.ts", import.meta.url),
);

async function productionSources() {
  const names = await readdir(sourceRoot);
  const files = names
    .filter((name) => name.endsWith(".ts"))
    .filter((name) => name !== "_tmp-host-diagnostics.ts");
  const entries = await Promise.all(
    files.map(async (name) => [
      name,
      await readFile(new URL(`../src/${name}`, import.meta.url), "utf8"),
    ]),
  );
  entries.push(["styles.css", await readFile(stylesPath, "utf8")]);
  return entries;
}

describe("Obsidian public host boundaries", () => {
  it("keeps private Live Preview selectors out of non-temporary production code", async () => {
    const forbidden = [".cm-embed-block", ".cm-callout", "HyperMD-codeblock"];
    const violations = [];

    for (const [name, source] of await productionSources()) {
      for (const token of forbidden) {
        if (source.includes(token)) violations.push(`${name}: ${token}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not ship the rendered Live Preview DOM bridge", async () => {
    await expect(access(removedBridgePath, constants.F_OK)).rejects.toThrow();
    const sources = await productionSources();
    expect(
      sources.some(([, source]) => source.includes("LivePreviewRenderedBlockBridge")),
    ).toBe(false);
  });

  it("does not observe or replace EditorView DOM from the source highlighter", async () => {
    const editor = await readFile(
      new URL("../src/editor.ts", import.meta.url),
      "utf8",
    );
    expect(editor).not.toContain("MutationObserver");
    expect(editor).not.toContain("replaceWith(");
    expect(editor).not.toContain("querySelector(\".cm-");
  });

  it("keeps private-selector diagnostics explicitly temporary", async () => {
    const diagnostics = await readFile(
      new URL("../src/_tmp-host-diagnostics.ts", import.meta.url),
      "utf8",
    );
    expect(diagnostics).toContain(".cm-embed-block");
    expect(diagnostics).toContain("HyperMD-codeblock");
    expect(diagnostics).toContain("SyntaxHighlightHostDiagnostics");
  });
});
