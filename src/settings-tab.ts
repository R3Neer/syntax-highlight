import {
  type ButtonComponent,
  type DropdownComponent,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  type TextComponent,
  normalizePath,
} from "obsidian";

import type SyntaxHighlightPlugin from "./main";
import { renderCommonLanguageCatalog } from "./common-language-catalog";
import { LanguageRegistry } from "./languages";
import { createJsonEditor } from "./json-editor";
import {
  categoryText,
  descriptorName,
  effectiveLocale,
  groupName,
  translate,
} from "./i18n";
import {
  diagnosticSettings,
  languageDocument,
  parsePortableDocument,
  safePortableId,
  settingsDocument,
  themeDocument,
} from "./portability";
import {
  validateLanguageDescriptor,
  type LanguageDescriptor,
} from "./descriptor";
import { renderSyntaxCode } from "./reading";
import {
  effectiveCategoryColor,
  DEFAULT_SETTINGS,
  loadSettings,
  newGenericProfile,
  THEME_PRESETS,
  themeById,
  type LanguageProfileSettings,
} from "./settings";

export class SyntaxSettingTab extends PluginSettingTab {
  private selectedThemeLanguage = "mud";
  private lastReport = "";
  private jsonEditors: Array<{ destroy(): void }> = [];
  constructor(private readonly plugin: SyntaxHighlightPlugin) {
    super(plugin.app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    for (const editor of this.jsonEditors) editor.destroy();
    this.jsonEditors = [];
    containerEl.empty();
    containerEl.addClass("mud-syntax-settings");
    const tr = (en: string, es: string): string =>
      translate(this.plugin.pluginSettings, en, es);
    containerEl.createEl("h2", { text: "Syntax Highlight" });
    containerEl.createEl("p", {
      text: tr(
        "Grammar-driven languages, portable profiles, and semantic themes.",
        "Lenguajes derivados de gramáticas, perfiles portables y temas semánticos.",
      ),
      cls: "setting-item-description",
    });

    const general = this.section(containerEl, tr("General", "General"), true);
    new Setting(general)
      .setName(tr("Interface language", "Idioma de la interfaz"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("auto", tr("Automatic", "Automático"))
          .addOption("en", "English")
          .addOption("es", "Español")
          .setValue(this.plugin.pluginSettings.locale)
          .onChange(async (value) => {
            this.plugin.pluginSettings.locale =
              value === "en" || value === "es" ? value : "auto";
            await this.plugin.commitSettings(false);
            this.display();
          }),
      );
    new Setting(general)
      .setName(tr("Reload language files automatically", "Recargar archivos automáticamente"))
      .setDesc(tr("Watches descriptors and grammars.", "Vigila descriptores y gramáticas."))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.pluginSettings.autoReloadGrammar)
          .onChange(async (value) => {
            this.plugin.pluginSettings.autoReloadGrammar = value;
            await this.plugin.commitSettings(false);
          }),
      );
    this.behaviorToggle(general, "markdownReading", tr("Highlight Markdown reading view", "Resaltar en lectura Markdown"));
    this.behaviorToggle(general, "markdownEditor", tr("Highlight Markdown editor", "Resaltar en el editor Markdown"));
    this.behaviorToggle(general, "sourceEditor", tr("Open source files in the code editor", "Abrir archivos fuente con el editor de código"));
    new Setting(general)
      .setName(tr("Indentation", "Sangría"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("spaces", tr("Spaces", "Espacios"))
          .addOption("tabs", tr("Tabs", "Tabulaciones"))
          .setValue(this.plugin.pluginSettings.indentStyle)
          .onChange(async (value) => {
            this.plugin.pluginSettings.indentStyle =
              value === "tabs" ? "tabs" : "spaces";
            await this.plugin.commitSettings(false);
          }),
      )
      .addDropdown((dropdown) => {
        for (const size of [1, 2, 3, 4, 5, 6, 7, 8]) {
          dropdown.addOption(String(size), String(size));
        }
        return dropdown
          .setValue(String(this.plugin.pluginSettings.indentSize))
          .onChange(async (value) => {
            this.plugin.pluginSettings.indentSize = Number(value);
            await this.plugin.commitSettings(false);
          });
      });
    this.editorToggle(general, "lineNumbers", tr("Line numbers", "Números de línea"));
    this.editorToggle(general, "lineWrapping", tr("Wrap long lines", "Ajustar líneas largas"));
    this.editorToggle(general, "autoClose", tr("Close pairs automatically", "Cerrar parejas automáticamente"));
    this.editorToggle(
      general,
      "continueLineComments",
      tr("Continue line comments", "Continuar comentarios de línea"),
    );

    const languages = this.section(containerEl, tr("Languages", "Lenguajes"), true);
    for (const language of this.plugin.pluginSettings.languages) {
      const collisions = this.collisionMessages(language.id);
      if (collisions.length > 0) {
        languages.createEl("p", {
          text: collisions.join(" · "),
          cls: "syntax-validation-error",
        });
      }
      this.renderLanguage(language, languages);
    }

    renderCommonLanguageCatalog(languages, tr);

    new Setting(languages)
      .setName("Añadir lenguaje")
      .setDesc("Crea un perfil genérico con un descriptor JSON integrado y gramáticas EBNF.")
      .addButton((button) =>
        button.setButtonText("Nuevo perfil").setCta().onClick(async () => {
          const profile = newGenericProfile(this.uniqueId());
          this.plugin.pluginSettings.languages.push(profile);
          await this.plugin.commitSettings(false);
          this.display();
        }),
      )
      .addButton((button) =>
        button.setButtonText(tr("Import package", "Importar paquete")).onClick(
          async () => this.importDocument("language"),
        ),
      );

    const themes = this.section(containerEl, tr("Themes", "Temas"), false);
    new Setting(themes)
      .setName(tr("Language to customize", "Lenguaje que personalizar"))
      .addDropdown((dropdown) => {
        for (const profile of this.plugin.pluginSettings.languages) {
          dropdown.addOption(
            profile.id,
            this.plugin.registry.get(profile.id) === undefined
              ? profile.id
              : descriptorName(
                  this.plugin.pluginSettings,
                  this.plugin.registry.get(profile.id)!.descriptor,
                ),
          );
        }
        dropdown
          .setValue(this.selectedThemeLanguage)
          .onChange((value) => {
            this.selectedThemeLanguage = value;
            this.display();
          });
      });
    new Setting(themes)
      .setName(tr("Preview appearance", "Apariencia de la vista previa"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("auto", tr("Automatic", "Automático"))
          .addOption("light", tr("Light", "Claro"))
          .addOption("dark", tr("Dark", "Oscuro"))
          .setValue(this.plugin.pluginSettings.previewMode)
          .onChange(async (value) => {
            this.plugin.pluginSettings.previewMode =
              value === "light" || value === "dark" ? value : "auto";
            await this.plugin.commitSettings(false);
            this.display();
          }),
      );
    const selected = this.plugin.pluginSettings.languages.find(
      ({ id }) => id === this.selectedThemeLanguage,
    ) ?? this.plugin.pluginSettings.languages[0];
    if (selected !== undefined) {
      this.renderTheme(themes, selected);
      this.renderPreview(themes, selected);
    }

    this.renderDiagnostics(
      this.section(containerEl, tr("Diagnostics", "Diagnóstico"), false),
    );
    this.renderAdvanced(
      this.section(containerEl, tr("Advanced", "Avanzado"), false),
    );
  }

  private renderLanguage(
    language: LanguageProfileSettings,
    parent: HTMLElement,
  ): void {
    const tr = (en: string, es: string): string =>
      translate(this.plugin.pluginSettings, en, es);
    const runtime = this.plugin.registry.get(language.id);
    const descriptor = runtime?.descriptor ?? language.embeddedDescriptor;
    if (descriptor === undefined) return;
    const card = parent.createEl("details", {
      cls: "mud-syntax-language-card",
    });
    card.open = false;
    const heading = card.createEl("summary", {
      cls: "mud-syntax-language-heading",
    });
    heading.createEl("h3", {
      text: descriptorName(this.plugin.pluginSettings, descriptor),
    });
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

    card.createEl("p", {
      text: `${this.originLabel(language)} · ${
        runtime?.status.updatedAt === null || runtime?.status.updatedAt === undefined
          ? tr("never loaded", "nunca cargado")
          : new Date(runtime.status.updatedAt).toLocaleString(effectiveLocale(this.plugin.pluginSettings))
      }`,
      cls: "setting-item-description",
    });

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
    const actions = new Setting(card)
      .setName("Validación")
      .setDesc("Conserva el último descriptor y la última gramática válidos si la recarga falla.")
      .addButton((button) =>
        button.setButtonText("Validar y recargar").onClick(async () => {
          await this.plugin.reloadLanguage(language.id, true);
          this.display();
        }),
      );
    actions
      .addButton((button) =>
        button.setButtonText(tr("Export", "Exportar")).onClick(async () => {
          await this.exportLanguage(language);
        }),
      )
      .addButton((button) =>
        button.setButtonText(tr("Restore", "Restaurar")).onClick(async () => {
          await this.restoreLanguage(language);
        }),
      );
    if (language.descriptorOrigin === "builtin") {
      actions.addButton((button) =>
        button.setButtonText(tr("Customize descriptor", "Personalizar descriptor")).onClick(async () => {
          language.embeddedDescriptor = structuredClone(descriptor);
          language.descriptorOrigin = "personal";
          language.baseline = structuredClone(language);
          await this.plugin.commitSettings(false);
          this.display();
        }),
      );
    } else if (["mud", "ebnf", "asdl", "toml"].includes(language.id)) {
      actions.addButton((button) =>
        button.setButtonText(tr("Use built-in", "Volver al integrado")).onClick(async () => {
          const fallback = structuredClone(
            DEFAULT_SETTINGS.languages.find(({ id }) => id === language.id),
          );
          if (fallback !== undefined) Object.assign(language, fallback);
          await this.plugin.commitSettings(true);
          this.display();
        }),
      );
    }
    if (
      language.embeddedLexicalGrammar !== undefined ||
      language.embeddedSyntaxGrammar !== undefined
    ) {
      actions.addButton((button) =>
        button.setButtonText(tr("Create editable grammar files", "Crear archivos editables")).onClick(async () => {
          await this.materializeGrammars(language);
          this.display();
        }),
      );
    }
    if (!["mud", "ebnf", "asdl", "toml"].includes(language.id)) {
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
    const editorHost = details.createDiv("syntax-descriptor-editor");
    this.jsonEditors.push(
      createJsonEditor(editorHost, draft, (value) => {
        draft = value;
      }),
    );
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

    const savedTheme = this.plugin.pluginSettings.customThemes.find(
      ({ id }) => id === language.themePreset,
    );
    if (savedTheme !== undefined) {
      let renamed = savedTheme.name;
      new Setting(card)
        .setName(translate(this.plugin.pluginSettings, "Manage saved theme", "Gestionar tema guardado"))
        .addText((text) =>
          text.setValue(savedTheme.name).onChange((value) => {
            renamed = value.trim();
          }),
        )
        .addButton((button) =>
          button.setButtonText(translate(this.plugin.pluginSettings, "Rename", "Renombrar")).onClick(async () => {
            if (renamed) savedTheme.name = renamed;
            await this.plugin.commitSettings(false);
            this.display();
          }),
        )
        .addButton((button) =>
          button.setButtonText(translate(this.plugin.pluginSettings, "Export", "Exportar")).onClick(() => {
            this.downloadJson(`${savedTheme.id}.syntax-theme.json`, themeDocument(savedTheme));
          }),
        )
        .addButton((button) =>
          button.setButtonText(translate(this.plugin.pluginSettings, "Delete", "Eliminar")).setWarning().onClick(async () => {
            for (const profile of this.plugin.pluginSettings.languages) {
              if (profile.themePreset === savedTheme.id) profile.themePreset = "custom";
            }
            this.plugin.pluginSettings.customThemes =
              this.plugin.pluginSettings.customThemes.filter(({ id }) => id !== savedTheme.id);
            await this.plugin.commitSettings(false);
            this.display();
          }),
        );
    }
    new Setting(card).setName(
      translate(this.plugin.pluginSettings, "Theme portability", "Portabilidad de temas"),
    ).addButton((button) =>
      button.setButtonText(translate(this.plugin.pluginSettings, "Import theme", "Importar tema")).onClick(
        async () => this.importDocument("theme"),
      ),
    ).addButton((button) =>
      button.setButtonText(translate(this.plugin.pluginSettings, "Restore selected theme", "Restaurar tema seleccionado")).onClick(async () => {
        const selected = themeById(this.plugin.pluginSettings, language.themePreset);
        if (selected !== undefined) {
          language.palette = structuredClone(selected.palette);
          language.categoryColors = structuredClone(selected.overrides);
          await this.plugin.commitSettings(false);
          this.display();
        }
      }),
    );

    const colors = card.createEl("details", { cls: "mud-syntax-colors" });
    colors.createEl("summary", { text: "Personalizar categorías de este lenguaje" });
    for (const group of descriptor.groups) {
      const categories = descriptor.categories.filter(
        (category) => category.group === group.id,
      );
      if (categories.length === 0) continue;
      const section = colors.createDiv("syntax-category-section");
      section.createEl("h4", {
        text: groupName(this.plugin.pluginSettings, descriptor, group),
        cls: "syntax-category-group",
      });
      const grid = section.createDiv("mud-syntax-color-grid");
      for (const category of categories) {
        const row = grid.createDiv("mud-syntax-color-row");
        const localizedCategory = categoryText(
          this.plugin.pluginSettings,
          descriptor,
          category,
        );
        row.createSpan({
          text: this.plugin.pluginSettings.showTechnicalIds
            ? `${localizedCategory.name} · ${category.id}`
            : localizedCategory.name,
        });
        row.createEl("small", { text: localizedCategory.description });
        for (const mode of ["light", "dark"] as const) {
          const currentColor = effectiveCategoryColor(
            language,
            descriptor,
            category.id,
            mode,
          );
          new Setting(row)
            .setName(mode === "light" ? "Claro" : "Oscuro")
            .addColorPicker((picker) =>
              picker
                .setValue(currentColor)
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
        const reset = row.createEl("button", {
          text: translate(
            this.plugin.pluginSettings,
            "Restore category",
            "Restaurar categoría",
          ),
          cls: "syntax-inline-button",
        });
        reset.addEventListener("click", () => {
          delete language.categoryColors[language.id]?.[category.id];
          void this.plugin.commitSettings(false).then(() => this.display());
        });
        if (
          this.plugin.pluginSettings.contrastWarnings &&
          this.minimumContrast(language, descriptor, category.id) < 4.5
        ) {
          row.createEl("small", {
            text: translate(
              this.plugin.pluginSettings,
              "Contrast below WCAG AA (4.5:1).",
              "Contraste inferior a WCAG AA (4,5:1).",
            ),
            cls: "syntax-contrast-warning",
          });
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
    if (this.plugin.pluginSettings.previewMode !== "auto") {
      output.addClass(`theme-${this.plugin.pluginSettings.previewMode}`);
    }
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

  private section(
    parent: HTMLElement,
    title: string,
    open: boolean,
  ): HTMLElement {
    const details = parent.createEl("details", { cls: "syntax-settings-section" });
    details.open = open;
    details.createEl("summary", { text: title });
    return details;
  }

  private behaviorToggle(
    parent: HTMLElement,
    key: "markdownReading" | "markdownEditor" | "sourceEditor",
    name: string,
  ): void {
    new Setting(parent).setName(name).addToggle((toggle) =>
      toggle.setValue(this.plugin.pluginSettings[key]).onChange(async (value) => {
        this.plugin.pluginSettings[key] = value;
        await this.plugin.commitSettings(false);
        if (key === "sourceEditor" && !value) {
          new Notice(
            translate(
              this.plugin.pluginSettings,
              "Reload the plugin to release already registered file extensions.",
              "Recarga el plugin para liberar las extensiones ya registradas.",
            ),
          );
        }
      }),
    );
  }

  private editorToggle(
    parent: HTMLElement,
    key:
      | "lineNumbers"
      | "lineWrapping"
      | "autoClose"
      | "continueLineComments",
    name: string,
  ): void {
    new Setting(parent).setName(name).addToggle((toggle) =>
      toggle.setValue(this.plugin.pluginSettings[key]).onChange(async (value) => {
        this.plugin.pluginSettings[key] = value;
        await this.plugin.commitSettings(false);
      }),
    );
  }

  private collisionMessages(profileId: string): string[] {
    const runtime = this.plugin.registry.get(profileId);
    if (runtime === undefined) return [];
    const result: string[] = [];
    for (const field of ["fences", "extensions"] as const) {
      for (const value of runtime.descriptor[field]) {
        const owners = this.plugin.registry
          .enabled()
          .filter(({ descriptor }) =>
            descriptor[field].some(
              (candidate) =>
                candidate.toLocaleLowerCase() === value.toLocaleLowerCase(),
            ),
          );
        if (owners.length > 1) result.push(`${field}: ${value}`);
      }
    }
    return result;
  }

  private originLabel(language: LanguageProfileSettings): string {
    const labels = {
      builtin: ["Built-in descriptor", "Descriptor integrado"],
      external: ["External descriptor", "Descriptor externo"],
      imported: ["Imported descriptor", "Descriptor importado"],
      personal: ["Personal copy", "Copia personal"],
    } as const;
    const label = labels[language.descriptorOrigin];
    return translate(this.plugin.pluginSettings, label[0], label[1]);
  }

  private renderDiagnostics(parent: HTMLElement): void {
    const tr = (en: string, es: string): string =>
      translate(this.plugin.pluginSettings, en, es);
    const output = parent.createEl("pre", {
      cls: "syntax-diagnostic-output",
      text: this.lastReport || tr("Not checked yet.", "Todavía no comprobado."),
    });
    new Setting(parent)
      .setName(tr("Check configuration", "Comprobar configuración"))
      .setDesc(tr("Validates without changing the active runtime.", "Valida sin cambiar el runtime activo."))
      .addButton((button) =>
        button.setButtonText(tr("Check", "Comprobar")).setCta().onClick(async () => {
          const report = await this.plugin.registry.validateAll();
          this.lastReport = report.issues
            .map(
              ({ severity, profileId, message }) =>
                `[${severity.toUpperCase()}]${profileId ? ` ${profileId}:` : ""} ${message}`,
            )
            .join("\n");
          output.setText(this.lastReport);
        }),
      )
      .addButton((button) =>
        button.setButtonText(tr("Copy diagnostics", "Copiar diagnóstico")).onClick(async () => {
          const runtime = this.plugin.pluginSettings.languages.map((profile) => {
            const entry = this.plugin.registry.get(profile.id);
            return {
              id: profile.id,
              state: entry?.status.state,
              updatedAt: entry?.status.updatedAt,
              error: entry?.status.state === "error" ? entry.status.message : undefined,
            };
          });
          await navigator.clipboard.writeText(
            JSON.stringify(
              {
                pluginVersion: this.plugin.manifest.version,
                effectiveLocale: effectiveLocale(this.plugin.pluginSettings),
                settings: diagnosticSettings(this.plugin.pluginSettings),
                runtime,
                validation: this.lastReport,
              },
              null,
              2,
            ),
          );
          new Notice(tr("Diagnostics copied.", "Diagnóstico copiado."));
        }),
      );
  }

  private renderAdvanced(parent: HTMLElement): void {
    const tr = (en: string, es: string): string =>
      translate(this.plugin.pluginSettings, en, es);
    new Setting(parent)
      .setName(tr("Configuration backup", "Copia de configuración"))
      .addButton((button) =>
        button.setButtonText(tr("Export", "Exportar")).onClick(() => {
          this.downloadJson("syntax-highlight-settings.json", settingsDocument(this.plugin.pluginSettings));
        }),
      )
      .addButton((button) =>
        button.setButtonText(tr("Import", "Importar")).onClick(async () => {
          await this.importDocument("settings");
        }),
      )
      .addButton((button) =>
        button
          .setButtonText(tr("Restore previous", "Restaurar anterior"))
          .setDisabled(this.plugin.pluginSettings.lastBackup === null)
          .onClick(async () => {
            await this.plugin.restoreBackup();
            this.display();
          }),
      );
    new Setting(parent)
      .setName(tr("Contrast warnings", "Avisos de contraste"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.pluginSettings.contrastWarnings).onChange(async (value) => {
          this.plugin.pluginSettings.contrastWarnings = value;
          await this.plugin.commitSettings(false);
          this.display();
        }),
      );
    new Setting(parent)
      .setName(tr("Show technical identifiers", "Mostrar identificadores técnicos"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.pluginSettings.showTechnicalIds).onChange(async (value) => {
          this.plugin.pluginSettings.showTechnicalIds = value;
          await this.plugin.commitSettings(false);
          this.display();
        }),
      );
    new Setting(parent)
      .setName(tr("Restore all settings", "Restaurar toda la configuración"))
      .setDesc(tr("Creates a backup first.", "Primero crea una copia de seguridad."))
      .addButton((button) =>
        button.setButtonText(tr("Restore defaults", "Restaurar valores iniciales")).setWarning().onClick(async () => {
          const confirmed = await this.choose(
            tr("Restore all settings?", "¿Restaurar toda la configuración?"),
            [
              ["restore", tr("Restore", "Restaurar")],
              ["cancel", tr("Cancel", "Cancelar")],
            ],
          );
          if (confirmed !== "restore") return;
          await this.plugin.replaceSettings(structuredClone(DEFAULT_SETTINGS), true);
          this.display();
        }),
      );
  }

  private async exportLanguage(language: LanguageProfileSettings): Promise<void> {
    const themes = this.plugin.pluginSettings.customThemes.filter(
      ({ id }) => id === language.themePreset,
    );
    const lexical =
      language.embeddedLexicalGrammar ??
      (language.lexicalGrammarPath
        ? await this.plugin.app.vault.adapter.read(normalizePath(language.lexicalGrammarPath))
        : undefined);
    const syntax =
      language.embeddedSyntaxGrammar ??
      (language.syntaxGrammarPath
        ? await this.plugin.app.vault.adapter.read(normalizePath(language.syntaxGrammarPath))
        : undefined);
    const portableProfile = structuredClone(language);
    const runtime = this.plugin.registry.get(language.id);
    if (runtime !== undefined) {
      portableProfile.embeddedDescriptor = structuredClone(runtime.descriptor);
      portableProfile.descriptorPath = "";
      portableProfile.descriptorOrigin = "imported";
    }
    this.downloadJson(
      `${language.id}.syntax-language.json`,
      languageDocument(portableProfile, themes, lexical, syntax),
    );
  }

  private async materializeGrammars(
    language: LanguageProfileSettings,
  ): Promise<void> {
    const directory = normalizePath(`syntax-highlight/languages/${safePortableId(language.id)}`);
    let current = "";
    for (const part of directory.split("/")) {
      current = current ? `${current}/${part}` : part;
      if (!(await this.plugin.app.vault.adapter.exists(current))) {
        await this.plugin.app.vault.adapter.mkdir(current);
      }
    }
    if (language.embeddedLexicalGrammar !== undefined) {
      const path = `${directory}/lexical.ebnf`;
      await this.plugin.app.vault.adapter.write(path, language.embeddedLexicalGrammar);
      language.lexicalGrammarPath = path;
      language.embeddedLexicalGrammar = undefined;
    }
    if (language.embeddedSyntaxGrammar !== undefined) {
      const path = `${directory}/syntax.ebnf`;
      await this.plugin.app.vault.adapter.write(path, language.embeddedSyntaxGrammar);
      language.syntaxGrammarPath = path;
      language.embeddedSyntaxGrammar = undefined;
    }
    await this.plugin.commitSettings(true);
  }

  private async restoreLanguage(language: LanguageProfileSettings): Promise<void> {
    const builtin = DEFAULT_SETTINGS.languages.find(({ id }) => id === language.id);
    const baseline =
      builtin ??
      (typeof language.baseline === "object" && language.baseline !== null
        ? (language.baseline as LanguageProfileSettings)
        : newGenericProfile(language.id));
    Object.assign(language, structuredClone(baseline));
    await this.plugin.commitSettings(true);
    this.display();
  }

  private downloadJson(name: string, value: unknown): void {
    const url = URL.createObjectURL(
      new Blob([`${JSON.stringify(value, null, 2)}\n`], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private pickJson(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (file === undefined) resolve(null);
        else void file.text().then(resolve);
      });
      input.click();
    });
  }

  private async importDocument(expected: "settings" | "language" | "theme"): Promise<void> {
    const source = await this.pickJson();
    if (source === null) return;
    const before = structuredClone(this.plugin.pluginSettings);
    try {
      const documentValue = parsePortableDocument(source);
      if (
        (expected === "settings" && documentValue.kind !== "syntax-highlight-settings") ||
        (expected === "language" && documentValue.kind !== "syntax-highlight-language") ||
        (expected === "theme" && documentValue.kind !== "syntax-highlight-theme")
      ) {
        throw new Error("The selected JSON has a different document kind.");
      }
      if (documentValue.kind === "syntax-highlight-settings") {
        const action = await this.choose("Import settings", [
          ["merge", "Merge"],
          ["replace", "Replace"],
          ["cancel", "Cancel"],
        ]);
        if (action === "cancel") return;
        const imported = loadSettings(documentValue.settings);
        if (action === "replace") {
          await this.applyCandidate(imported);
        } else {
          const merged = structuredClone(this.plugin.pluginSettings);
          for (const profile of imported.languages) {
            const existing = merged.languages.find(({ id }) => id === profile.id);
            if (existing === undefined) merged.languages.push(profile);
            else {
              const resolution = await this.choose(`Profile conflict: ${profile.id}`, [
                ["keep", "Keep"],
                ["replace", "Replace"],
                ["copy", "Import as copy"],
              ]);
              if (resolution === "replace") Object.assign(existing, profile);
              if (resolution === "copy") {
                const copy = structuredClone(profile);
                this.retargetProfile(
                  copy,
                  this.uniqueImportedId(profile.id, merged.languages),
                );
                merged.languages.push(copy);
              }
            }
          }
          for (const theme of imported.customThemes) {
            const existingTheme = merged.customThemes.find(({ id }) => id === theme.id);
            if (existingTheme === undefined) merged.customThemes.push(theme);
            else {
              const resolution = await this.choose(`Theme conflict: ${theme.id}`, [
                ["keep", "Keep"],
                ["replace", "Replace"],
                ["copy", "Import as copy"],
              ]);
              if (resolution === "replace") Object.assign(existingTheme, theme);
              if (resolution === "copy") {
                const copy = structuredClone(theme);
                copy.id = this.uniqueThemeId(copy.name);
                merged.customThemes.push(copy);
              }
            }
          }
          await this.applyCandidate(loadSettings(merged));
        }
      } else if (documentValue.kind === "syntax-highlight-language") {
        const imported = structuredClone(documentValue.profile);
        imported.embeddedLexicalGrammar = documentValue.lexicalGrammar;
        imported.embeddedSyntaxGrammar = documentValue.syntaxGrammar;
        imported.descriptorOrigin = "imported";
        imported.baseline = structuredClone(imported);
        const existing = this.plugin.pluginSettings.languages.find(({ id }) => id === imported.id);
        if (existing !== undefined) {
          const resolution = await this.choose(`Profile conflict: ${imported.id}`, [
            ["keep", "Keep"],
            ["replace", "Replace"],
            ["copy", "Import as copy"],
          ]);
          if (resolution === "keep") return;
          if (resolution === "replace") Object.assign(existing, imported);
          else {
            this.retargetProfile(
              imported,
              this.uniqueImportedId(
                imported.id,
                this.plugin.pluginSettings.languages,
              ),
            );
          }
        }
        if (existing === undefined || imported.id !== existing.id) {
          this.plugin.pluginSettings.languages.push(imported);
        }
        for (const theme of documentValue.themes) {
          if (!this.plugin.pluginSettings.customThemes.some(({ id }) => id === theme.id)) {
            this.plugin.pluginSettings.customThemes.push(theme);
          }
        }
        await this.applyCandidate(loadSettings(this.plugin.pluginSettings));
      } else {
        const theme = structuredClone(documentValue.theme);
        const existing = this.plugin.pluginSettings.customThemes.find(({ id }) => id === theme.id);
        if (existing !== undefined) {
          const resolution = await this.choose(`Theme conflict: ${theme.id}`, [
            ["keep", "Keep"],
            ["replace", "Replace"],
            ["copy", "Import as copy"],
          ]);
          if (resolution === "keep") return;
          if (resolution === "replace") Object.assign(existing, theme);
          else theme.id = this.uniqueThemeId(theme.name);
        }
        if (existing === undefined || theme.id !== existing.id) {
          this.plugin.pluginSettings.customThemes.push(theme);
        }
        await this.applyCandidate(loadSettings(this.plugin.pluginSettings));
      }
      this.display();
    } catch (error) {
      await this.plugin.replaceSettings(before, false);
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  private async applyCandidate(settings: ReturnType<typeof loadSettings>): Promise<void> {
    const registry = new LanguageRegistry(settings, async (path) =>
      this.plugin.app.vault.adapter.read(normalizePath(path)),
    );
    const report = await registry.validateAll();
    if (!report.valid) {
      throw new Error(
        report.issues
          .filter(({ severity }) => severity === "error")
          .map(({ profileId, message }) => `${profileId ?? "global"}: ${message}`)
          .join("\n"),
      );
    }
    await this.plugin.replaceSettings(settings, true);
  }

  private choose(
    title: string,
    choices: readonly [string, string][],
  ): Promise<string> {
    return new Promise((resolve) => {
      const modal = new Modal(this.plugin.app);
      modal.titleEl.setText(title);
      for (const [value, label] of choices) {
        const button = modal.contentEl.createEl("button", { text: label });
        button.addEventListener("click", () => {
          modal.close();
          resolve(value);
        });
      }
      modal.onClose = () => resolve("cancel");
      modal.open();
    });
  }

  private uniqueImportedId(
    source: string,
    profiles: readonly LanguageProfileSettings[],
  ): string {
    const stem = safePortableId(source);
    let id = stem;
    let suffix = 2;
    while (profiles.some((profile) => profile.id === id)) {
      id = `${stem}-${suffix}`;
      suffix += 1;
    }
    return id;
  }

  private retargetProfile(
    profile: LanguageProfileSettings,
    id: string,
  ): void {
    profile.id = id;
    if (profile.embeddedDescriptor !== undefined) {
      profile.embeddedDescriptor.id = id;
      profile.embeddedDescriptor.name = `${profile.embeddedDescriptor.name} copy`;
      profile.embeddedDescriptor.fences = [id];
      profile.embeddedDescriptor.extensions = [id];
    }
  }

  private minimumContrast(
    language: LanguageProfileSettings,
    descriptor: LanguageDescriptor,
    categoryId: string,
  ): number {
    const contrast = (foreground: string, background: string): number => {
      const luminance = (color: string): number => {
        const channels = [1, 3, 5].map((offset) => {
          const value = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
          return value <= 0.03928
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * (channels[0] ?? 0) +
          0.7152 * (channels[1] ?? 0) +
          0.0722 * (channels[2] ?? 0);
      };
      const left = luminance(foreground);
      const right = luminance(background);
      return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
    };
    return Math.min(
      contrast(effectiveCategoryColor(language, descriptor, categoryId, "light"), "#ffffff"),
      contrast(effectiveCategoryColor(language, descriptor, categoryId, "dark"), "#1e1e1e"),
    );
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
