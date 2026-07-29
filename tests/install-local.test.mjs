import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  activatePlugin,
  installLocal,
  PLUGIN_ID,
} from "../scripts/install-local.mjs";

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

describe("installLocal", () => {
  it("copies external language descriptors with the plugin", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "syntax-install-"));
    temporaryDirectories.push(root);
    const pluginRoot = path.join(root, "tooling", "obsidian", "mud-syntax");
    await mkdir(path.join(pluginRoot, "dist"), { recursive: true });
    await mkdir(path.join(pluginRoot, "languages"), { recursive: true });
    await mkdir(path.join(root, ".obsidian"), { recursive: true });
    await writeFile(path.join(pluginRoot, "dist", "main.js"), "", "utf8");
    await writeFile(path.join(pluginRoot, "manifest.json"), "{}", "utf8");
    await writeFile(path.join(pluginRoot, "styles.css"), "", "utf8");
    await writeFile(
      path.join(pluginRoot, "languages", "sample.json"),
      '{"id":"sample"}',
      "utf8",
    );

    await installLocal(pluginRoot);

    expect(
      await readFile(
        path.join(
          root,
          ".obsidian",
          "plugins",
          PLUGIN_ID,
          "languages",
          "sample.json",
        ),
        "utf8",
      ),
    ).toContain('"sample"');
  });
});
