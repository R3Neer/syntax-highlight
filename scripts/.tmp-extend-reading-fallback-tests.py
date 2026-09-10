from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "packages/obsidian/tests/reading-fallback.test.ts"
text = path.read_text(encoding="utf-8")
text = text.replace(
    'import { DEFAULT_SETTINGS } from "../src/settings";',
    'import { DEFAULT_SETTINGS, loadSettings } from "../src/settings";',
    1,
)
text = text.replace(
    '''function registry(): LanguageRegistry {\n  return new LanguageRegistry(\n    structuredClone(DEFAULT_SETTINGS),\n    () => Promise.resolve(""),\n  );\n}\n''',
    '''function registry(\n  settings = structuredClone(DEFAULT_SETTINGS),\n): LanguageRegistry {\n  return new LanguageRegistry(settings, () => Promise.resolve(""));\n}\n''',
    1,
)
text = text.replace(
    '  const languages = registry();\n  return createReadingFallbackPostProcessor',
    '  const languages = registry(settings);\n  return createReadingFallbackPostProcessor',
    1,
)
needle = '''  it("renders Markdown as presentational but keeps Markdown syntax highlighting", () => {\n'''
insert = '''  it("renders configured TOML through the same fallback path", () => {\n    const root = document.createElement("div");\n    const tomlSource = ["[server]", "port = 8080"].join(String.fromCharCode(10));\n    root.append(codeBlock("toml", tomlSource));\n\n    actualProcessor()(root, context());\n\n    expect(root.querySelector(".syntax-language-badge-text")?.textContent).toBe("TOML");\n    expect(root.querySelectorAll("[data-line-number]")).toHaveLength(2);\n    expect(root.querySelector('[class*="syntax-color-toml-"]')).not.toBeNull();\n  });\n\n  it("keeps MUD isolated by vault profile and renders it when explicitly enabled", () => {\n    const commonRoot = document.createElement("div");\n    const commonMud = codeBlock("mud", "thing World {}");\n    commonRoot.append(commonMud);\n    const commonBefore = commonRoot.innerHTML;\n\n    actualProcessor()(commonRoot, context());\n    expect(commonRoot.innerHTML).toBe(commonBefore);\n\n    const mudSettings = loadSettings({\n      ...structuredClone(DEFAULT_SETTINGS),\n      languages: [\n        ...structuredClone(DEFAULT_SETTINGS.languages),\n        { id: "mud", enabled: true },\n      ],\n    });\n    const mudRoot = document.createElement("div");\n    mudRoot.append(codeBlock("mud", "thing World {}"));\n\n    actualProcessor(mudSettings)(mudRoot, context());\n\n    expect(mudRoot.querySelector(".syntax-language-badge-mud")).not.toBeNull();\n    expect(mudRoot.querySelector('[class*="syntax-color-mud-"]')).not.toBeNull();\n  });\n\n'''
if needle not in text:
    raise RuntimeError("markdown test anchor not found")
text = text.replace(needle, insert + needle, 1)
needle2 = '''  it("leaves unknown languages byte-for-byte in place", () => {\n'''
insert2 = '''  it("lets an already-registered specialized processor claim a stale fence as plain text", () => {\n    const settings = structuredClone(DEFAULT_SETTINGS);\n    const element = document.createElement("div");\n    const enableEditing = vi.fn<EnableReadingBlockEditing>();\n\n    const handled = renderReadingFence(\n      registry(settings),\n      settings,\n      "raw stale source",\n      element,\n      context(),\n      "removed-profile",\n      enableEditing,\n      true,\n    );\n\n    expect(handled).toBe(true);\n    expect(element.querySelector("pre > code")?.textContent).toBe("raw stale source");\n    expect(element.hasAttribute(READING_PROCESSED_ATTRIBUTE)).toBe(true);\n    expect(enableEditing).toHaveBeenCalledTimes(1);\n  });\n\n'''
if needle2 not in text:
    raise RuntimeError("unknown-language test anchor not found")
text = text.replace(needle2, insert2 + needle2, 1)
path.write_text(text, encoding="utf-8")

(root / "scripts/.tmp-extend-reading-fallback-tests.py").unlink()
(root / ".github/workflows/.tmp-extend-reading-fallback-tests.yml").unlink()
