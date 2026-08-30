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

export async function installLocal(pluginRoot, vaultRoot) {
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
  const active = await activatePlugin(path.join(configDirectory, "community-plugins.json"));
  return { target, active, migratedLegacyData };
}

function vaultArgument(argv) {
  const index = argv.indexOf("--vault");
  return index >= 0 ? argv[index + 1] : undefined;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === currentFile) {
  const pluginRoot = path.resolve(path.dirname(currentFile), "..");
  const vaultRoot = vaultArgument(process.argv.slice(2));
  if (!vaultRoot) {
    console.error("Usage: node scripts/install-local.mjs --vault <vault-path>");
    process.exitCode = 2;
  } else {
    const result = await installLocal(pluginRoot, vaultRoot);
    console.log(`Plugin installed at ${result.target}`);
    if (result.migratedLegacyData) console.log("Legacy settings were copied to the new plugin id.");
    console.log("Reload Obsidian and enable Syntax Highlight if necessary.");
  }
}
