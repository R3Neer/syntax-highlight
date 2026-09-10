# Syntax Highlight for Obsidian

Obsidian host adapter for syntax-highlight. It highlights Markdown fences in
reading and editing views, opens configured source extensions in a CodeMirror 6
editor, supports semantic themes, and provides smart editing for MUD.

The built-in MUD profile uses `@r3nner/syntax-highlight-language-mud`; compound
operators and indirect contextual words are therefore shared with every other
host. MUD is opt-in: ordinary vaults do not enable it by default. EBNF, ASDL,
TOML, and configurable generic profiles remain available.

Common languages such as JavaScript, Python, Bash, and Nushell follow the active
Obsidian theme automatically. Reading tokens expose Prism-compatible classes,
editing tokens expose CodeMirror-compatible classes, and both fall back to
Obsidian's semantic `--code-*` variables. No community theme is hardcoded. See
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

For a vault that should not use the MUD language support, such as a general
programming or class-notes vault, apply the `common` profile:

```sh
npm run install:obsidian -- --vault /path/to/vault --profile common
```

For the MUD vault, apply the `mud` profile:

```sh
npm run install:obsidian -- --vault /path/to/mud-vault --profile mud
```

The profile operation changes only the MUD profile's `enabled` flag. It keeps
that vault's existing MUD palette, grammar paths, custom theme, and every other
plugin setting intact. This makes the same plugin build safe to install in
multiple vaults while keeping their configuration independent.

## Manual check

After reloading Obsidian, verify Bash and Nushell fences under the active vault
theme. In a vault installed with `--profile mud`, also verify a MUD fence in
reading and editing views, a `.mud` source file, `~format`, `cycle`, compact
ranges such as `0..10`, and the current compound operators. See the repository
migration guide before removing the legacy installation.
