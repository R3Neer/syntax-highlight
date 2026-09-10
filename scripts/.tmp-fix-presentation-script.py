from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "scripts/.tmp-apply-text-markdown-presentation.py"
text = path.read_text(encoding="utf-8")

# Fix the editor loop precondition to match the PR #8 implementation.
start = text.index("old_loop = '''")
end = text.index("new_loop = '''", start)
old_loop_literal = """old_loop = '''  for (const block of findCodeBlocks(source, fences)) {\\n    const body = source.slice(block.from, block.to);\\n    const runtime = registry.byFence(block.language);\\n    const common = runtime === undefined\\n      ? commonLanguageByFence(block.language)\\n      : undefined;\\n    if (runtime !== undefined) {\\n      for (const token of runtime.tokenize(body)) {\\n        addTokenRanges(ranges, token, block.from, runtime.settings.id);\\n      }\\n    } else {\\n      addCommonLanguageRanges(ranges, body, block.from, block.language);\\n    }\\n    const showLineNumbers =\\n      lineNumbers && (common?.presentation?.lineNumbers ?? true);\\n    if (showLineNumbers) {\\n'''\n"""
text = text[:start] + old_loop_literal + text[end:]

# Current Reading tests already assert the richer no-furniture shape. Dedicated
# tests added later cover family/override classes, so discard the obsolete exact
# insertion left over from the planning draft.
reading_start = text.index('reading_test = "packages/obsidian/tests/reading.test.ts"')
block_start = text.index("replace_once(\n    reading_test,", reading_start)
block_end = text.index("insert_reading_before_bash =", block_start)
text = text[:block_start] + text[block_end:]

# Likewise align the common-language test patch with the current PR #8 wording.
common_start = text.index("# Common-language catalog capabilities")
common_end = text.index("# Theme CSS integration regression", common_start)
common_patch = r'''# Common-language catalog capabilities
common_test = "packages/obsidian/tests/common-languages.test.ts"
replace_once(
    common_test,
    '''    expect(text?.presentation).toEqual({ badge: false, lineNumbers: false });\n''',
    '''    expect(text?.presentation).toEqual({\n      badge: false,\n      lineNumbers: false,\n      family: "text",\n    });\n''',
)
replace_once(
    common_test,
    '''  it("uses CodeMirror's PowerShell mode as a parser-backed common language", () => {\n''',
    r'''  it("marks Markdown as a syntax-highlighted presentational family", () => {
    const markdown = commonLanguageByFence("markdown");
    expect(markdown?.support).toBeDefined();
    expect(markdown?.presentation).toEqual({
      badge: false,
      lineNumbers: false,
      family: "markdown",
    });
  });

  it("uses CodeMirror's PowerShell mode as a parser-backed common language", () => {
''',
)

'''
text = text[:common_start] + common_patch + text[common_end:]

path.write_text(text, encoding="utf-8")
Path(__file__).unlink()
