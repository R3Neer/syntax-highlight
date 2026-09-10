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

That means the active Obsidian theme remains the source of syntax colors. The
plugin never branches on a theme name or ships a compatibility table for
community themes. If a theme does not style those token classes, `styles.css`
falls back to Obsidian's semantic code variables (`--code-keyword`,
`--code-string`, `--code-function`, `--code-operator`, and the rest).

Some parsers intentionally leave parts of the source unclassified. Command
sigils, paths, whitespace, or other grammar-specific fragments may therefore
sit between highlighted ranges. Reading view keeps those fragments verbatim and
wraps them with `syntax-common-plain`, whose default color is the active theme's
`--text-normal`.

## Automatic contrast normalization

After the theme has resolved the actual color of a common-language token,
Syntax Highlight checks that foreground against the effective CSS background
behind the token. The runtime target is WCAG AA normal-text contrast, `4.5:1`.
A token that already reaches the target is left exactly as the theme produced
it. The background is never modified.

When a foreground fails the target, the correction is deliberately perceptual
rather than a fixed darkening step:

1. Convert the resolved sRGB foreground to OKLab.
2. Search independently toward lower and higher perceptual lightness.
3. Preserve the original chromatic axes while possible. If a candidate leaves
   the sRGB gamut, reduce chroma only as much as necessary to bring it back.
4. Find the nearest passing candidate in each viable direction by binary search.
5. Choose the candidate with the smallest OKLab distance from the theme color.

This lets a pale token on a light background become darker while a dark token on
a dark background becomes lighter. Only a foreground that actually fails the
contrast constraint changes, and the selected correction is the smallest of the
two viable perceptual-lightness moves. Very translucent text keeps its alpha
when possible; opacity is allowed to rise only if no `4.5:1` solution exists at
the original alpha.

The effective background is built by alpha-compositing declared CSS
`background-color` values from the token through its ancestors. Background
images are not raster-sampled, so a theme that exposes a strongly varying image
through transparent code surfaces is an approximation: the declared color
layers are used, with the document canvas as the final fallback.

The normalizer watches newly rendered/reclassified syntax spans and the root
classes/styles used for theme or light/dark changes, then batches recalculation
to the next animation frame. Settings previews are excluded because they are
supposed to display the selected semantic preset exactly. Configured language
profiles such as MUD also remain outside this common-language normalizer and
keep their explicit semantic palettes.

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

The `--syntax-common-*` variables participate in exactly the same pipeline as a
community theme's own token selectors. Their resolved foreground is accepted
unchanged when it reaches `4.5:1`; otherwise it is contrast-normalized like any
other common-language color.
