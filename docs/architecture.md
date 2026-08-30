# Architecture

The dependency direction is deliberate:

```text
core <- language packs
core <- renderers and editor adapters
core + renderer <- host adapters
```

`core` owns UTF-16 offsets, sorted non-overlapping spans, minimal text edits,
format results, themes, and the versioned `LanguagePackV2` contract. It has no
DOM, Obsidian, CodeMirror, or MUD dependency.

Language packs own tokenization and formatting. The MUD pack parses the
canonical EBNF snapshot at startup. Its operator inventory comes from the
lexical grammar, while contextual metadata names and keywords come from
fixed-point grammar boundary analysis; host adapters do not duplicate these
tables.

Renderers consume `HighlightDocument`. Hosts may add transport or editor state,
but must preserve source text and UTF-16 span coordinates. Formatters return
edits and formatted text so callers can choose atomic editor transactions or
headless output.
