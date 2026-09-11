# Active theme integration

The Obsidian adapter keeps common-language highlighting independent from any
specific community theme. The stable contract is the plugin's semantic taxonomy
plus public Obsidian CSS variables; private Live Preview DOM classes are not part
of the integration surface.

## Semantic classes

Common-language parsers resolve into classes such as:

- `syntax-common-comment`
- `syntax-common-keyword`
- `syntax-common-type`
- `syntax-common-variable`
- `syntax-common-callable`
- `syntax-common-declaration`
- `syntax-common-property`
- `syntax-common-string`
- `syntax-common-regex`
- `syntax-common-number`
- `syntax-common-operator`
- `syntax-common-delimiter`
- `syntax-common-punctuation`
- `syntax-common-meta`
- `syntax-common-invalid`

The same taxonomy is used by tree-backed languages, stream-backed languages such
as PowerShell, and the manual Markdown/Reading renderers. Text is parserless and
uses `syntax-common-plain` for its body.

Source and rendered Markdown are different host engines, so their DOM does not
have to be pixel-identical. The plugin guarantees semantic roles and stable
plugin classes, not the private token markup chosen by Obsidian in each mode.

## Theme variables and fallbacks

Outside the quoted-source dark surface, common semantic classes use public
Obsidian code/text variables as fallbacks. Vault snippets can override the
plugin variables directly:

```css
.theme-dark {
  --syntax-common-text: var(--text-normal);
  --syntax-common-keyword: var(--text-accent);
  --syntax-common-string: var(--color-green);
  --syntax-common-operator: var(--color-cyan);
}
```

The plugin never switches on a community-theme name and does not ship a theme
compatibility table.

## Quoted fences in Live Preview source

Fences inside blockquotes and callouts remain editable source in the same
CodeMirror `EditorView`. Syntax Highlight adds `Decoration.line` classes to
opening/body/closing lines and maps semantic marks only over the logical code
body, never over the quote prefix.

Quoted source deliberately uses a dark, continuous code surface. The line scope
sets plugin-owned dark-safe defaults for code colors and line numbers while
keeping `--code-background: transparent`, preventing Obsidian's inline-code
spans from creating separate light rectangles.

The line also bridges its source background through Obsidian's documented
blockquote variable:

```css
.cm-line.syntax-editor-code-source {
  --blockquote-background-color:
    var(--syntax-editor-code-background, #000);
  --code-background: transparent;
  background-color: var(--syntax-editor-code-background, #000);
}
```

This matters because a quoted line is simultaneously Syntax Highlight code
source and an Obsidian blockquote. The plugin supplies the value through the
host's public variable instead of competing with Obsidian using private selectors
or `!important`.

A theme or vault snippet can replace the default dark surface by defining:

```css
--syntax-editor-code-background
--syntax-editor-code-color
--syntax-editor-code-caret
--syntax-editor-code-line-number
```

The same surface contract applies to quoted Bash, PowerShell, configured
languages and Text/Markdown presentation fences.

## Blockquotes and Obsidian callouts

The Markdown scanner treats blockquote prefixes as container syntax. Language
parsers receive a logical body with those prefixes stripped; token ranges are
then mapped back to physical document offsets. Nested quote depth, real line
endings and opening/closing fence coordinates are preserved.

This means:

- `>` markers are never syntax-highlighted as code;
- line-number widgets anchor after the quote prefix;
- configured/common languages use the same semantics as top-level fences;
- Text/Markdown alignment and flow work inside normal blockquotes and callouts;
- preservation rewrites change only the opening fence label.

No callout-name table is required.

## Rendered Markdown and Reading View

Rendered code is owned by Syntax Highlight inside `.syntax-highlight-frame`.
Obsidian's registered code-block processors are the primary route. A structural
Markdown postprocessor provides a fail-closed fallback for recognized native
`<pre><code class="language-…">` blocks that remain unclaimed in rendered
Markdown.

The fallback validates PRE/CODE structure and language metadata before replacing
anything. Unknown or ambiguous blocks stay native. Existing direct host furniture,
including copy controls, is preserved and processed output is marked for
idempotence.

There is no production MutationObserver bridge for private `.cm-embed-block`
widgets. Live Preview source is handled through CodeMirror decorations, while
rendered Markdown uses Obsidian's supported Markdown processing path.

## Text and Markdown presentation families

Text and Markdown fences are presentation families rather than ordinary code
furniture:

- `text`, `plaintext`, `txt`: parserless Text family;
- `md`, `markdown`: Markdown family with syntax highlighting.

Neither family shows a language badge or plugin line numbers in Markdown blocks.
Each has independent vault defaults for:

- alignment: `left`, `center`, `right`;
- flow: `ragged`, `justified`.

Hyphen modifiers override one block. Canonical full form is
`base-alignment-flow`, for example:

```text
text-right-justified
text-center
markdown-ragged
md-center-ragged
```

Changing a default can either let inheriting blocks adopt it or preserve their
appearance. Preservation rewrites only affected opening fence labels to explicit
canonical modifiers while keeping the original alias, fence characters and
length, quote prefix, body, closing fence and extra opening-line info.

Text remains Markdown-block only and does not claim `.txt` files. `.md` remains
owned by Obsidian's Markdown editor.

## PowerShell and stream-backed languages

PowerShell uses CodeMirror's `StreamParser`, but manual Markdown/Reading
highlighting does not depend on private legacy token aliases. The common-language
catalog declares an explicit mapping from PowerShell stream token names to
public Lezer tags. Those tags feed the same `COMMON_SEMANTIC_HIGHLIGHTER` used by
source editing.

Supported PowerShell fences are `powershell`, `pwsh`, and `ps1`; source
extensions are `.ps1`, `.psm1`, and `.psd1`.

## Automatic contrast normalization

Runtime contrast normalization is intentionally limited to rendered DOM owned by
Syntax Highlight under `.syntax-highlight-frame`. CodeMirror source DOM is never
rewritten by JavaScript.

For rendered common-language tokens, the normalizer compares the resolved
foreground against the effective CSS background and targets WCAG AA normal-text
contrast (`4.5:1`). Passing theme colors remain unchanged. Failing colors are
adjusted by the smallest viable OKLab-lightness move, searching both lighter and
darker directions and reducing chroma only when needed to remain in gamut.
Backgrounds are never modified.

The effective background is built by alpha-compositing computed
`background-color` values through ancestors. CSS Color 4 values that Chromium
does not serialize as `rgb()`/`rgba()` are converted through a one-pixel sRGB
canvas fallback.

Settings previews and configured-language semantic palettes are excluded from
this common-language normalizer.

## Theme-author guidance

Prefer public variables and the plugin semantic variables. Do not target the
plugin through private Obsidian Live Preview structure.

Useful override hooks include:

```text
--syntax-common-text
--syntax-common-comment
--syntax-common-keyword
--syntax-common-type
--syntax-common-variable
--syntax-common-callable
--syntax-common-declaration
--syntax-common-property
--syntax-common-string
--syntax-common-regex
--syntax-common-number
--syntax-common-operator
--syntax-common-delimiter
--syntax-common-punctuation
--syntax-common-meta
--syntax-common-invalid
--syntax-editor-code-background
--syntax-editor-code-color
--syntax-editor-code-caret
--syntax-editor-code-line-number
--syntax-editor-code-radius
```

The quoted-source surface also feeds Obsidian's documented
`--blockquote-background-color` locally, but themes should normally override the
plugin's `--syntax-editor-code-background` rather than the blockquote variable
globally.
