import { mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import process from "node:process";

await rm("release/npm", { recursive: true, force: true });
await mkdir("release/npm", { recursive: true });
for (const name of ["core", "language-mud", "html", "codemirror", "mcp", "cli", "obsidian"]) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, ["pack", `./packages/${name}`, "--pack-destination", "release/npm"], {
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
