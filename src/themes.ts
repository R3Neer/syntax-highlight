import type { SyntaxPluginSettings } from "./settings";
import { ALL_TOKEN_KINDS } from "./settings";

function safeId(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, "-");
}

export function buildThemeCss(settings: SyntaxPluginSettings): string {
  const rules: string[] = [];
  for (const language of settings.languages) {
    const id = safeId(language.id);
    for (const mode of ["light", "dark"] as const) {
      for (const kind of ALL_TOKEN_KINDS) {
        rules.push(
          `.theme-${mode} .syntax-color-${id}-${kind}{color:${language.palette[mode][kind]}!important}`,
        );
      }
    }
  }
  return rules.join("\n");
}

export class ThemeManager {
  private readonly element = document.createElement("style");

  constructor() {
    this.element.dataset.mudSyntaxThemes = "true";
    document.head.append(this.element);
  }

  apply(settings: SyntaxPluginSettings): void {
    this.element.textContent = buildThemeCss(settings);
  }

  dispose(): void {
    this.element.remove();
  }
}
