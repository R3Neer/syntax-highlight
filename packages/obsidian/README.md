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

Parserless `text`, `plaintext`, and `txt` Markdown fences use the same active-theme
and contrast bridge without pretending that plain text has syntax categories.
They deliberately omit code-specific furniture: no language badge and no line
numbers, even when line numbers are enabled globally. The body remains
preformatted and theme-aware, and its foreground still participates in the same
automatic contrast normalization. No community theme is hardcoded. See
[`docs/theme-integration.md`](../../docs/theme-integration.md) for the bridge and
vault-level override variables.

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

After reloading Obsidian, verify Bash, Nushell, PowerShell, and `text` fences
under the active vault theme. Text blocks should have neither a language badge
nor line-number gutter while keeping literal content theme-aware and readable.
PowerShell should highlight commands, variables, strings, operators, and comments
and should also open `.ps1`, `.psm1`, and `.psd1` source files with the common
source editor. In a vault installed with `--profile mud`, also verify a MUD fence
in reading and editing views, a `.mud` source file, `~format`, `cycle`, compact
ranges such as `0..10`, and the current compound operators. See the repository
migration guide before removing the legacy installation.
