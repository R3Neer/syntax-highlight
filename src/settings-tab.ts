import {
  type ButtonComponent,
  type DropdownComponent,
  Notice,
  PluginSettingTab,
  Setting,
  type TextComponent,
} from "obsidian";

import type MudSyntaxPlugin from "./main";
import {
  DEFAULT_GRAMMAR_CATEGORIES,
  paletteFromPreset,
  THEME_PRESETS,
  themeById,
  tokenKindsFor,
  type LanguageProfileSettings,
} from "./settings";
import { renderSyntaxCode } from "./reading";

function fencesFrom(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^[A-Za-z0-9_-]+$/.test(item));
}

export class SyntaxSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: MudSyntaxPlugin) {
    super(plugin.app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("mud-syntax-settings");
    containerEl.createEl("h2", { text: "Syntax Highlight" });
    containerEl.createEl("p", {
      text: "Perfiles de lenguaje derivados de gramáticas y temas editables para lectura y edición.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Recargar gramáticas automáticamente")
      .setDesc("Vuelve a validar el perfil al guardar uno de sus archivos EBNF.")
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
      .setDesc("Crea un perfil genérico configurable mediante gramática léxica y sintáctica EBNF.")
      .addButton((button) =>
        button.setButtonText("Nuevo perfil").setCta().onClick(async () => {
          const id = this.uniqueId();
          this.plugin.pluginSettings.languages.push({
            id,
            name: "Nuevo lenguaje",
            enabled: false,
            fences: [id],
            extensions: [id],
            engine: "grammar",
            lexicalGrammarPath: "",
            syntaxGrammarPath: "",
            lexicalStart: "",
            syntaxStart: "",
            themePreset: "catppuccin",
            customThemeName: "",
            palette: paletteFromPreset("catppuccin"),
            categories: { ...DEFAULT_GRAMMAR_CATEGORIES },
            previewSource: `start ::= "sample" ;`,
          });
          await this.plugin.commitSettings(false);
          this.display();
        }),
      );
  }

  private renderLanguage(language: LanguageProfileSettings): void {
    const card = this.containerEl.createDiv("mud-syntax-language-card");
    const heading = card.createDiv("mud-syntax-language-heading");
    heading.createEl("h3", { text: language.name });
    const status = this.plugin.registry.get(language.id)?.status;
    heading.createSpan({
      text: status?.message ?? "Sin cargar",
      cls: `mud-syntax-status is-${status?.state ?? "loading"}`,
    });

    new Setting(card)
      .setName("Activado")
      .addToggle((toggle) =>
        toggle.setValue(language.enabled).onChange(async (value) => {
          language.enabled = value;
          await this.plugin.commitSettings(false);
        }),
      );
    new Setting(card).setName("Nombre").addText((text) =>
      text.setValue(language.name).onChange(async (value) => {
        language.name = value.trim() || language.id;
        await this.plugin.commitSettings(false);
      }),
    );
    new Setting(card)
      .setName("Bloques Markdown")
      .setDesc("Alias separados por comas, sin incluir ```.")
      .addText((text) =>
        text.setValue(language.fences.join(", ")).onChange(async (value) => {
          language.fences = fencesFrom(value);
          await this.plugin.commitSettings(false);
        }),
      );
    new Setting(card)
      .setName("Extensiones de archivo")
      .setDesc("Extensiones sin punto, separadas por comas. Las nuevas requieren recargar el plugin.")
      .addText((text) =>
        text.setValue(language.extensions.join(", ")).onChange(async (value) => {
          language.extensions = fencesFrom(value);
          await this.plugin.commitSettings(false);
        }),
      );

    if (language.engine === "mud" || language.engine === "grammar") {
      this.renderGrammarFields(card, language);
    }
    this.renderTheme(card, language);
    this.renderPreview(card, language);

    const actions = new Setting(card)
      .setName("Validación")
      .setDesc("Conserva la última configuración válida si una gramática falla.");
    if (language.engine === "mud" || language.engine === "grammar") {
      actions.addButton((button) =>
        button.setButtonText("Validar y recargar").onClick(async () => {
          await this.plugin.reloadLanguage(language.id, true);
          this.display();
        }),
      );
    }
    if (language.engine === "grammar") {
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
    if (language.engine === "grammar") {
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
      const mapping = card.createEl("details", { cls: "mud-syntax-colors" });
      mapping.createEl("summary", { text: "Mapeo de producciones" });
      for (const key of Object.keys(
        language.categories,
      ) as (keyof typeof language.categories)[]) {
        new Setting(mapping)
          .setName(key)
          .setDesc("Nombre de la producción EBNF que alimenta esta categoría.")
          .addText((text) =>
            text.setValue(language.categories[key]).onChange(async (value) => {
              language.categories[key] = value.trim();
              await this.plugin.commitSettings(false);
            }),
          );
      }
    }
  }

  private renderTheme(
    card: HTMLElement,
    language: LanguageProfileSettings,
  ): void {
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
          language.customThemeName = value.startsWith("custom-")
            ? selected.name
            : "";
        }
        await this.plugin.commitSettings(false);
        this.display();
      });
    });

    new Setting(card)
      .setName("Guardar tema personalizado")
      .setDesc("Al modificar un color, la selección pasa a ser un tema personalizado sin guardar.")
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
            });
            language.themePreset = id;
          } else {
            existing.name = name;
            existing.palette = structuredClone(language.palette);
            language.themePreset = existing.id;
          }
          await this.plugin.commitSettings(false);
          this.display();
          });
      });

    const colors = card.createEl("details", { cls: "mud-syntax-colors" });
    colors.createEl("summary", { text: "Personalizar colores" });
    const grid = colors.createDiv("mud-syntax-color-grid");
    for (const kind of tokenKindsFor(language)) {
      const row = grid.createDiv("mud-syntax-color-row");
      row.createSpan({ text: kind });
      for (const mode of ["light", "dark"] as const) {
        new Setting(row).setName(mode === "light" ? "Claro" : "Oscuro")
          .addColorPicker((picker) =>
            picker.setValue(language.palette[mode][kind]).onChange(async (value) => {
              const selected = themeById(
                this.plugin.pluginSettings,
                language.themePreset,
              );
              if (language.themePreset !== "custom") {
                language.customThemeName = selected === undefined
                  ? ""
                  : `${selected.name} personalizado`;
                nameControl?.setValue(language.customThemeName);
              }
              language.palette[mode][kind] = value;
              language.themePreset = "custom";
              dropdownControl?.setValue("custom");
              saveButton?.setDisabled(false);
              await this.plugin.commitSettings(false);
            }),
          );
      }
    }
  }

  private renderPreview(
    card: HTMLElement,
    language: LanguageProfileSettings,
  ): void {
    const section = card.createDiv("syntax-preview");
    section.createEl("h4", { text: "Vista previa" });
    section.createEl("p", {
      text: "Edita el ejemplo para comprobar inmediatamente la paleta y el tokenizador.",
      cls: "setting-item-description",
    });
    const output = section.createDiv("syntax-preview-output");
    const updateOutput = (): void => {
      const runtime = this.plugin.registry.get(language.id);
      if (runtime !== undefined) renderSyntaxCode(language.previewSource, output, runtime);
    };
    new Setting(section).addTextArea((text) => {
      text
        .setValue(language.previewSource)
        .setPlaceholder("Escribe un fragmento de código…")
        .onChange(async (value) => {
          language.previewSource = value;
          await this.plugin.commitSettings(false);
          updateOutput();
        });
      text.inputEl.rows = 7;
      text.inputEl.addClass("syntax-preview-editor");
    });
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
