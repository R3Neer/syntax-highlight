# Syntax Highlight

Host-neutral syntax highlighting and deterministic formatting, with MUD as the
reference language pack. The monorepo keeps language knowledge separate from
renderers and host integrations so the same semantic spans and edits can be used
from a CLI, CodeMirror 6, Obsidian, an MCP App, or a server.

## Packages

| Package | Responsibility |
| --- | --- |
| `@r3nner/syntax-highlight-core` | Stable language-pack, span, edit, and formatter contracts |
| `@r3nner/syntax-highlight-language-mud` | Grammar-derived MUD tokenizer and formatter |
| `@r3nner/syntax-highlight-html` | Escaped HTML and theme CSS renderer |
| `@r3nner/syntax-highlight-codemirror` | CodeMirror 6 decorations and formatting changes |
| `@r3nner/syntax-highlight-mcp` | MCP App resource and tool-result helpers |
| `@r3nner/syntax-highlight-cli` | Headless `highlight` and `format` commands |
| `@r3nner/syntax-highlight-obsidian` | Obsidian Reading/Live Preview/source integration |

## Obsidian adapter

The Obsidian package supports common programming languages plus configured
language packs, including PowerShell stream-mode highlighting, fenced blocks
inside blockquotes/callouts, and configurable Text/Markdown presentation
families. Markdown source is decorated through CodeMirror's public extension
APIs; rendered Markdown uses Obsidian's code-block processors plus a structural
Reading fallback. Theme integration is based on stable `syntax-common-*` classes
and public Obsidian CSS variables rather than private Live Preview DOM.

See:

- [`packages/obsidian/README.md`](packages/obsidian/README.md) for usage and local installation;
- [`docs/architecture.md`](docs/architecture.md) for package/host boundaries;
- [`docs/theme-integration.md`](docs/theme-integration.md) for semantic classes,
  quoted-source styling and contrast behavior;
- [`docs/migration.md`](docs/migration.md) for the legacy Obsidian plugin migration.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run check
npm run pack:all
```

The MUD pack embeds a tested grammar snapshot. Check it against a MUD checkout:

```sh
node scripts/check-mud-compat.mjs --mud-root ../Mud
```

All packages are MIT licensed.
