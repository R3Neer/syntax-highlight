import { Notice, normalizePath, Plugin } from "obsidian";

import {
  DEFAULT_HIGHLIGHT_CONFIG,
  parseHighlightConfig,
  type MudHighlightConfig,
} from "./config";
import { createMudEditorHighlighter } from "./editor";
import { renderMudCode } from "./reading";

export default class MudSyntaxPlugin extends Plugin {
  private async loadHighlightConfig(): Promise<MudHighlightConfig> {
    const directory = this.manifest.dir;
    if (directory === undefined) return DEFAULT_HIGHLIGHT_CONFIG;
    const path = normalizePath(`${directory}/mud-highlight.json`);
    try {
      const source = await this.app.vault.adapter.read(path);
      return parseHighlightConfig(JSON.parse(source) as unknown);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error(`No se pudo cargar ${path}:`, error);
      new Notice(
        `MUD Syntax Highlight: configuración inválida; se usarán los valores predeterminados. ${detail}`,
      );
      return DEFAULT_HIGHLIGHT_CONFIG;
    }
  }

  override async onload(): Promise<void> {
    const config = await this.loadHighlightConfig();
    this.registerEditorExtension(createMudEditorHighlighter(config));
    this.registerMarkdownCodeBlockProcessor("mud", (source, element) => {
      renderMudCode(source, element, config);
    });
  }
}
