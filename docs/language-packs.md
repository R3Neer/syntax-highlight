# Language packs

A language pack implements `LanguagePackV2`: identity and aliases, categories,
a grammar revision, a tokenizer, and an optional deterministic formatter.
Tokenizers return sorted, non-overlapping UTF-16 spans. Formatters must preserve
strings and comments and should be idempotent.

Start with `@r3nner/syntax-highlight-core`, validate the descriptor with
`validateLanguagePack`, and test Unicode offsets, malformed input, comments,
strings, overlapping candidates, and repeated formatting. Grammar-driven packs
should derive operator and contextual inventories from their grammar instead of
maintaining host-specific lists.

Categories should describe semantic syntax families rather than collapse every
reserved word into one visual bucket. Hosts only consume category ids and role
fallbacks: distinctions such as declarations, modifiers, control flow, effects,
or quantifiers belong to the language pack and automatically reach every host.
If a presentation taxonomy refines a grammar inventory, test that its words are
still present in the grammar and retain a general fallback for newly introduced
words.

The MUD pack is an example with two EBNF inputs. `createMudAdapter` can use its
embedded snapshot or accept live grammar text, which lets the MUD repository
test new language revisions before releasing a new package.
