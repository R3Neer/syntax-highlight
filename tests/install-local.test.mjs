import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { activatePlugin, PLUGIN_ID } from "../scripts/install-local.mjs";

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("activatePlugin", () => {
  it("preserves existing plugins and avoids duplicates", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mud-syntax-"));
    temporaryDirectories.push(root);
    await mkdir(root, { recursive: true });
    const communityFile = path.join(root, "community-plugins.json");
    await writeFile(communityFile, '["existing-plugin"]\n', "utf8");

    await activatePlugin(communityFile);
    await activatePlugin(communityFile);

    const active = JSON.parse(await readFile(communityFile, "utf8"));
    expect(active).toEqual(["existing-plugin", PLUGIN_ID]);
  });
});
