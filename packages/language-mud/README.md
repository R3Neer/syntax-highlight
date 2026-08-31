# @r3nner/syntax-highlight-language-mud

MUD language pack with grammar-derived tokenization and deterministic horizontal
formatting. It can use the embedded grammar snapshot or caller-provided EBNF.
Reserved words are emitted as semantic families, including declaration heads,
declaration modifiers, control flow, effects, clauses, and
quantifiers/iterators. `mut` is a declaration modifier and both words in
`for each` share the quantifier category. Hosts require no MUD-specific rules.
