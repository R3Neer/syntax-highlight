import { mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import process from "node:process";

await rm("release/npm", { recursive: true, force: true });
await mkdir("release/npm", { recursive: true });
for (const name of ["core", "language-mud", "html", "codemirror", "mcp", "cli", "obsidian"]) {
  const npmCli = process.env.npm_execpath;
  const command = npmCli === undefined ? "npm" : process.execPath;
  const args = npmCli === undefined
    ? ["pack", `./packages/${name}`, "--pack-destination", "release/npm"]
    : [npmCli, "pack", `./packages/${name}`, "--pack-destination", "release/npm"];
  const result = spawnSync(command, args, {
    stdio: "inherit"
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
