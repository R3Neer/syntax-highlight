import {
  MarkdownView,
  Notice,
  normalizePath,
  Plugin,
  type MarkdownPostProcessorContext,
} from "obsidian";

import { commonLanguages } from "./common-languages";
import { createMarkdownEditorExtensions } from "./editor";
import { LanguageRegistry } from "./languages";
import { renderCommonCode, renderSyntaxCode } from "./reading";
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
      (leaf) =>
        new SyntaxSourceView(leaf, this.registry, () => this.pluginSettings),
    );
    this.registerConfiguredFences();
    this.registerCommonFences();
    this.registerConfiguredExtensions();
    this.registerCommonExtensions();
    this.registerEditorExtension(
      createMarkdownEditorExtensions(
        this.registry,
        () => this.pluginSettings,
      ),
    );
    this.addSettingTab(new SyntaxSettingTab(this));
    this.registerSourceWatchers();
    this.registerDescriptorPolling();
    this.register(
      this.registry.subscribe(() => {
        this.themeManager?.apply(this.pluginSettings, this.registry);
        this.registerConfiguredFences();
        this.registerCommonFences();
        this.registerConfiguredExtensions();
        this.registerCommonExtensions();
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
    this.registerCommonFences();
    this.registerConfiguredExtensions();
    this.registerCommonExtensions();
    if (reload) await this.registry.reloadAll();
  }

  async replaceSettings(settings: SyntaxPluginSettings, backup = true): Promise<void> {
    if (backup) {
      const previous = structuredClone(this.pluginSettings);
      previous.lastBackup = null;
      settings.lastBackup = JSON.stringify(previous);
    }
    this.pluginSettings = settings;
    await this.commitSettings(true);
  }

  async restoreBackup(): Promise<boolean> {
    if (this.pluginSettings.lastBackup === null) return false;
    const restored = loadSettings(JSON.parse(this.pluginSettings.lastBackup));
    await this.replaceSettings(restored, false);
    return true;
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
        this.registerMarkdownCodeBlockProcessor(
          fence,
          (source, element, context) => {
            if (!this.pluginSettings.markdownReading) {
              const pre = document.createElement("pre");
              const code = document.createElement("code");
              code.textContent = source;
              pre.append(code);
              element.replaceChildren(pre);
              this.enableReadingBlockEditing(element, context);
              return;
            }
            const runtime = this.registry.byFence(fence);
            if (runtime !== undefined) {
              renderSyntaxCode(
                source,
                element,
                runtime,
                this.pluginSettings.lineNumbers,
              );
              this.enableReadingBlockEditing(element, context);
              return;
            }
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            code.textContent = source;
            pre.append(code);
            element.replaceChildren(pre);
            this.enableReadingBlockEditing(element, context);
          },
        );
      }
    }
  }

  private registerCommonFences(): void {
    for (const language of commonLanguages()) {
      for (const rawFence of language.fences) {
        const fence = rawFence.toLocaleLowerCase();
        if (this.registeredFences.has(fence)) continue;
        this.registeredFences.add(fence);
        this.registerMarkdownCodeBlockProcessor(
          fence,
          (source, element, context) => {
            if (!this.pluginSettings.markdownReading) {
              const pre = document.createElement("pre");
              const code = document.createElement("code");
              code.textContent = source;
              pre.append(code);
              element.replaceChildren(pre);
              this.enableReadingBlockEditing(element, context);
              return;
            }
            renderCommonCode(
              source,
              element,
              language,
              this.pluginSettings.lineNumbers,
            );
            this.enableReadingBlockEditing(element, context);
          },
        );
      }
    }
  }

  private enableReadingBlockEditing(
    element: HTMLElement,
    context: MarkdownPostProcessorContext,
  ): void {
    const block =
      element.querySelector<HTMLElement>(".syntax-highlight-frame") ??
      element.querySelector<HTMLElement>("pre");
    if (block === null) return;
    block.classList.add("is-click-editable");
    block.title = "Haz clic para editar este bloque";
    block.addEventListener("click", (event) => {
      const selection = window.getSelection();
      if (selection !== null && !selection.isCollapsed) return;
      const target = event.target;
      const renderedLine =
        target instanceof Element
          ? target.closest<HTMLElement>(".syntax-code-line")
          : null;
      const lineNumber = Number(renderedLine?.dataset.lineNumber ?? "1");
      void this.editReadingBlock(
        element,
        context,
        Number.isFinite(lineNumber) ? lineNumber : 1,
      );
    });
  }

  private async editReadingBlock(
    element: HTMLElement,
    context: MarkdownPostProcessorContext,
    renderedLine: number,
  ): Promise<void> {
    const section = context.getSectionInfo(element);
    const leaf = this.app.workspace
      .getLeavesOfType("markdown")
      .find(
        ({ view }) =>
          view instanceof MarkdownView &&
          view.file?.path === context.sourcePath &&
          view.containerEl.contains(element),
      );
    if (leaf === undefined) return;

    const viewState = leaf.getViewState();
    await leaf.setViewState({
      ...viewState,
      state: {
        ...viewState.state,
        file: context.sourcePath,
        mode: "source",
      },
    });
    if (!(leaf.view instanceof MarkdownView)) return;
    const firstCodeLine = (section?.lineStart ?? 0) + 1;
    const requestedLine = firstCodeLine + Math.max(0, renderedLine - 1);
    const line = Math.min(
      Math.max(0, requestedLine),
      Math.max(0, leaf.view.editor.lineCount() - 1),
    );
    leaf.view.editor.setCursor({ line, ch: 0 });
    leaf.view.editor.focus();
  }

  private registerConfiguredExtensions(): void {
    if (!this.pluginSettings.sourceEditor) return;
    for (const runtime of this.registry.enabled()) {
      for (const rawExtension of runtime.descriptor.extensions) {
        const extension = rawExtension.toLocaleLowerCase().replace(/^\./, "");
        if (!extension || this.registeredExtensions.has(extension)) continue;
        this.registerExtensions([extension], SOURCE_VIEW_TYPE);
        this.registeredExtensions.add(extension);
      }
    }
  }

  private registerCommonExtensions(): void {
    if (!this.pluginSettings.sourceEditor) return;
    for (const language of commonLanguages()) {
      for (const rawExtension of language.extensions) {
        const extension = rawExtension.toLocaleLowerCase().replace(/^\./, "");
        if (
          !extension ||
          extension === "md" ||
          extension === "markdown" ||
          this.registeredExtensions.has(extension)
        ) {
          continue;
        }
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
