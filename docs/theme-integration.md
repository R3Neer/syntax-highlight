# Active theme integration

Common-language highlighting is intentionally theme-agnostic. The Obsidian adapter reuses the CSS hooks that active themes already style in Reading and Editing views, and falls back to Obsidian's semantic `--code-*` variables.

Users can override the bridge per vault or per theme with the plugin variables `--syntax-common-*` from a CSS snippet. These overrides have precedence over the built-in semantic fallbacks.
