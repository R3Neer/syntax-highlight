# Changelog

## Unreleased

- Make common-language syntax colors follow the active Obsidian theme instead
  of knowing about any specific community theme.
- Emit Prism-compatible token classes in Reading view and CodeMirror-compatible
  classes in Editing view so existing theme syntax rules apply automatically.
- Fall back to Obsidian's semantic `--code-*` variables and keep
  `--syntax-common-*` as vault-level override hooks.
- Keep parser-unclassified common-language source visible in Reading view by
  rendering the untouched gaps explicitly with the active theme's normal text
  color. This covers commands, sigils, paths, and other source fragments that a
  language grammar does not assign a highlight tag.
- Treat `text`, `plaintext`, and `txt` Markdown fences as parserless common
  blocks that follow the active-vault theme and contrast policy without
  code-specific badge or line-number furniture; they still do not claim `.txt`
  files from Obsidian's normal file handling.
- Treat Text and Markdown fences as configurable presentation families: both
  omit code-only badge and line-number furniture, while Markdown retains syntax
  highlighting. Per-vault defaults choose left/center/right alignment and
  Ragged/Justified flow; canonical hyphen modifiers override individual blocks,
  and changing a default can preserve affected blocks by making their opening
  fences explicit.
- Apply the same fenced-block pipeline inside Markdown blockquotes and Obsidian
  callouts. Editing view strips only container quote markers before parsing and
  maps token ranges back to the physical document, so quoted code, Text/Markdown
  presentation, line numbers, MUD/configured languages, and preservation rewrites
  behave like their top-level equivalents without coloring `>` markers as code.
- Add a late Reading View HTML fallback for recognized fenced blocks that
  Obsidian does not deliver to the specialized code-block processor, including
  nested blockquotes/callouts. It reuses the same renderer, leaves unknown or
  ambiguous third-party blocks untouched, and is idempotent across repeated
  post-processing passes.
- Add PowerShell as a parser-backed common language with `powershell`, `pwsh`,
  and `ps1` fences plus `.ps1`, `.psm1`, and `.psd1` source extensions through
  CodeMirror's PowerShell stream mode.
- Normalize low-contrast common-language foreground colors automatically to a
  `4.5:1` target against their effective CSS background. Passing theme colors
  remain untouched; failing colors move by the smallest viable OKLab-lightness
  adjustment, searching both lighter and darker directions and gamut-mapping by
  reducing chroma when necessary. Background colors are never changed.
- Scope configured syntax-preset colors to settings previews so they no longer
  leak into ordinary Bash, Nushell, or other common-language code blocks.
- Remove MUD from the default configured language list. The built-in MUD profile
  is now added only when a vault explicitly opts into it.
- Add `common` and `mud` local-install profiles so one plugin build can serve
  multiple vaults: `common` removes stored MUD configuration, while `mud` adds
  or enables MUD and preserves that vault's existing MUD settings.

## 1.1.1

- Highlight `Interval` as the type constructor in declarations such as
  `Int Interval` and user-defined interval types.
- Migrate the known bundled MUD descriptors that older Obsidian installations
  stored as personal copies, restoring the six Catppuccin semantic accents
  without replacing genuinely edited descriptors.
- Give structural top-level modifiers their declaration color while grouping
  `cycle`, `ordered`, and `unique` with `mut`.
- Keep quantifiers and iteration headers visually distinct from inner declaration
  clauses, including the contextual `if` filter of `for each`.
- Treat `in` inside `for each` as part of the loop header and distinguish body
  colons in iteration, selection, and quantifier expressions from type annotations.
- Format iteration, selection, and quantifier body colons with a leading space,
  as in `forall x in 1..10 : x is A`, without changing type annotations.
- Give metadata its own semantic category and color, styling the `~` prefix and
  metadata name as one unit in every host.
- Color inherited names after `as` like the declaration they accompany, while
  keeping their normal font weight.

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
