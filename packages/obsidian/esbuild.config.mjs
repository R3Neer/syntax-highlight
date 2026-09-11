import esbuild from "esbuild";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  OBSIDIAN_BUILD_EXTERNALS,
  assertObsidianHostRuntimeBoundary,
} from "./build-runtime.mjs";

const production = process.argv[2] === "production";
const packageRoot = fileURLToPath(new URL(".", import.meta.url));
const context = await esbuild.context({
  absWorkingDir: packageRoot,
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: OBSIDIAN_BUILD_EXTERNALS,
  format: "cjs",
  platform: "browser",
  target: "es2022",
  logLevel: "info",
  metafile: true,
  sourcemap: production ? false : "inline",
  treeShaking: true,
  minify: production,
  loader: {
    ".ebnf": "text",
  },
  outfile: "dist/main.js",
});

if (production) {
  const result = await context.rebuild();
  if (result.metafile === undefined) {
    throw new Error("Missing esbuild metafile for Obsidian boundary validation.");
  }
  assertObsidianHostRuntimeBoundary(result.metafile);
  await context.dispose();
} else {
  await context.watch();
}
