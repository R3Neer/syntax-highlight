import { Plugin } from "obsidian";

import { mudEditorHighlighter } from "./editor";
import { renderMudCode } from "./reading";

export default class MudSyntaxPlugin extends Plugin {
  override onload(): void {
    this.registerEditorExtension(mudEditorHighlighter);
    this.registerMarkdownCodeBlockProcessor("mud", (source, element) => {
      renderMudCode(source, element);
    });
  }
}
