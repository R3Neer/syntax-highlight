# Syntax Highlight

Host-neutral syntax highlighting and deterministic formatting, with MUD as the
reference language pack. The monorepo keeps language knowledge separate from
renderers and host integrations, so the same spans and edits can be used in a
CLI, CodeMirror 6, Obsidian, an MCP App, or a server.

## Packages

| Package | Responsibility |
| --- | --- |
| `@r3nner/syntax-highlight-core` | Stable language-pack, span, edit, and formatter contracts |
| `@r3nner/syntax-highlight-language-mud` | Grammar-derived MUD tokenizer and formatter |
| `@r3nner/syntax-highlight-html` | Escaped HTML and theme CSS renderer |
| `@r3nner/syntax-highlight-codemirror` | CodeMirror 6 decorations and formatting changes |
| `@r3nner/syntax-highlight-mcp` | MCP App resource and tool-result helpers |
| `@r3nner/syntax-highlight-cli` | Headless `highlight` and `format` commands |
| `@r3nner/syntax-highlight-obsidian` | Obsidian reading and editing integration |

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

Architecture, language-pack authoring, MCP integration, and migration are in
[`docs/`](docs/architecture.md). All packages are MIT licensed.
