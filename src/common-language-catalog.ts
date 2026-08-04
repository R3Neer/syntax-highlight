import { commonLanguages } from "./common-languages";

type Translate = (english: string, spanish: string) => string;

function append<K extends keyof HTMLElementTagNameMap>(
  parent: HTMLElement,
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = parent.ownerDocument.createElement(tag);
  if (className !== undefined) element.className = className;
  parent.append(element);
  return element;
}

export function renderCommonLanguageCatalog(
  parent: HTMLElement,
  tr: Translate,
): void {
  const languages = commonLanguages();
  const details = append(parent, "details", "syntax-common-language-catalog");
  details.open = true;
  const summary = append(details, "summary");
  summary.textContent = `${tr(
    "Built-in common languages",
    "Lenguajes comunes integrados",
  )} (${languages.length})`;
  const description = append(details, "p", "setting-item-description");
  description.textContent = tr(
    "Available directly in Markdown code blocks and, except Markdown, in the source-file editor. They do not require configurable descriptors.",
    "Disponibles directamente en bloques de código Markdown y, salvo Markdown, en el editor de archivos fuente. No necesitan descriptores configurables.",
  );
  const grid = append(details, "div", "syntax-common-language-grid");
  for (const language of languages) {
    const item = append(grid, "div", "syntax-common-language-item");
    item.dataset.languageId = language.id;
    const name = append(item, "strong");
    name.textContent = language.name;
    const metadata = append(item, "small");
    const extensionText = language.id === "markdown"
      ? tr("native Obsidian editor", "editor nativo de Obsidian")
      : `${tr("extensions", "extensiones")}: ${language.extensions
          .map((extension) => `.${extension}`)
          .join(", ")}`;
    metadata.textContent = `${tr("blocks", "bloques")}: ${language.fences.join(", ")} · ${extensionText}`;
  }
}
