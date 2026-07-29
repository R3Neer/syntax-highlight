import { Notice, normalizePath, Plugin } from "obsidian";

import { createEditorHighlighter } from "./editor";
import { LanguageRegistry } from "./languages";
import { renderSyntaxCode } from "./reading";
import {
  loadSettings,
  type SyntaxPluginSettings,
} from "./settings";
import { SyntaxSettingTab } from "./settings-tab";
import { SOURCE_VIEW_TYPE, SyntaxSourceView } from "./source-view";
import { ThemeManager } from "./themes";

export default class SyntaxHighlightPlugin extends Plugin {
  pluginSettings!: SyntaxPluginSettings;
  registry!: LanguageRegistry;
  private themeManager?: ThemeManager;
  private readonly registeredFences = new Set<string>();
  private readonly registeredExtensions = new Set<string>();
  private readonly descriptorModifiedTimes = new Map<string, number>();
  private reloadTimer?: number;

  override async onload(): Promise<void> {
    this.pluginSettings = loadSettings(await this.loadData());
    this.registry = new LanguageRegistry(this.pluginSettings, async (path) => {
      if (!path) throw new Error("Falta la ruta de una gramática.");
      return this.app.vault.adapter.read(normalizePath(path));
    });
    this.themeManager = new ThemeManager();
    this.themeManager.apply(this.pluginSettings, this.registry);
    this.registerView(
      SOURCE_VIEW_TYPE,
      (leaf) => new SyntaxSourceView(leaf, this.registry),
    );
    this.registerConfiguredFences();
    this.registerConfiguredExtensions();
    this.registerEditorExtension(createEditorHighlighter(this.registry));
    this.addSettingTab(new SyntaxSettingTab(this));
    this.registerSourceWatchers();
    this.registerDescriptorPolling();
    this.register(
      this.registry.subscribe(() => {
        this.themeManager?.apply(this.pluginSettings, this.registry);
        this.registerConfiguredFences();
        this.registerConfiguredExtensions();
      }),
    );
    await this.registry.reloadAll();
  }

  override onunload(): void {
    if (this.reloadTimer !== undefined) window.clearTimeout(this.reloadTimer);
    this.themeManager?.dispose();
  }

  async commitSettings(reload: boolean): Promise<void> {
    await this.saveData(this.pluginSettings);
    this.registry.replaceSettings(this.pluginSettings);
    this.themeManager?.apply(this.pluginSettings, this.registry);
    this.registerConfiguredFences();
    this.registerConfiguredExtensions();
    if (reload) await this.registry.reloadAll();
  }

  async reloadLanguage(id: string, notify: boolean): Promise<void> {
    await this.registry.reload(id);
    const status = this.registry.get(id)?.status;
    if (!notify || status === undefined) return;
    new Notice(
      status.state === "ready"
        ? `${this.registry.get(id)?.descriptor.name}: configuración válida.`
        : `${this.registry.get(id)?.descriptor.name}: ${status.message}`,
    );
  }

  private registerConfiguredFences(): void {
    for (const runtime of this.registry.enabled()) {
      for (const rawFence of runtime.descriptor.fences) {
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

  private registerConfiguredExtensions(): void {
    for (const runtime of this.registry.enabled()) {
      for (const rawExtension of runtime.descriptor.extensions) {
        const extension = rawExtension.toLocaleLowerCase().replace(/^\./, "");
        if (!extension || this.registeredExtensions.has(extension)) continue;
        this.registerExtensions([extension], SOURCE_VIEW_TYPE);
        this.registeredExtensions.add(extension);
      }
    }
  }

  private registerSourceWatchers(): void {
    this.registerEvent(
      this.app.vault.on("modify", (file) => this.scheduleReload(file.path)),
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => this.scheduleReload(file.path)),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => this.scheduleReload(file.path)),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.scheduleReload(oldPath);
        this.scheduleReload(file.path);
      }),
    );
  }

  private registerDescriptorPolling(): void {
    this.registerInterval(
      window.setInterval(() => void this.pollDescriptorChanges(), 1500),
    );
  }

  private async pollDescriptorChanges(): Promise<void> {
    if (!this.pluginSettings.autoReloadGrammar) return;
    const paths = new Set(
      this.pluginSettings.languages
        .map(({ descriptorPath }) => normalizePath(descriptorPath))
        .filter(Boolean),
    );
    await Promise.all(
      [...paths].map(async (path) => {
        const stat = await this.app.vault.adapter.stat(path).catch(() => null);
        const modified = stat?.mtime ?? -1;
        const previous = this.descriptorModifiedTimes.get(path);
        this.descriptorModifiedTimes.set(path, modified);
        if (previous !== undefined && previous !== modified) {
          this.scheduleReload(path);
        }
      }),
    );
  }

  private scheduleReload(path: string): void {
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
  }
}
