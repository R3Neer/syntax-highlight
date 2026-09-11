# Syntax Highlight for Obsidian

Obsidian host adapter for Syntax Highlight. It highlights Markdown fences in
Reading View and Live Preview, opens supported source extensions in CodeMirror 6,
supports semantic themes, provides Text/Markdown presentation controls, and adds
smart editing for configured languages such as MUD.

## Languages and Markdown fences

Common languages include JavaScript/TypeScript, JSON, HTML, CSS, Bash, Nushell,
PowerShell, Python, Java, C/C++, C#, SQL, YAML, Markdown, and Text. Configured
language profiles such as MUD use the same host pipeline but keep their own
language-pack semantics.

PowerShell accepts `powershell`, `pwsh`, and `ps1` fences plus `.ps1`, `.psm1`,
and `.psd1` source extensions. Its stream parser is mapped into the same
`syntax-common-*` semantic taxonomy used by tree-backed common languages.

Fenced blocks inside Markdown blockquotes use the same logical language body as
top-level blocks. This includes Obsidian callouts because their Markdown body is
a blockquote. Quote markers are container syntax: they are stripped before
parsing and semantic ranges are mapped back to physical document offsets, so
`>` is never colored as source code.

## Live Preview and Reading View

While Markdown source is editable, CodeMirror owns the DOM. Syntax Highlight
uses a `ViewPlugin` and contributes documented CodeMirror decorations for token
ranges, quoted-code line surfaces, presentation and line numbers. It does not
mutate CodeMirror DOM or depend on private `.cm-embed-block` structure.

Rendered fences use Obsidian's Markdown processing APIs. Registered code-block
processors are the primary path; a structural Markdown postprocessor provides a
fail-closed fallback for recognized native `<pre><code class="language-…">`
blocks that remain unclaimed in rendered Markdown. Unknown/ambiguous structures
stay native, direct host furniture such as copy controls is preserved, and
processed output is idempotent.

Quoted source uses a plugin-owned dark code surface and semantic palette. The
surface is bridged through Obsidian's public `--blockquote-background-color`
variable so the host's blockquote styling and Syntax Highlight's code surface do
not fight by selector specificity. See
[`docs/theme-integration.md`](../../docs/theme-integration.md) for variables and
theme-author guidance.

## Text and Markdown presentation

Text and Markdown fences are presentation families:

- `text`, `plaintext`, `txt`: parserless Text;
- `md`, `markdown`: Markdown with syntax highlighting.

Neither family shows code-only badge/line-number furniture in Markdown blocks.
Each family has independent vault defaults for alignment (`left`, `center`,
`right`) and flow (`ragged`, `justified`). Hyphen modifiers override one block,
for example:

```text
text-center
text-right-justified
markdown-ragged
md-center-ragged
```

Changing a family default can preserve existing appearance by rewriting only the
opening fence labels of affected blocks to explicit canonical modifiers. Quote
prefixes, body text, closing fences and opening-line info are preserved.

Text remains Markdown-block only and does not claim `.txt` files. `.md` remains
owned by Obsidian's Markdown editor.

## Themes and contrast

Common languages use stable plugin semantic classes (`syntax-common-*`) and
public Obsidian CSS variables. No community theme is hardcoded.

JavaScript contrast normalization is restricted to rendered DOM owned by Syntax
Highlight under `.syntax-highlight-frame`; CodeMirror source DOM is never
rewritten by JavaScript. Passing colors are left unchanged, while failing
rendered common-language foregrounds are adjusted toward WCAG AA `4.5:1` without
changing backgrounds.

## Local installation

From the repository root:

```sh
npm ci
npm run install:obsidian -- --vault /path/to/vault
```

The installer requires an explicit vault. It safely migrates settings from the
legacy `mud-syntax-highlighter` id and leaves the old directory untouched.
Existing settings are preserved when no install profile is supplied.

For a general vault without MUD:

```sh
npm run install:obsidian -- --vault /path/to/vault --profile common
```

`common` removes any stored MUD profile from that destination vault while leaving
other plugin settings untouched.

For a MUD vault:

```sh
npm run install:obsidian -- --vault /path/to/mud-vault --profile mud
```

`mud` adds the built-in MUD profile when absent or enables the existing one when
present. Existing MUD palette, grammar paths, custom theme and other per-vault
settings are preserved. Different vaults therefore use the same plugin build but
keep independent `.obsidian/plugins/syntax-highlight/data.json` files.

See [`docs/migration.md`](../../docs/migration.md) before removing a legacy
installation.

## Manual check

After reloading Obsidian, verify Bash, Nushell, PowerShell, Text and Markdown
fences both top-level and inside a normal blockquote/callout.

- PowerShell should distinguish variables, numbers, strings, operators, commands
  and comments in source and rendered Markdown.
- Quoted code should keep a continuous code surface while editing and return to
  normal rendered output when the cursor leaves the block.
- Text/Markdown should keep configured alignment/flow in Reading and Editing.
- `.ps1`, `.psm1`, `.psd1` and other supported common source extensions should
  open in the common source editor.
- A vault installed with `--profile mud` should also verify MUD fences, `.mud`
  source files, formatting commands and current grammar-derived operators.
