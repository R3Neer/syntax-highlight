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

const BUILTIN_IMPORTS = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

function normalizedPath(value) {
  return value.replaceAll("\\", "/");
}

function packageImportMatches(value, packageName) {
  return value === packageName || value.startsWith(`${packageName}/`);
}

function isHostRuntimeImport(value) {
  return (
    OBSIDIAN_HOST_PACKAGE_EXTERNALS.some((packageName) =>
      packageImportMatches(value, packageName),
    ) || BUILTIN_IMPORTS.has(value)
  );
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
    OBSIDIAN_HOST_PACKAGE_EXTERNALS.some((packageName) =>
      inputContainsPackage(input, packageName),
    ),
  );
}

export function nonExternalHostRuntimeImports(metafile) {
  const violations = [];
  for (const [outputPath, output] of Object.entries(metafile.outputs)) {
    for (const imported of output.imports ?? []) {
      if (!isHostRuntimeImport(imported.path) || imported.external) continue;
      violations.push(`${outputPath}: ${imported.path}`);
    }
  }
  return violations;
}

export function assertObsidianHostRuntimeBoundary(metafile) {
  const bundled = bundledHostRuntimeInputs(metafile);
  const nonExternal = nonExternalHostRuntimeImports(metafile);
  if (bundled.length === 0 && nonExternal.length === 0) return;

  const sections = [];
  if (bundled.length > 0) {
    sections.push(
      "Bundled host package inputs:\n" +
        bundled.map((input) => `- ${input}`).join("\n"),
    );
  }
  if (nonExternal.length > 0) {
    sections.push(
      "Host runtime imports not marked external:\n" +
        nonExternal.map((value) => `- ${value}`).join("\n"),
    );
  }

  throw new Error(
    "Obsidian host runtime boundary violation:\n" + sections.join("\n"),
  );
}
