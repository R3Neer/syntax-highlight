import { BUILTIN_DESCRIPTORS, type LanguageDescriptor } from "./descriptor";
import type { LanguageRegistry } from "./languages";
import {
  effectiveCategoryColor,
  type SyntaxPluginSettings,
} from "./settings";

function safeId(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, "-");
}

export function buildThemeCss(
  settings: SyntaxPluginSettings,
  descriptors: ReadonlyMap<string, LanguageDescriptor> = new Map(),
): string {
  const rules: string[] = [];
  const commonPalette =
    settings.languages.find(({ id }) => id === "mud")?.palette ??
    settings.languages[0]?.palette;
  if (commonPalette !== undefined) {
    for (const mode of ["light", "dark"] as const) {
      const palette = commonPalette[mode];
      rules.push(
        `.theme-${mode}{` +
          `--syntax-common-comment:${palette.comment};` +
          `--syntax-common-keyword:${palette.keyword};` +
          `--syntax-common-type:${palette.type};` +
          `--syntax-common-callable:${palette.callable};` +
          `--syntax-common-declaration:${palette.declaration};` +
          `--syntax-common-string:${palette.string};` +
          `--syntax-common-number:${palette.number};` +
          `--syntax-common-operator:${palette.operator};` +
          `--syntax-common-delimiter:${palette.delimiter};` +
          `--syntax-common-punctuation:${palette.punctuation};` +
          `--syntax-common-meta:${palette.meta}` +
          `}`,
      );
    }
  }
  for (const language of settings.languages) {
    const descriptor =
      descriptors.get(language.id) ??
      language.embeddedDescriptor ??
      BUILTIN_DESCRIPTORS[language.id] ??
      BUILTIN_DESCRIPTORS.generic;
    const languageId = safeId(language.id);
    for (const mode of ["light", "dark"] as const) {
      for (const category of descriptor.categories) {
        rules.push(
          `.theme-${mode} .syntax-color-${languageId}-${safeId(category.id)}` +
            `{color:${effectiveCategoryColor(language, descriptor, category.id, mode)}!important}`,
        );
      }
    }
  }
  return rules.join("\n");
}

export class ThemeManager {
  private readonly element = document.createElement("style");

  constructor() {
    this.element.dataset.syntaxHighlightThemes = "true";
    document.head.append(this.element);
  }

  apply(settings: SyntaxPluginSettings, registry?: LanguageRegistry): void {
    const descriptors = new Map(
      registry?.enabled().map(({ settings: profile, descriptor }) => [
        profile.id,
        descriptor,
      ]) ?? [],
    );
    this.element.textContent = buildThemeCss(settings, descriptors);
  }

  dispose(): void {
    this.element.remove();
  }
}
