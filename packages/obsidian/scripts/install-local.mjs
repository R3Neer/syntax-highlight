import {
  copyFile,
  cp,
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const PLUGIN_ID = "syntax-highlight";
export const LEGACY_PLUGIN_ID = "mud-syntax-highlighter";
export const INSTALL_PROFILES = ["common", "mud"];

export async function activatePlugin(communityFile) {
  let active = [];
  try {
    active = JSON.parse(await readFile(communityFile, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (!Array.isArray(active) || !active.every((value) => typeof value === "string")) {
    throw new Error(`${communityFile} does not contain a valid plugin list.`);
  }
  active = active.filter((value) => value !== LEGACY_PLUGIN_ID);
  if (!active.includes(PLUGIN_ID)) active.push(PLUGIN_ID);
  const temporary = `${communityFile}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(active, null, 2)}\n`, "utf8");
  await rename(temporary, communityFile);
  return active;
}

async function copyLegacyData(configDirectory, target) {
  const legacyData = path.join(
    configDirectory,
    "plugins",
    LEGACY_PLUGIN_ID,
    "data.json",
  );
  const targetData = path.join(target, "data.json");
  try {
    await readFile(targetData);
    return false;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  try {
    await copyFile(legacyData, targetData);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function readSettings(dataFile) {
  try {
    const value = JSON.parse(await readFile(dataFile, "utf8"));
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`${dataFile} does not contain a settings object.`);
    }
    return value;
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function applyProfileToSettings(settings, profile) {
  if (!INSTALL_PROFILES.includes(profile)) {
    throw new Error(
      `Unknown install profile '${profile}'. Expected one of: ${INSTALL_PROFILES.join(", ")}.`,
    );
  }

  const languages = Array.isArray(settings.languages)
    ? settings.languages.map((entry) =>
        typeof entry === "object" && entry !== null && !Array.isArray(entry)
          ? { ...entry }
          : entry,
      )
    : [];
  const index = languages.findIndex(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      !Array.isArray(entry) &&
      entry.id === "mud",
  );
  const current =
    index >= 0 &&
    typeof languages[index] === "object" &&
    languages[index] !== null &&
    !Array.isArray(languages[index])
      ? languages[index]
      : { id: "mud" };
  const mud = { ...current, id: "mud", enabled: profile === "mud" };

  if (index >= 0) languages[index] = mud;
  else languages.push(mud);

  return { ...settings, languages };
}

export async function applyInstallProfile(dataFile, profile) {
  if (profile === undefined) return false;
  const settings = await readSettings(dataFile);
  const updated = applyProfileToSettings(settings, profile);
  const temporary = `${dataFile}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  await rename(temporary, dataFile);
  return true;
}

export async function installLocal(pluginRoot, vaultRoot, options = {}) {
  if (!vaultRoot) throw new Error("A vault path is required.");
  const configDirectory = path.join(path.resolve(vaultRoot), ".obsidian");
  const target = path.join(configDirectory, "plugins", PLUGIN_ID);
  await mkdir(target, { recursive: true });
  await cp(path.join(pluginRoot, "languages"), path.join(target, "languages"), {
    recursive: true,
  });
  await Promise.all([
    copyFile(path.join(pluginRoot, "dist", "main.js"), path.join(target, "main.js")),
    copyFile(path.join(pluginRoot, "manifest.json"), path.join(target, "manifest.json")),
    copyFile(path.join(pluginRoot, "styles.css"), path.join(target, "styles.css")),
  ]);
  const migratedLegacyData = await copyLegacyData(configDirectory, target);
  const profileApplied = await applyInstallProfile(
    path.join(target, "data.json"),
    options.profile,
  );
  const active = await activatePlugin(path.join(configDirectory, "community-plugins.json"));
  return {
    target,
    active,
    migratedLegacyData,
    profile: profileApplied ? options.profile : undefined,
  };
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === currentFile) {
  const pluginRoot = path.resolve(path.dirname(currentFile), "..");
  const argv = process.argv.slice(2);
  const vaultRoot = argument(argv, "--vault");
  const profile = argument(argv, "--profile");
  if (!vaultRoot) {
    console.error(
      "Usage: node scripts/install-local.mjs --vault <vault-path> [--profile common|mud]",
    );
    process.exitCode = 2;
  } else {
    const result = await installLocal(pluginRoot, vaultRoot, { profile });
    console.log(`Plugin installed at ${result.target}`);
    if (result.migratedLegacyData) console.log("Legacy settings were copied to the new plugin id.");
    if (result.profile !== undefined) {
      console.log(`Applied '${result.profile}' vault profile.`);
    }
    console.log("Reload Obsidian and enable Syntax Highlight if necessary.");
  }
}
