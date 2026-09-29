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
  disabledSourceLanguages: ReadonlySet<string>,
  onSourceFileToggle: (languageId: string, enabled: boolean) => void | Promise<void>,
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
    "Markdown code blocks remain highlighted. Turn off a source-file switch to release that language's extensions after a plugin reload. Another handler can then take them; without one, Obsidian may hide those files. Markdown keeps Obsidian's native editor.",
    "Los bloques de código Markdown siguen resaltados. Desactiva un interruptor de archivos fuente para liberar esas extensiones tras recargar el plugin. Podrá encargarse otro editor; sin uno, Obsidian podría ocultar los archivos. Markdown conserva el editor nativo de Obsidian.",
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
      : language.extensions.length === 0
        ? tr("Markdown blocks only", "solo bloques Markdown")
        : `${tr("extensions", "extensiones")}: ${language.extensions
            .map((extension) => `.${extension}`)
            .join(", ")}`;
    metadata.textContent = `${tr("blocks", "bloques")}: ${language.fences.join(", ")} · ${extensionText}`;
    if (language.extensions.length === 0 || language.id === "markdown") continue;
    const label = append(item, "label", "syntax-common-language-toggle");
    const toggle = append(label, "input");
    toggle.type = "checkbox";
    toggle.setAttribute("role", "switch");
    toggle.checked = !disabledSourceLanguages.has(language.id);
    toggle.setAttribute("aria-label", `${tr("Open source files with Syntax Highlight", "Abrir archivos fuente con Syntax Highlight")}: ${language.name}`);
    toggle.addEventListener("change", () => void onSourceFileToggle(language.id, toggle.checked));
    const text = append(label, "span");
    text.textContent = tr("Open source files", "Abrir archivos fuente");
  }
}
