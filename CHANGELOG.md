# Changelog

## 1.1.0

- Split MUD reserved words into semantic declaration, modifier, control-flow,
  quantifier/iterator, effect, and clause categories for every host.
- Classified `mut` as a declaration modifier and both words of `for each` as
  quantifiers/iterators.
- Removed Obsidian's duplicated MUD descriptor and consume the language pack as
  the single source of category metadata.
- Added distinct semantic colors to every built-in theme and corrected
  Catppuccin's light/dark MUD palettes.
- Migrated untouched legacy Catppuccin settings while preserving customized
  reserved-word colors as fallbacks for the new categories.

## 1.0.0

- Extracted the original Obsidian plugin history into an independent monorepo.
- Added host-neutral core and MUD language-pack APIs.
- Added HTML, CodeMirror 6, MCP App, CLI, and Obsidian adapters.
- Derived MUD compound operators and indirect contextual keywords from the
  current lexical and syntax grammars.
- Added portable configuration schema v2 with v1 import migration.
