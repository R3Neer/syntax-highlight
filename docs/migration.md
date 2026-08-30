# Migration from the MUD repository plugin

The old Obsidian id was `mud-syntax-highlighter`; the standalone plugin uses
`syntax-highlight`. Build and install into an explicit vault:

```sh
npm run install:obsidian -- --vault /path/to/vault
```

If the new installation has no `data.json`, the installer copies the legacy
settings. It replaces the old id in `community-plugins.json`, but does not delete
or modify the legacy plugin directory. Reload Obsidian, check MUD blocks in
reading and editing views, check a `.mud` file, and only then remove the old
directory manually if desired.

Portable JSON schema v2 separates the language profile and its grammar payload.
The importer accepts v1 settings, language bundles, and themes and normalizes
them to v2 before validation.
