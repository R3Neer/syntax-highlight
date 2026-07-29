import {
  type ButtonComponent,
  type DropdownComponent,
  Notice,
  PluginSettingTab,
  Setting,
  type TextComponent,
  normalizePath,
} from "obsidian";

import type SyntaxHighlightPlugin from "./main";
import { validateLanguageDescriptor } from "./descriptor";
import { renderSyntaxCode } from "./reading";
import {
  effectiveCategoryColor,
  newGenericProfile,
  THEME_PRESETS,
  themeById,
  type LanguageProfileSettings,
} from "./settings";

export class SyntaxSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: SyntaxHighlightPlugin) {
    super(plugin.app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("mud-syntax-settings");
    containerEl.createEl("h2", { text: "Syntax Highlight" });
    containerEl.createEl("p", {
      text: "Lenguajes descritos mediante JSON, gramáticas recargables y temas semánticos con excepciones por categoría.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Recargar archivos de lenguaje automáticamente")
      .setDesc("Vuelve a validar el descriptor JSON y las gramáticas cuando cambian.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.pluginSettings.autoReloadGrammar)
          .onChange(async (value) => {
            this.plugin.pluginSettings.autoReloadGrammar = value;
            await this.plugin.commitSettings(false);
          }),
      );

    for (const language of this.plugin.pluginSettings.languages) {
      this.renderLanguage(language);
    }

    new Setting(containerEl)
      .setName("Añadir lenguaje")
      .setDesc("Crea un perfil genérico con un descriptor JSON integrado y gramáticas EBNF.")
      .addButton((button) =>
        button.setButtonText("Nuevo perfil").setCta().onClick(async () => {
          const profile = newGenericProfile(this.uniqueId());
          this.plugin.pluginSettings.languages.push(profile);
          await this.plugin.commitSettings(false);
          this.display();
        }),
      );
  }

  private renderLanguage(language: LanguageProfileSettings): void {
    const runtime = this.plugin.registry.get(language.id);
    const descriptor = runtime?.descriptor ?? language.embeddedDescriptor;
    if (descriptor === undefined) return;
    const card = this.containerEl.createDiv("mud-syntax-language-card");
    const heading = card.createDiv("mud-syntax-language-heading");
    heading.createEl("h3", { text: descriptor.name });
    heading.createSpan({
      text: runtime?.status.message ?? "Sin cargar",
      cls: `mud-syntax-status is-${runtime?.status.state ?? "loading"}`,
    });

    new Setting(card)
      .setName("Activado")
      .addToggle((toggle) =>
        toggle.setValue(language.enabled).onChange(async (value) => {
          language.enabled = value;
          await this.plugin.commitSettings(false);
        }),
      );

    new Setting(card)
      .setName("Descriptor JSON")
      .setDesc("Ruta dentro de la bóveda. Déjala vacía para usar el descriptor integrado del perfil.")
      .addText((text) =>
        text
          .setPlaceholder("ruta/lenguaje.json")
          .setValue(language.descriptorPath)
          .onChange(async (value) => {
            language.descriptorPath = value.trim();
            await this.plugin.commitSettings(false);
          }),
      )
      .addButton((button) =>
        button.setButtonText("Cargar").onClick(async () => {
          await this.plugin.reloadLanguage(language.id, true);
          this.display();
        }),
      )
      .addButton((button) =>
        button.setButtonText("Importar").onClick(async () => {
          if (!language.descriptorPath) {
            new Notice("Escribe primero la ruta de un descriptor JSON.");
            return;
          }
          try {
            const source = await this.plugin.app.vault.adapter.read(
              normalizePath(language.descriptorPath),
            );
            const imported = validateLanguageDescriptor(JSON.parse(source));
            if (imported.id !== language.id) {
              throw new Error(`El id debe ser ${language.id}.`);
            }
            language.embeddedDescriptor = imported;
            language.descriptorPath = "";
            await this.plugin.commitSettings(false);
            await this.plugin.reloadLanguage(language.id, true);
            this.display();
          } catch (error) {
            new Notice(
              error instanceof Error ? error.message : "No se pudo importar el descriptor.",
            );
          }
        }),
      );

    card.createEl("p", {
      text: `Bloques: ${descriptor.fences.join(", ") || "ninguno"} · Extensiones: ${
        descriptor.extensions.join(", ") || "ninguna"
      }`,
      cls: "setting-item-description",
    });

    if (language.embeddedDescriptor !== undefined) {
      this.renderEmbeddedDescriptor(card, language);
    }
    if (descriptor.engine === "mud" || descriptor.engine === "grammar") {
      this.renderGrammarFields(card, language);
    }
    this.renderTheme(card, language);
    this.renderPreview(card, language);

    const actions = new Setting(card)
      .setName("Validación")
      .setDesc("Conserva el último descriptor y la última gramática válidos si la recarga falla.")
      .addButton((button) =>
        button.setButtonText("Validar y recargar").onClick(async () => {
          await this.plugin.reloadLanguage(language.id, true);
          this.display();
        }),
      );
    if (!["mud", "ebnf", "asdl"].includes(language.id)) {
      actions.addButton((button) =>
        button.setButtonText("Eliminar perfil").setWarning().onClick(async () => {
          this.plugin.pluginSettings.languages =
            this.plugin.pluginSettings.languages.filter(({ id }) => id !== language.id);
          await this.plugin.commitSettings(false);
          this.display();
        }),
      );
    }
  }

  private renderEmbeddedDescriptor(
    card: HTMLElement,
    language: LanguageProfileSettings,
  ): void {
    const details = card.createEl("details", { cls: "mud-syntax-colors" });
    details.createEl("summary", { text: "Descriptor integrado" });
    details.createEl("p", {
      text: "Se usa cuando no hay una ruta externa. Puedes editar nombres, categorías, aliases, mapeos y ejemplo sin recompilar.",
      cls: "setting-item-description",
    });
    let draft = JSON.stringify(language.embeddedDescriptor, null, 2);
    new Setting(details).addTextArea((text) => {
      text.setValue(draft).onChange((value) => {
        draft = value;
      });
      text.inputEl.rows = 14;
      text.inputEl.addClass("syntax-descriptor-editor");
    });
    new Setting(details).addButton((button) =>
      button.setButtonText("Aplicar descriptor").setCta().onClick(async () => {
        try {
          const descriptor = validateLanguageDescriptor(JSON.parse(draft));
          if (descriptor.id !== language.id) {
            throw new Error(`El id debe ser ${language.id}.`);
          }
          language.embeddedDescriptor = descriptor;
          await this.plugin.commitSettings(false);
          await this.plugin.reloadLanguage(language.id, true);
          this.display();
        } catch (error) {
          new Notice(
            error instanceof Error ? error.message : "Descriptor JSON inválido.",
          );
        }
      }),
    );
  }

  private renderGrammarFields(
    card: HTMLElement,
    language: LanguageProfileSettings,
  ): void {
    new Setting(card).setName("Gramática léxica").addText((text) =>
      text
        .setPlaceholder("ruta/lexico.ebnf")
        .setValue(language.lexicalGrammarPath)
        .onChange(async (value) => {
          language.lexicalGrammarPath = value.trim();
          await this.plugin.commitSettings(false);
        }),
    );
    new Setting(card).setName("Gramática sintáctica").addText((text) =>
      text
        .setPlaceholder("ruta/lenguaje.ebnf")
        .setValue(language.syntaxGrammarPath)
        .onChange(async (value) => {
          language.syntaxGrammarPath = value.trim();
          await this.plugin.commitSettings(false);
        }),
    );
    const descriptor = this.plugin.registry.get(language.id)?.descriptor;
    if (descriptor?.engine === "grammar") {
      new Setting(card)
        .setName("Símbolos iniciales")
        .setDesc("Producciones raíz léxica y sintáctica.")
        .addText((text) =>
          text.setValue(language.lexicalStart).onChange(async (value) => {
            language.lexicalStart = value.trim();
            await this.plugin.commitSettings(false);
          }),
        )
        .addText((text) =>
          text.setValue(language.syntaxStart).onChange(async (value) => {
            language.syntaxStart = value.trim();
            await this.plugin.commitSettings(false);
          }),
        );
    }
  }

  private renderTheme(
    card: HTMLElement,
    language: LanguageProfileSettings,
  ): void {
    const descriptor = this.plugin.registry.get(language.id)?.descriptor;
    if (descriptor === undefined) return;
    let dropdownControl: DropdownComponent | undefined;
    let nameControl: TextComponent | undefined;
    let saveButton: ButtonComponent | undefined;
    new Setting(card).setName("Plantilla de tema").addDropdown((dropdown) => {
      dropdownControl = dropdown;
      for (const theme of THEME_PRESETS) dropdown.addOption(theme.id, theme.name);
      for (const theme of this.plugin.pluginSettings.customThemes) {
        dropdown.addOption(theme.id, `${theme.name} · guardado`);
      }
      dropdown.addOption("custom", "Personalizado sin guardar");
      dropdown.setValue(language.themePreset).onChange(async (value) => {
        language.themePreset = value;
        const selected = themeById(this.plugin.pluginSettings, value);
        if (selected !== undefined) {
          language.palette = structuredClone(selected.palette);
          language.categoryColors = structuredClone(selected.overrides);
          language.customThemeName = value.startsWith("custom-") ? selected.name : "";
        }
        await this.plugin.commitSettings(false);
        this.display();
      });
    });

    new Setting(card)
      .setName("Guardar tema personalizado")
      .setDesc("Guarda la paleta común y sus excepciones por lenguaje y categoría.")
      .addText((text) => {
        nameControl = text;
        text
          .setPlaceholder("Nombre del tema")
          .setValue(language.customThemeName)
          .onChange((value) => {
            language.customThemeName = value;
          });
      })
      .addButton((button) => {
        saveButton = button;
        button
          .setButtonText("Guardar tema")
          .setDisabled(language.themePreset !== "custom")
          .onClick(async () => {
            const name = language.customThemeName.trim();
            if (!name) {
              new Notice("Escribe un nombre para guardar el tema.");
              return;
            }
            const existing = this.plugin.pluginSettings.customThemes.find(
              (theme) => theme.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
            );
            if (existing === undefined) {
              const id = this.uniqueThemeId(name);
              this.plugin.pluginSettings.customThemes.push({
                id,
                name,
                palette: structuredClone(language.palette),
                overrides: structuredClone(language.categoryColors),
              });
              language.themePreset = id;
            } else {
              existing.name = name;
              existing.palette = structuredClone(language.palette);
              existing.overrides = structuredClone(language.categoryColors);
              language.themePreset = existing.id;
            }
            await this.plugin.commitSettings(false);
            this.display();
          });
      });

    const colors = card.createEl("details", { cls: "mud-syntax-colors" });
    colors.createEl("summary", { text: "Personalizar categorías de este lenguaje" });
    for (const group of descriptor.groups) {
      const categories = descriptor.categories.filter(
        (category) => category.group === group.id,
      );
      if (categories.length === 0) continue;
      const section = colors.createDiv("syntax-category-section");
      section.createEl("h4", { text: group.name, cls: "syntax-category-group" });
      const grid = section.createDiv("mud-syntax-color-grid");
      for (const category of categories) {
        const row = grid.createDiv("mud-syntax-color-row");
        row.createSpan({ text: category.name });
        row.createEl("small", { text: category.description });
        for (const mode of ["light", "dark"] as const) {
          new Setting(row)
            .setName(mode === "light" ? "Claro" : "Oscuro")
            .addColorPicker((picker) =>
              picker
                .setValue(effectiveCategoryColor(language, descriptor, category.id, mode))
                .onChange(async (value) => {
                  const selected = themeById(
                    this.plugin.pluginSettings,
                    language.themePreset,
                  );
                  if (language.themePreset !== "custom") {
                    language.customThemeName =
                      selected === undefined ? "" : `${selected.name} personalizado`;
                    nameControl?.setValue(language.customThemeName);
                  }
                  const languageOverrides =
                    (language.categoryColors[language.id] ??= {});
                  (languageOverrides[category.id] ??= {})[mode] = value;
                  language.themePreset = "custom";
                  dropdownControl?.setValue("custom");
                  saveButton?.setDisabled(false);
                  await this.plugin.commitSettings(false);
                }),
            );
        }
      }
    }
  }

  private renderPreview(
    card: HTMLElement,
    language: LanguageProfileSettings,
  ): void {
    const runtime = this.plugin.registry.get(language.id);
    if (runtime === undefined) return;
    const section = card.createDiv("syntax-preview");
    section.createEl("h4", { text: "Vista previa" });
    section.createEl("p", {
      text: "Edita el ejemplo para comprobar inmediatamente las categorías y el tema.",
      cls: "setting-item-description",
    });
    const output = section.createDiv("syntax-preview-output");
    const source = (): string =>
      language.previewSource ?? runtime.descriptor.previewSource;
    const updateOutput = (): void => renderSyntaxCode(source(), output, runtime);
    new Setting(section)
      .addTextArea((text) => {
        text
          .setValue(source())
          .setPlaceholder("Escribe un fragmento de código…")
          .onChange(async (value) => {
            language.previewSource = value;
            await this.plugin.commitSettings(false);
            updateOutput();
          });
        text.inputEl.rows = 7;
        text.inputEl.addClass("syntax-preview-editor");
      })
      .addButton((button) =>
        button.setButtonText("Restaurar ejemplo").onClick(async () => {
          language.previewSource = null;
          await this.plugin.commitSettings(false);
          this.display();
        }),
      );
    updateOutput();
  }

  private uniqueId(): string {
    let index = 1;
    while (
      this.plugin.pluginSettings.languages.some(({ id }) => id === `language-${index}`)
    ) {
      index += 1;
    }
    return `language-${index}`;
  }

  private uniqueThemeId(name: string): string {
    const stem =
      name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "theme";
    let id = `custom-${stem}`;
    let suffix = 2;
    while (
      this.plugin.pluginSettings.customThemes.some((theme) => theme.id === id)
    ) {
      id = `custom-${stem}-${suffix}`;
      suffix += 1;
    }
    return id;
  }
}
