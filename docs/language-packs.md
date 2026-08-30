# Language packs

A language pack implements `LanguagePackV2`: identity and aliases, categories,
a grammar revision, a tokenizer, and an optional deterministic formatter.
Tokenizers return sorted, non-overlapping UTF-16 spans. Formatters must preserve
strings and comments and should be idempotent.

Start with `@r3neer/syntax-highlight-core`, validate the descriptor with
`validateLanguagePack`, and test Unicode offsets, malformed input, comments,
strings, overlapping candidates, and repeated formatting. Grammar-driven packs
should derive operator and contextual inventories from their grammar instead of
maintaining host-specific lists.

The MUD pack is an example with two EBNF inputs. `createMudAdapter` can use its
embedded snapshot or accept live grammar text, which lets the MUD repository
test new language revisions before releasing a new package.
