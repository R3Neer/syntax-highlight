import { builtinModules } from "node:module";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  OBSIDIAN_BUILD_EXTERNALS,
  OBSIDIAN_HOST_PACKAGE_EXTERNALS,
  assertObsidianHostRuntimeBoundary,
  bundledHostRuntimeInputs,
  nonExternalHostRuntimeImports,
} from "../build-runtime.mjs";

const OFFICIAL_HOST_PACKAGES = [
  "obsidian",
  "electron",
  "@codemirror/autocomplete",
  "@codemirror/collab",
  "@codemirror/commands",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/view",
  "@lezer/common",
  "@lezer/highlight",
  "@lezer/lr",
];

const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));

describe("Obsidian host runtime boundary", () => {
  it("tracks the adopted official sample-plugin package boundary plus Node builtins", () => {
    expect(OBSIDIAN_HOST_PACKAGE_EXTERNALS).toEqual(OFFICIAL_HOST_PACKAGES);
    for (const packageName of OFFICIAL_HOST_PACKAGES) {
      expect(OBSIDIAN_BUILD_EXTERNALS).toContain(packageName);
    }
    for (const builtin of builtinModules) {
      expect(OBSIDIAN_BUILD_EXTERNALS).toContain(builtin);
    }
  });

  it("keeps language packages bundled instead of mistaking them for host runtime", () => {
    for (const packageName of [
      "@codemirror/lang-javascript",
      "@codemirror/lang-python",
      "@codemirror/legacy-modes",
      "@codincod/codemirror-lang-nushell",
      "@replit/codemirror-lang-csharp",
    ]) {
      expect(OBSIDIAN_BUILD_EXTERNALS).not.toContain(packageName);
    }
  });

  it("rejects a host runtime package bundled as an esbuild input", () => {
    const metafile = {
      inputs: {
        "src/main.ts": { bytes: 1, imports: [] },
        "../../node_modules/@lezer/highlight/dist/index.js": { bytes: 1, imports: [] },
      },
      outputs: {},
    };

    expect(bundledHostRuntimeInputs(metafile)).toEqual([
      "../../node_modules/@lezer/highlight/dist/index.js",
    ]);
    expect(() => assertObsidianHostRuntimeBoundary(metafile))
      .toThrow(/@lezer\/highlight/);
  });

  it("rejects a host import that survives into output without being external", () => {
    const metafile = {
      inputs: { "src/main.ts": { bytes: 1, imports: [] } },
      outputs: {
        "dist/main.js": {
          bytes: 1,
          inputs: {},
          exports: [],
          imports: [
            { path: "@codemirror/state", kind: "require-call", external: false },
          ],
        },
      },
    };

    expect(nonExternalHostRuntimeImports(metafile)).toEqual([
      "dist/main.js: @codemirror/state",
    ]);
    expect(() => assertObsidianHostRuntimeBoundary(metafile))
      .toThrow(/not marked external/);
  });

  it("accepts external host imports and declares the ones used by the package as peers", async () => {
    const metafile = {
      inputs: { "src/main.ts": { bytes: 1, imports: [] } },
      outputs: {
        "dist/main.js": {
          bytes: 1,
          inputs: {},
          exports: [],
          imports: [
            { path: "obsidian", kind: "require-call", external: true },
            { path: "@codemirror/view", kind: "require-call", external: true },
            { path: "@lezer/highlight", kind: "require-call", external: true },
          ],
        },
      },
    };

    expect(() => assertObsidianHostRuntimeBoundary(metafile)).not.toThrow();

    const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
    for (const packageName of [
      "obsidian",
      "@codemirror/autocomplete",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/search",
      "@codemirror/state",
      "@codemirror/view",
      "@lezer/common",
      "@lezer/highlight",
      "@lezer/lr",
    ]) {
      expect(packageJson.peerDependencies?.[packageName]).toBeTypeOf("string");
    }
    for (const preventiveOnly of ["electron", "@codemirror/collab", "@codemirror/lint"]) {
      expect(packageJson.peerDependencies?.[preventiveOnly]).toBeUndefined();
    }
  });
});
