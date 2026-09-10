# Active theme integration

The Obsidian adapter keeps common-language highlighting independent from any
specific community theme.

## How it follows the active theme

Common-language parsers still produce the plugin's semantic classes such as
`syntax-common-keyword` and `syntax-common-string`, but the rendered tokens also
carry the classes that Obsidian themes already target:

- Reading view uses Prism-compatible classes such as `token keyword`,
  `token string`, and `token function`.
- Editing view uses CodeMirror-compatible classes such as `cm-keyword`,
  `cm-string`, and `cm-def`.

That means switching the active Obsidian theme automatically changes syntax
colors through the normal CSS cascade. The plugin does not inspect the theme
name, ship theme-specific palettes, or need a theme-change watcher.

If a theme does not style those token classes, `styles.css` falls back to
Obsidian's semantic code variables (`--code-keyword`, `--code-string`,
`--code-function`, `--code-operator`, and the rest).

Some parsers intentionally leave parts of the source unclassified. Command
names, sigils, paths, whitespace, or other grammar-specific fragments may
therefore sit between highlighted ranges. Reading view keeps those fragments
verbatim and wraps them with `syntax-common-plain`, whose default color is the
active theme's `--text-normal`. This prevents a broken or missing code-normal
color in a community theme from making otherwise valid source visually vanish.

## Vault-level overrides

A vault or theme snippet can override the plugin's semantic bridge without
modifying the plugin. For example:

```css
.theme-dark {
  --syntax-common-text: var(--text-normal);
  --syntax-common-keyword: var(--text-accent);
  --syntax-common-string: var(--color-green);
  --syntax-common-operator: var(--color-cyan);
}
```

The `--syntax-common-*` variables have priority over the built-in fallback
mapping. Theme token selectors can still take precedence through normal CSS
specificity or `!important`, exactly as they do for Obsidian's own code blocks.

Configured language profiles such as MUD keep their explicit semantic theme
presets. Those presets no longer leak into ordinary common-language blocks;
their common palette is scoped to the settings preview only.
