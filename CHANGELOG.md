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

- Add host-neutral packages for core contracts, the MUD language pack, HTML,
  CodeMirror, MCP, and CLI integration.
- Move Obsidian integration into its own adapter package.
- Add grammar-driven highlighting, semantic themes, portable profiles, source
  editing, smart editing, and deterministic formatting.
