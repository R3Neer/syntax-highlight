import { copyFile, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const projectPath = (...parts) => resolve(projectRoot, ...parts);

const packages = [
  ["core", "neutral", []],
  ["language-mud", "neutral", ["@r3nner/syntax-highlight-core"]],
  ["html", "browser", ["@r3nner/syntax-highlight-core"]],
  ["codemirror", "browser", [
    "@r3nner/syntax-highlight-core",
    "@codemirror/state",
    "@codemirror/view"
  ]],
  ["mcp", "browser", [
    "@r3nner/syntax-highlight-core",
    "@r3nner/syntax-highlight-html"
  ]],
  ["cli", "node", [
    "@r3nner/syntax-highlight-core",
    "@r3nner/syntax-highlight-language-mud"
  ]]
];

for (const [name, platform, external] of packages) {
  await rm(projectPath("packages", name, "dist"), { recursive: true, force: true });
  await build({
    absWorkingDir: projectRoot,
    entryPoints: [`packages/${name}/src/index.ts`],
    outfile: projectPath("packages", name, "dist", "index.js"),
    bundle: true,
    format: "esm",
    platform,
    target: "es2022",
    sourcemap: true,
    external,
    loader: { ".ebnf": "text", ".json": "json" }
  });
}

const obsidian = spawnSync(
  process.execPath,
  ["esbuild.config.mjs", "production"],
  { cwd: projectPath("packages", "obsidian"), stdio: "inherit" }
);
if (obsidian.status !== 0) process.exit(obsidian.status ?? 1);
await mkdir(projectPath("packages", "obsidian", "dist"), { recursive: true });
await Promise.all([
  copyFile(projectPath("packages", "obsidian", "manifest.json"), projectPath("packages", "obsidian", "dist", "manifest.json")),
  copyFile(projectPath("packages", "obsidian", "styles.css"), projectPath("packages", "obsidian", "dist", "styles.css"))
]);
