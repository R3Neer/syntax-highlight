import { builtinModules } from "node:module";

export const OBSIDIAN_HOST_PACKAGE_EXTERNALS = Object.freeze([
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
]);

export const OBSIDIAN_BUILD_EXTERNALS = Object.freeze([
  ...OBSIDIAN_HOST_PACKAGE_EXTERNALS,
  ...builtinModules,
]);

const BUNDLED_HOST_RUNTIME_PACKAGES = Object.freeze(
  OBSIDIAN_HOST_PACKAGE_EXTERNALS.filter(
    (name) => name.startsWith("@codemirror/") || name.startsWith("@lezer/"),
  ),
);

function normalizedPath(value) {
  return value.replaceAll("\\", "/");
}

function inputContainsPackage(input, packageName) {
  const path = normalizedPath(input);
  return (
    path.includes(`/node_modules/${packageName}/`) ||
    path.startsWith(`node_modules/${packageName}/`)
  );
}

export function bundledHostRuntimeInputs(metafile) {
  return Object.keys(metafile.inputs).filter((input) =>
    BUNDLED_HOST_RUNTIME_PACKAGES.some((packageName) =>
      inputContainsPackage(input, packageName),
    ),
  );
}

export function assertObsidianHostRuntimeBoundary(metafile) {
  const bundled = bundledHostRuntimeInputs(metafile);
  if (bundled.length === 0) return;

  throw new Error(
    "Obsidian host runtime packages were bundled instead of externalized:\n" +
      bundled.map((input) => `- ${input}`).join("\n"),
  );
}
