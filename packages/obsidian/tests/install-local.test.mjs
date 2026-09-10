import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  activatePlugin,
  applyInstallProfile,
  installLocal,
  INSTALL_PROFILES,
  LEGACY_PLUGIN_ID,
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

async function createPluginFixture(root) {
  const pluginRoot = path.join(root, "package");
  await mkdir(path.join(pluginRoot, "dist"), { recursive: true });
  await mkdir(path.join(pluginRoot, "languages"), { recursive: true });
  await mkdir(path.join(root, ".obsidian"), { recursive: true });
  await writeFile(path.join(pluginRoot, "dist", "main.js"), "", "utf8");
  await writeFile(path.join(pluginRoot, "manifest.json"), "{}", "utf8");
  await writeFile(path.join(pluginRoot, "styles.css"), "", "utf8");
  await writeFile(path.join(pluginRoot, "languages", "sample.json"), "{}", "utf8");
  return pluginRoot;
}

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

describe("install profiles", () => {
  it("exposes only the supported profiles", () => {
    expect(INSTALL_PROFILES).toEqual(["common", "mud"]);
  });

  it("removes the MUD profile from a common vault without disturbing other settings", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "syntax-profile-common-"));
    temporaryDirectories.push(root);
    const dataFile = path.join(root, "data.json");
    await writeFile(
      dataFile,
      JSON.stringify({
        locale: "es",
        languages: [
          { id: "mud", enabled: true, themePreset: "catppuccin", custom: "discard-with-mud" },
          { id: "toml", enabled: true },
        ],
      }),
      "utf8",
    );

    await applyInstallProfile(dataFile, "common");

    const settings = JSON.parse(await readFile(dataFile, "utf8"));
    expect(settings.locale).toBe("es");
    expect(settings.languages).toEqual([{ id: "toml", enabled: true }]);
    expect(settings.languages.some(({ id }) => id === "mud")).toBe(false);
  });

  it("enables MUD for a MUD vault and creates the profile when absent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "syntax-profile-mud-"));
    temporaryDirectories.push(root);
    const dataFile = path.join(root, "data.json");

    await applyInstallProfile(dataFile, "mud");

    const settings = JSON.parse(await readFile(dataFile, "utf8"));
    expect(settings.schemaVersion).toBe(8);
    expect(settings.languages).toEqual([{ id: "mud", enabled: true }]);
  });

  it("preserves an existing MUD profile when enabling the MUD vault", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "syntax-profile-mud-existing-"));
    temporaryDirectories.push(root);
    const dataFile = path.join(root, "data.json");
    await writeFile(
      dataFile,
      JSON.stringify({
        languages: [
          { id: "mud", enabled: false, themePreset: "catppuccin", custom: "keep" },
          { id: "toml", enabled: true },
        ],
      }),
      "utf8",
    );

    await applyInstallProfile(dataFile, "mud");

    const settings = JSON.parse(await readFile(dataFile, "utf8"));
    expect(settings.languages.find(({ id }) => id === "mud")).toEqual({
      id: "mud",
      enabled: true,
      themePreset: "catppuccin",
      custom: "keep",
    });
    expect(settings.languages).toContainEqual({ id: "toml", enabled: true });
  });

  it("rejects unknown profiles instead of guessing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "syntax-profile-invalid-"));
    temporaryDirectories.push(root);
    const dataFile = path.join(root, "data.json");

    await expect(applyInstallProfile(dataFile, "classes")).rejects.toThrow(
      /Unknown install profile 'classes'/,
    );
  });
});

describe("installLocal", () => {
  it("copies external language descriptors with the plugin", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "syntax-install-"));
    temporaryDirectories.push(root);
    const pluginRoot = await createPluginFixture(root);
    await writeFile(
      path.join(pluginRoot, "languages", "sample.json"),
      '{"id":"sample"}',
      "utf8",
    );

    await installLocal(pluginRoot, root);

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

  it("copies legacy settings without deleting or changing them when no profile is requested", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "syntax-migration-"));
    temporaryDirectories.push(root);
    const pluginRoot = await createPluginFixture(root);
    const legacyRoot = path.join(root, ".obsidian", "plugins", LEGACY_PLUGIN_ID);
    await mkdir(legacyRoot, { recursive: true });
    await writeFile(path.join(legacyRoot, "data.json"), '{"legacy":true}', "utf8");
    await writeFile(
      path.join(root, ".obsidian", "community-plugins.json"),
      JSON.stringify([LEGACY_PLUGIN_ID, "existing-plugin"]),
      "utf8",
    );

    const result = await installLocal(pluginRoot, root);

    expect(result.migratedLegacyData).toBe(true);
    expect(result.profile).toBeUndefined();
    expect(result.active).toEqual(["existing-plugin", PLUGIN_ID]);
    expect(await readFile(path.join(legacyRoot, "data.json"), "utf8")).toBe('{"legacy":true}');
    expect(
      await readFile(
        path.join(root, ".obsidian", "plugins", PLUGIN_ID, "data.json"),
        "utf8",
      ),
    ).toBe('{"legacy":true}');
  });

  it("applies the requested profile to the target vault only", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "syntax-install-profile-"));
    temporaryDirectories.push(root);
    const pluginRoot = await createPluginFixture(root);

    const result = await installLocal(pluginRoot, root, { profile: "mud" });

    expect(result.profile).toBe("mud");
    const settings = JSON.parse(
      await readFile(
        path.join(root, ".obsidian", "plugins", PLUGIN_ID, "data.json"),
        "utf8",
      ),
    );
    expect(settings.schemaVersion).toBe(8);
    expect(settings.languages).toEqual([{ id: "mud", enabled: true }]);
  });
});
