# Changelog

## Unreleased

## 1.2.0

- Rebuilt the Obsidian Markdown integration around supported host boundaries:
  Live Preview source uses CodeMirror decorations only, rendered Markdown uses
  Obsidian code-block processors, and Reading View keeps a fail-closed structural
  fallback for recognized native `<pre><code>` blocks.
- Added quote-aware fenced-block handling for normal blockquotes and Obsidian
  callouts. Language parsers see the logical body without container `>` markers,
  semantic ranges map back to physical Markdown offsets, nested quote depth is
  preserved, and line numbers/presentation anchor at real source content.
- Added a shared common-language semantic engine for tree-backed, stream-backed,
  and plain languages. All manual paths use stable `syntax-common-*` roles rather
  than depending on private host token classes.
- Added PowerShell as a common language with `powershell`, `pwsh`, and `ps1`
  fences plus `.ps1`, `.psm1`, and `.psd1` source extensions. Its stream tokens
  are mapped explicitly onto the same public Lezer-tag taxonomy used by the
  source editor and rendered Markdown.
- Added parserless Text fences and configurable Text/Markdown presentation
  families. Per-vault defaults control left/center/right alignment and
  Ragged/Justified flow; hyphen modifiers override individual blocks and default
  changes can preserve affected fences by rewriting only their opening labels.
- Added a continuous dark editing surface for quoted fenced source, including
  semantic colors and line numbers. The surface integrates with Obsidian through
  the documented `--blockquote-background-color` variable instead of private
  Live Preview selectors or `!important` rules.
- Reworked common-language theme integration around plugin semantic classes and
  public Obsidian CSS variables. Community themes are not hardcoded; vault
  snippets can override `--syntax-common-*` and `--syntax-editor-code-*` hooks.
- Restricted automatic contrast normalization to rendered DOM owned by Syntax
  Highlight. Common-language foregrounds that already satisfy WCAG AA `4.5:1`
  remain unchanged; failing colors receive the smallest viable OKLab-lightness
  adjustment and backgrounds are never modified.
- Externalized the Obsidian/CodeMirror/Lezer runtime boundary in the plugin build
  and added build-time guards against accidentally bundling host runtime modules.
- Made common-language highlighting viewport-aware in Markdown source and cached
  semantic spans until the document or language revision changes.
- Preserved host copy/auxiliary controls when the Reading fallback replaces a
  native recognized code block; unknown and ambiguous structures remain native
  and repeated postprocessing is idempotent.
- Scoped configured syntax-preset colors to settings previews so they no longer
  leak into Bash, Nushell, PowerShell, or other common-language blocks.
- Removed MUD from the default configured-language list. The built-in MUD profile
  is added only when a vault opts into it.
- Added `common` and `mud` local-install profiles so one plugin build can serve
  multiple vaults without sharing language configuration. `common` removes a
  stored MUD profile from that vault, while `mud` adds/enables MUD and preserves
  existing MUD settings.

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
