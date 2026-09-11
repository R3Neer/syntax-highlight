# Architecture

Syntax Highlight is a host-neutral highlighting and formatting monorepo. The
core rule is that language knowledge flows outward into adapters, never back from
a host into a language pack.

```text
core <- language packs
core <- renderers and editor adapters
core + renderer <- host adapters
```

## Core and language packs

`@r3nner/syntax-highlight-core` owns the stable contracts: UTF-16 offsets,
sorted non-overlapping highlight spans, minimal text edits, format results,
themes, and the versioned `LanguagePackV2` shape. It has no DOM, Obsidian,
CodeMirror, or MUD dependency.

Language packs own tokenization and formatting. The MUD pack parses its grammar
snapshot and derives operators and contextual words from that grammar rather than
from host-specific tables. Host adapters consume the resulting categories; they
do not reclassify MUD syntax.

Renderers consume `HighlightDocument`. Formatters return edits and formatted
text so callers can choose atomic editor transactions or headless output.

## Obsidian adapter boundaries

The Obsidian adapter has two deliberately different rendering paths because
Obsidian itself has two owners for Markdown code blocks.

### Markdown source / Live Preview

While Markdown source is editable, CodeMirror owns the DOM. Syntax Highlight
uses a `ViewPlugin` and contributes only documented CodeMirror decorations:

- `Decoration.mark` for semantic ranges;
- `Decoration.line` for quoted-code surface and Text/Markdown presentation;
- inline widgets for plugin line numbers.

The plugin does not mutate CodeMirror's DOM and does not depend on private
`.cm-embed-block`/`HyperMD-*` structure for behavior.

A document model discovers accepted fenced blocks once per document/settings
revision. Expensive language semantics are computed only for blocks that
intersect the visible ranges and cached until the document or language revision
changes. Scroll and selection changes rematerialize decorations without
reparsing unchanged blocks.

### Rendered Markdown / Reading View

Rendered fences use Obsidian's public Markdown processing APIs. Registered
`registerMarkdownCodeBlockProcessor` handlers are the primary path. A structural
Markdown postprocessor provides a fail-closed fallback for recognized native
`<pre><code class="language-…">` output that Obsidian leaves unclaimed in Reading
View or another rendered Markdown subtree.

The fallback is host-neutral: it validates direct PRE/CODE structure, accepted
language metadata and ambiguity before replacing anything. Existing direct host
furniture such as copy controls is preserved. Unknown or ambiguous blocks remain
native, and processed output is marked so repeated postprocessor passes are
idempotent.

Both paths converge on the same configured/common renderers, so language
semantics, Text/Markdown presentation and line-number policy do not fork based on
how the host delivered a rendered fence.

## Quote-aware Markdown model

Fenced blocks inside blockquotes and Obsidian callouts are represented with two
coordinate systems:

- **physical coordinates** describe the original Markdown, including quote
  prefixes;
- **logical coordinates** describe the code body after container quote markers
  are stripped.

Language parsers see only the logical body. Token ranges are mapped back to
physical UTF-16 offsets before CodeMirror decorations are created. This keeps
`>` markers out of syntax spans, preserves nested quote depth, and lets line
numbers anchor at the real source content.

The same scanner is used by Text/Markdown presentation and by preservation
rewrites when a vault default changes, so those operations preserve quote
prefixes, fence characters, body text and extra opening-line info.

## Common-language semantic engine

Common languages use one semantic taxonomy (`syntax-common-*`) even though the
underlying parser engines differ:

- **tree** engines use Lezer language packages;
- **stream** engines use CodeMirror `StreamParser` modes such as PowerShell;
- **plain** engines, currently Text, keep the whole body as unclassified text.

A single `COMMON_SEMANTIC_HIGHLIGHTER` maps public Lezer tags to the plugin's
semantic classes. Tree-backed manual rendering walks the language tree. Stream
modes are scanned with the public `StringStream`/`StreamParser` contract and an
explicit token-tag table; their effective CodeMirror parser uses the same tag
mapping. This keeps PowerShell's source editor and manual Markdown/Reading paths
on the same semantic taxonomy without depending on private CodeMirror aliases.

## Runtime ownership

The Obsidian bundle externalizes the same host runtime families as the official
Obsidian sample plugin: Obsidian, CodeMirror core modules, Lezer core modules,
Electron and Node built-ins. Language packages remain bundled, but their imports
resolve against Obsidian's CodeMirror/Lezer runtime.

This identity boundary matters for objects such as tags, node properties,
facets and editor state. The build emits a metafile guard that fails if a host
runtime package is accidentally bundled.

## Theme and contrast ownership

Source-mode CodeMirror DOM belongs to Obsidian. Syntax Highlight styles its own
source line/token classes through CSS variables and never uses JavaScript to
rewrite those spans.

Rendered output belongs to Syntax Highlight inside `.syntax-highlight-frame`.
Only that owned DOM is eligible for the runtime common-language contrast
normalizer. The normalizer leaves colors that already reach WCAG AA `4.5:1`
unchanged and adjusts only failing foreground colors; it never changes
backgrounds.

See [`theme-integration.md`](theme-integration.md) for the semantic classes,
quoted-source palette and public Obsidian CSS-variable bridge.

## Settings and modes

`markdownEditor` controls Markdown source/Live Preview integration;
`markdownReading` controls rendered/Reading highlighting. When a public
`MarkdownView` owner is available, `MarkdownView.getMode()` determines which
setting applies. DOM containment is preferred to file-path matching so embedded
or transcluded Markdown can still resolve to its owning view.

Configured source extensions use Syntax Highlight's dedicated CodeMirror source
view. Common source extensions use their CodeMirror language support plus the
same semantic highlighter; Markdown and `.txt` remain owned by Obsidian unless a
specific feature says otherwise.
