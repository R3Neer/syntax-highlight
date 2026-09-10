from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "scripts/.tmp-apply-text-markdown-presentation.py"
text = path.read_text(encoding="utf-8")
start = text.index("old_loop = '''")
end = text.index("new_loop = '''", start)
replacement = r'''old_loop = '''  for (const block of findCodeBlocks(source, fences)) {\n    const body = source.slice(block.from, block.to);\n    const runtime = registry.byFence(block.language);\n    const common = runtime === undefined\n      ? commonLanguageByFence(block.language)\n      : undefined;\n    if (runtime !== undefined) {\n      for (const token of runtime.tokenize(body)) {\n        addTokenRanges(ranges, token, block.from, runtime.settings.id);\n      }\n    } else {\n      addCommonLanguageRanges(ranges, body, block.from, block.language);\n    }\n    const showLineNumbers =\n      lineNumbers && (common?.presentation?.lineNumbers ?? true);\n    if (showLineNumbers) {\n'''
'''
text = text[:start] + replacement + text[end:]
path.write_text(text, encoding="utf-8")
Path(__file__).unlink()
