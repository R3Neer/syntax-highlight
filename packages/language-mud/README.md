# @r3nner/syntax-highlight-language-mud

MUD language pack with grammar-derived tokenization and deterministic horizontal
formatting. It can use the embedded grammar snapshot or caller-provided EBNF.
Reserved words are emitted as semantic families, including declaration heads,
declaration modifiers, control flow, effects, clauses, and
quantifiers/iterators. `let` and `mut` are declaration modifiers; `foreach`
and its iteration `in`/filter `if` use the quantifier category. Both executable
iteration and pure comprehensions are supported. Hosts require no MUD-specific rules.
