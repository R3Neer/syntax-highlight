from pathlib import Path

root = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str) -> None:
    file = root / path
    text = file.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, got {count}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "packages/obsidian/src/reading.ts",
    '  const element = document.createElement("span");\n  element.className = "syntax-code-line";\n  if (showLineNumbers) element.dataset.lineNumber = String(lineNumber);\n',
    '  const element = document.createElement("span");\n  element.className = "syntax-code-line";\n  element.dataset.sourceLine = String(lineNumber);\n  if (showLineNumbers) element.dataset.lineNumber = String(lineNumber);\n',
)

replace_once(
    "packages/obsidian/src/main.ts",
    '      const lineNumber = Number(renderedLine?.dataset.lineNumber ?? "1");\n',
    '      const lineNumber = Number(\n        renderedLine?.dataset.sourceLine ?? renderedLine?.dataset.lineNumber ?? "1",\n      );\n',
)

replace_once(
    "packages/obsidian/tests/reading.test.ts",
    '    expect(lines.every((line) => !line.hasAttribute("data-line-number"))).toBe(true);\n',
    '    expect(lines.every((line) => !line.hasAttribute("data-line-number"))).toBe(true);\n    expect(lines.map((line) => line.getAttribute("data-source-line"))).toEqual(["1", "2"]);\n',
)

replace_once(
    "packages/obsidian/src/settings-tab.ts",
    '''  private choose(\n    title: string,\n    choices: readonly [string, string][],\n    description?: string,\n  ): Promise<string> {\n    return new Promise((resolve) => {\n      const modal = new Modal(this.plugin.app);\n      modal.titleEl.setText(title);\n      if (description !== undefined) {\n        modal.contentEl.createEl("p", {\n          text: description,\n          cls: "setting-item-description",\n        });\n      }\n      for (const [value, label] of choices) {\n        const button = modal.contentEl.createEl("button", { text: label });\n        button.addEventListener("click", () => {\n          modal.close();\n          resolve(value);\n        });\n      }\n      modal.onClose = () => resolve("cancel");\n      modal.open();\n    });\n  }\n''',
    '''  private choose(\n    title: string,\n    choices: readonly [string, string][],\n    description?: string,\n  ): Promise<string> {\n    return new Promise((resolve) => {\n      const modal = new Modal(this.plugin.app);\n      let settled = false;\n      const finish = (value: string): void => {\n        if (settled) return;\n        settled = true;\n        resolve(value);\n      };\n      modal.titleEl.setText(title);\n      if (description !== undefined) {\n        modal.contentEl.createEl("p", {\n          text: description,\n          cls: "setting-item-description",\n        });\n      }\n      for (const [value, label] of choices) {\n        const button = modal.contentEl.createEl("button", { text: label });\n        button.addEventListener("click", () => {\n          finish(value);\n          modal.close();\n        });\n      }\n      modal.onClose = () => finish("cancel");\n      modal.open();\n    });\n  }\n''',
)

# No temporary runner files belong in the resulting commit.
(root / "scripts/.tmp-presentation-review-fixes.py").unlink()
(root / ".github/workflows/.tmp-presentation-review-fixes.yml").unlink()
