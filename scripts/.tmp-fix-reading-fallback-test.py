from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "packages/obsidian/tests/reading-fallback.test.ts"
text = path.read_text(encoding="utf-8")
text = text.replace(
    "  type EnableReadingBlockEditing,\n} from \"../src/reading-host\";",
    "  type EnableReadingBlockEditing,\n  type ReadingFenceHandler,\n} from \"../src/reading-host\";",
    1,
)
text = text.replace(
    "    const handler = vi.fn(() => true);",
    "    const handler = vi.fn<ReadingFenceHandler>(() => true);",
    1,
)
text = text.replace(
    '    expect(root.querySelectorAll("pre > code[class^=\'language-\']")).toHaveLength(0);',
    "    expect(collectUnprocessedRenderedCodeBlocks(root)).toEqual([]);",
    1,
)
path.write_text(text, encoding="utf-8")

(root / "scripts/.tmp-fix-reading-fallback-test.py").unlink()
(root / ".github/workflows/.tmp-fix-reading-fallback-test.yml").unlink()
