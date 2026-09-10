from pathlib import Path

root = Path(__file__).resolve().parents[1]
host = root / "packages/obsidian/src/reading-host.ts"
text = host.read_text(encoding="utf-8")
old = '''function directCodeChild(pre: HTMLPreElement): HTMLElement | undefined {\n  if (pre.children.length !== 1) return undefined;\n  const child = pre.firstElementChild;\n  return child instanceof HTMLElement && child.tagName === "CODE"\n    ? child\n    : undefined;\n}\n'''
new = '''function directCodeChild(pre: HTMLPreElement): HTMLElement | undefined {\n  const codeChildren = [...pre.children].filter(\n    (child): child is HTMLElement =>\n      child instanceof HTMLElement && child.tagName === "CODE",\n  );\n  return codeChildren.length === 1 ? codeChildren[0] : undefined;\n}\n'''
if old not in text:
    raise RuntimeError("strict directCodeChild assumption not found")
host.write_text(text.replace(old, new, 1), encoding="utf-8")

tests = root / "packages/obsidian/tests/reading-fallback.test.ts"
text = tests.read_text(encoding="utf-8")
old = '''  it("rejects deceptive classes and pre elements with extra UI children", () => {\n    const root = document.createElement("div");\n    const deceptive = document.createElement("pre");\n    deceptive.innerHTML = '<code class="languageish-text foo-language-text">x</code>';\n    const decorated = codeBlock("text", "must survive");\n    decorated.append(document.createElement("button"));\n    root.append(deceptive, decorated);\n\n    expect(collectUnprocessedRenderedCodeBlocks(root)).toEqual([]);\n  });\n'''
new = '''  it("rejects deceptive language classes without rejecting host UI siblings", () => {\n    const root = document.createElement("div");\n    const deceptive = document.createElement("pre");\n    deceptive.innerHTML = '<code class="languageish-text foo-language-text">x</code>';\n    const decorated = codeBlock("text", "must survive");\n    const copy = document.createElement("button");\n    copy.className = "copy-code-button";\n    copy.textContent = "Copy";\n    decorated.append(copy);\n    root.append(deceptive, decorated);\n\n    const candidates = collectUnprocessedRenderedCodeBlocks(root);\n    expect(candidates).toHaveLength(1);\n    expect(candidates[0]?.pre).toBe(decorated);\n    expect(candidates[0]?.source).toBe("must survive");\n  });\n'''
if old not in text:
    raise RuntimeError("invalid adversarial test assumption not found")
tests.write_text(text.replace(old, new, 1), encoding="utf-8")

Path(__file__).unlink()
