from pathlib import Path

root = Path(__file__).resolve().parents[1]

readme = root / "packages/obsidian/README.md"
text = readme.read_text(encoding="utf-8")
old = '''Reading View has two host entry paths that converge on the same renderer. The
specialized code-block processor handles ordinary fences when Obsidian dispatches
them normally. A late Markdown HTML postprocessor then inspects any untouched
`<pre><code class="language-…">` blocks that remain, which covers nested containers
such as callouts on Obsidian paths where the specialized processor is skipped.
The fallback is structural rather than callout-specific, ignores unknown or
ambiguous language classes and complex third-party `<pre>` wrappers, and marks
processed output so repeated post-processing cannot render the same block twice.
'''
new = '''Reading View has two host entry paths that converge on the same renderer. The
specialized code-block processor handles ordinary fences when Obsidian dispatches
them normally. A late Markdown HTML postprocessor then inspects any untouched
`<pre><code class="language-…">` blocks that remain, which covers nested containers
such as callouts on Obsidian paths where the specialized processor is skipped.
The detector accepts normal host furniture next to the direct `<code>` child,
including Obsidian's copy button, and moves those existing nodes into the rendered
block so their identity and listeners survive. Unknown or genuinely ambiguous
structures remain untouched, and processed output is marked for idempotence.

Live Preview uses a complementary host bridge because callouts may be rendered by
CodeMirror as `.cm-embed-block` widgets rather than as the source lines decorated
by the normal Markdown highlighter. A ViewPlugin scoped to its own `EditorView`
observes only those embedded widgets, routes recognized code DOM through the same
renderer, preserves host controls, and handles widget insertion/recreation without
scanning the whole document or depending on a callout name.
'''
if old not in text:
    raise RuntimeError("README host paragraph not found")
readme.write_text(text.replace(old, new, 1), encoding="utf-8")

theme = root / "docs/theme-integration.md"
text = theme.read_text(encoding="utf-8")
old = '''The fallback deliberately fails closed. It ignores unknown languages, multiple
distinct `language-*` classes, deceptive class names, complex `<pre>` elements
that already contain third-party UI, and any subtree already produced by Syntax
Highlight. Candidates are snapshotted before DOM replacement and processed output
is marked, making repeated postprocessor passes idempotent. The fallback also
handles recognized aliases that cannot be registered as specialized processors,
such as names containing characters rejected by Obsidian's processor selector.
'''
new = '''The fallback deliberately fails closed. It ignores unknown languages, multiple
distinct `language-*` classes, deceptive class names, `<pre>` elements with zero
or multiple direct `<code>` children, and any subtree already produced by Syntax
Highlight. Auxiliary direct children are treated as host furniture rather than as
ambiguity: existing nodes such as `button.copy-code-button` are moved into the
replacement `<pre>`, preserving node identity and listeners. Candidates are
snapshotted before replacement and processed output is marked, making repeated
postprocessor passes idempotent. The fallback also handles recognized aliases that
cannot be registered as specialized processors, such as names containing
characters rejected by Obsidian's processor selector.

### Live Preview embedded-widget bridge

The source-oriented CodeMirror decorations remain the primary path while fenced
Markdown lines are directly represented in the editor. They are not assumed to
own every visible DOM node, however. Obsidian can materialize a callout as a
`.cm-embed-block` widget whose nested `<pre><code>` is separate from those source
lines. Syntax Highlight therefore installs a second ViewPlugin scoped to each
`EditorView`. It observes only that view's DOM for embedded-widget mutations and
runs a requestAnimationFrame-batched scan of `.cm-embed-block` subtrees.

Recognized widget code blocks reuse the same structural candidate detector and
resolved fence renderer as Reading View. Unknown/ambiguous blocks remain native,
Syntax Highlight output is skipped on later scans, auxiliary host controls are
preserved, a failure in one widget does not prevent later widgets from being
processed, and removal/recreation by CodeMirror is handled by the mutation-driven
scan. The bridge is disconnected when its `EditorView` is destroyed. It does not
replace the quote-aware source decorations; both representations are required
because Live Preview can alternate between source DOM and rendered widget DOM.
'''
if old not in text:
    raise RuntimeError("theme fallback paragraph not found")
theme.write_text(text.replace(old, new, 1), encoding="utf-8")

changelog = root / "CHANGELOG.md"
text = changelog.read_text(encoding="utf-8")
anchor = "## Unreleased\n\n"
entry = '''- Harden nested Obsidian block integration against real host DOM: Reading View\n  now accepts and preserves copy/auxiliary controls beside fenced code, while Live\n  Preview also processes recognized code inside CodeMirror `.cm-embed-block`\n  widgets through an EditorView-scoped, mutation-driven bridge.\n'''
if anchor not in text:
    raise RuntimeError("changelog anchor not found")
changelog.write_text(text.replace(anchor, anchor + entry, 1), encoding="utf-8")

Path(__file__).unlink()
workflow = root / ".github/workflows/.tmp-update-nested-host-docs.yml"
if workflow.exists():
    workflow.unlink()
