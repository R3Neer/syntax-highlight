import { Notice, normalizePath, Plugin } from "obsidian";

import { createEditorHighlighter } from "./editor";
import { LanguageRegistry } from "./languages";
import { renderSyntaxCode } from "./reading";
import {
  loadSettings,
  type SyntaxPluginSettings,
} from "./settings";
import { SyntaxSettingTab } from "./settings-tab";
import { ThemeManager } from "./themes";

export default class MudSyntaxPlugin extends Plugin {
  pluginSettings!: SyntaxPluginSettings;
  registry!: LanguageRegistry;
  private themeManager?: ThemeManager;
  private readonly registeredFences = new Set<string>();
  private reloadTimer?: number;

  override async onload(): Promise<void> {
    this.pluginSettings = loadSettings(await this.loadData());
    this.registry = new LanguageRegistry(this.pluginSettings, async (path) => {
      if (!path) throw new Error("Falta la ruta de una gramática.");
      return this.app.vault.adapter.read(normalizePath(path));
    });
    this.themeManager = new ThemeManager();
    this.themeManager.apply(this.pluginSettings);
    this.registerConfiguredFences();
    this.registerEditorExtension(createEditorHighlighter(this.registry));
    this.addSettingTab(new SyntaxSettingTab(this));
    this.registerGrammarWatchers();
    await this.registry.reloadAll();
  }

  override onunload(): void {
    if (this.reloadTimer !== undefined) window.clearTimeout(this.reloadTimer);
    this.themeManager?.dispose();
  }

  async commitSettings(reload: boolean): Promise<void> {
    await this.saveData(this.pluginSettings);
    this.registry.replaceSettings(this.pluginSettings);
    this.themeManager?.apply(this.pluginSettings);
    this.registerConfiguredFences();
    if (reload) await this.registry.reloadAll();
  }

  async reloadLanguage(id: string, notify: boolean): Promise<void> {
    await this.registry.reload(id);
    const status = this.registry.get(id)?.status;
    if (!notify || status === undefined) return;
    new Notice(
      status.state === "ready"
        ? `${this.registry.get(id)?.settings.name}: gramática válida.`
        : `${this.registry.get(id)?.settings.name}: ${status.message}`,
    );
  }

  private registerConfiguredFences(): void {
    for (const profile of this.pluginSettings.languages) {
      for (const rawFence of profile.fences) {
        const fence = rawFence.toLocaleLowerCase();
        if (this.registeredFences.has(fence)) continue;
        this.registeredFences.add(fence);
        this.registerMarkdownCodeBlockProcessor(fence, (source, element) => {
          const runtime = this.registry.byFence(fence);
          if (runtime !== undefined) {
            renderSyntaxCode(source, element, runtime);
            return;
          }
          const pre = document.createElement("pre");
          const code = document.createElement("code");
          code.textContent = source;
          pre.append(code);
          element.replaceChildren(pre);
        });
      }
    }
  }

  private registerGrammarWatchers(): void {
    const schedule = (path: string): void => {
      if (!this.pluginSettings.autoReloadGrammar) return;
      const affected = this.registry.affectedBy(normalizePath(path));
      if (affected.length === 0) return;
      if (this.reloadTimer !== undefined) window.clearTimeout(this.reloadTimer);
      this.reloadTimer = window.setTimeout(() => {
        this.reloadTimer = undefined;
        void Promise.all(
          affected.map(({ settings }) => this.registry.reload(settings.id)),
        );
      }, 250);
    };
    this.registerEvent(this.app.vault.on("modify", (file) => schedule(file.path)));
    this.registerEvent(this.app.vault.on("create", (file) => schedule(file.path)));
    this.registerEvent(this.app.vault.on("delete", (file) => schedule(file.path)));
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        schedule(oldPath);
        schedule(file.path);
      }),
    );
  }
}
