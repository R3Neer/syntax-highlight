# Syntax Highlight for Obsidian

Obsidian host adapter for syntax-highlight. It highlights Markdown fences in
reading and editing views, opens configured source extensions in a CodeMirror 6
editor, supports semantic themes, and provides smart editing for MUD.

The built-in MUD profile uses `@r3neer/syntax-highlight-language-mud`; compound
operators and indirect contextual words are therefore shared with every other
host. EBNF, ASDL, TOML, and configurable generic profiles remain available.

## Local installation

From the repository root:

```sh
npm ci
npm run install:obsidian -- --vault /path/to/vault
```

The installer requires an explicit vault. It safely migrates settings from the
legacy `mud-syntax-highlighter` id and leaves the old directory untouched.

## Manual check

After reloading Obsidian, verify a MUD fence in reading and editing views, a
`.mud` source file, `~format`, `cycle`, compact ranges such as `0..10`, and the
current compound operators. See the repository migration guide before removing
the legacy installation.
