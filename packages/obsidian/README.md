# Syntax Highlight for Obsidian

Obsidian host adapter for syntax-highlight. It highlights Markdown fences in
reading and editing views, opens configured source extensions in a CodeMirror 6
editor, supports semantic themes, and provides smart editing for MUD when the
MUD profile is installed.

The optional MUD profile uses `@r3nner/syntax-highlight-language-mud`; compound
operators and indirect contextual words are therefore shared with every other
host. MUD is not part of a normal vault's configured language list. EBNF, ASDL,
TOML, and configurable generic profiles remain available by default.

Common languages such as JavaScript, Python, Bash, Nushell, and PowerShell follow
the active Obsidian theme automatically. Reading tokens expose Prism-compatible
classes, editing tokens expose CodeMirror-compatible classes, and both fall back
to Obsidian's semantic `--code-*` variables. PowerShell accepts `powershell`,
`pwsh`, and `ps1` fences and `.ps1`, `.psm1`, and `.psd1` source files through
CodeMirror's PowerShell stream mode.

Fenced blocks inside Markdown blockquotes are handled by the same pipeline as
top-level blocks. This includes Obsidian callouts because callouts are blockquote
containers: `> ```bash`, `> ```text`, presentational Text/Markdown variants, MUD,
and other configured/common languages keep their normal highlighting and
presentation without treating the container's `>` markers as source code.
Nested quote depth is preserved, and editor line-number widgets are anchored at
the actual code content rather than before the blockquote prefix.

Reading View has two host entry paths that converge on the same renderer. The
specialized code-block processor handles ordinary fences when Obsidian dispatches
them normally. A late Markdown HTML postprocessor then inspects any untouched
`<pre><code class="language-…">` blocks that remain, which covers nested containers
such as callouts on Obsidian paths where the specialized processor is skipped.
The fallback is structural rather than callout-specific, ignores unknown or
ambiguous language classes and complex third-party `<pre>` wrappers, and marks
processed output so repeated post-processing cannot render the same block twice.

Text and Markdown fences are presentational families rather than ordinary code
furniture. `text`, `plaintext`, and `txt` remain parserless and use the active
theme and contrast bridge without inventing syntax categories; `md` and
`markdown` retain Markdown syntax highlighting. Neither family shows a language
badge or plugin line numbers. Each family has independent vault defaults for
left/center/right alignment and Ragged/Justified flow. Hyphen modifiers override
one block, for example `text-right-justified`, `text-center`, `markdown-ragged`,
or `md-center-ragged`; canonical full form is `base-alignment-flow`. Changing a
default can either let inherited blocks adopt it or preserve their appearance by
rewriting only affected opening fences to explicit modifiers. Text remains
Markdown-block only and does not claim `.txt` files, while `.md` continues to use
Obsidian's native Markdown editor. No community theme is hardcoded. See
[`docs/theme-integration.md`](../../docs/theme-integration.md) for the bridge,
presentation semantics, and vault-level override variables.

## Local installation

From the repository root:

```sh
npm ci
npm run install:obsidian -- --vault /path/to/vault
```

The installer requires an explicit vault. It safely migrates settings from the
legacy `mud-syntax-highlighter` id and leaves the old directory untouched.
Existing settings are preserved when no install profile is supplied.

For a vault that should contain only the ordinary Syntax Highlight profiles,
such as a general programming or class-notes vault, apply the `common` profile:

```sh
npm run install:obsidian -- --vault /path/to/vault --profile common
```

`common` removes any stored MUD profile from that vault while leaving every
other plugin setting untouched.

For the MUD vault, apply the `mud` profile:

```sh
npm run install:obsidian -- --vault /path/to/mud-vault --profile mud
```

`mud` adds the built-in MUD profile when it is absent or enables the existing
one when present. Existing MUD palette, grammar paths, custom theme, and other
per-vault configuration are preserved. The two vaults therefore use the same
plugin build but maintain independent language configuration in their own
`.obsidian/plugins/syntax-highlight/data.json` files.

## Manual check

After reloading Obsidian, verify Bash, Nushell, PowerShell, Text, and Markdown
fences under the active vault theme, both top-level and inside a normal
blockquote/callout. Text/Markdown should show neither a language badge nor plugin
line numbers; check the configured alignment and flow plus explicit forms such as
`text-right-justified` and `markdown-center-ragged` in both Reading view and
Markdown editing. Markdown must retain syntax highlighting, and Justified should
affect visually wrapped lines while using the selected alignment for the last
line. PowerShell should highlight commands, variables, strings, operators, and
comments and should also open `.ps1`, `.psm1`, and `.psd1` source files with the
common source editor. In a vault installed with `--profile mud`, also verify a MUD
fence in reading and editing views, a `.mud` source file, `~format`, `cycle`,
compact ranges such as `0..10`, and the current compound operators. See the
repository migration guide before removing the legacy installation.
