from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "scripts/.tmp-apply-text-markdown-presentation.py"
text = path.read_text(encoding="utf-8")

# Fix the editor loop precondition to match the PR #8 implementation.
start = text.index("old_loop = '''")
end = text.index("new_loop = '''", start)
old_loop_literal = """old_loop = '''  for (const block of findCodeBlocks(source, fences)) {\\n    const body = source.slice(block.from, block.to);\\n    const runtime = registry.byFence(block.language);\\n    const common = runtime === undefined\\n      ? commonLanguageByFence(block.language)\\n      : undefined;\\n    if (runtime !== undefined) {\\n      for (const token of runtime.tokenize(body)) {\\n        addTokenRanges(ranges, token, block.from, runtime.settings.id);\\n      }\\n    } else {\\n      addCommonLanguageRanges(ranges, body, block.from, block.language);\\n    }\\n    const showLineNumbers =\\n      lineNumbers && (common?.presentation?.lineNumbers ?? true);\\n    if (showLineNumbers) {\\n'''\n"""
text = text[:start] + old_loop_literal + text[end:]

# The current Text test already checks furniture with a slightly richer shape.
# The new dedicated presentation tests below cover family/override classes, so
# drop the obsolete exact-text insertion rather than weakening that current test.
start = text.index('reading_test = "packages/obsidian/tests/reading.test.ts"')
block_start = text.index("replace_once(\n    reading_test,", start)
block_end = text.index("insert_reading_before_bash =", block_start)
text = text[:block_start] + text[block_end:]

path.write_text(text, encoding="utf-8")
Path(__file__).unlink()
