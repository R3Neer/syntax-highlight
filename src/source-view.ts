import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  syntaxHighlighting,
} from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { TextFileView, type WorkspaceLeaf } from "obsidian";

import type { LanguageRegistry } from "./languages";
import {
  COMMON_HIGHLIGHT_STYLE,
  commonLanguageByExtension,
} from "./common-languages";
import type { SyntaxPluginSettings } from "./settings";
import { createSmartEditingExtensions } from "./smart-edit";
import { tokenClass, tokenColorClass } from "./tokenizer";

export const SOURCE_VIEW_TYPE = "syntax-highlight-source-view";

function sourceDecorations(
  view: EditorView,
  registry: LanguageRegistry,
  extension: string,
): DecorationSet {
  const runtime = registry.byExtension(extension);
  if (runtime === undefined) return Decoration.none;
  const ranges = runtime.tokenize(view.state.doc.toString()).map((token) =>
    Decoration.mark({
      class: `${tokenClass(token.categoryId)} ${tokenColorClass(runtime.settings.id, token.categoryId)}`,
    }).range(token.from, token.to),
  );
  return Decoration.set(ranges, true);
}

function createSourceHighlighter(
  registry: LanguageRegistry,
  extension: string,
) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private readonly unsubscribe: () => void;

      constructor(private readonly view: EditorView) {
        this.decorations = sourceDecorations(view, registry, extension);
        this.unsubscribe = registry.subscribe(() => this.view.dispatch({}));
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.transactions.length > 0) {
          this.decorations = sourceDecorations(update.view, registry, extension);
        }
      }

      destroy(): void {
        this.unsubscribe();
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}

export class SyntaxSourceView extends TextFileView {
  private editorView?: EditorView;
  private statusElement?: HTMLElement;
  private statusTimer?: number;
  private settingData = false;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly registry: LanguageRegistry,
    private readonly getSettings: () => SyntaxPluginSettings,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return SOURCE_VIEW_TYPE;
  }

  override getDisplayText(): string {
    return this.file?.name ?? "Source";
  }

  override getIcon(): string {
    return "file-code-2";
  }

  override onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("syntax-source-view");
    const toolbar = this.contentEl.createDiv("syntax-source-toolbar");
    this.statusElement = toolbar.createSpan({
      cls: "syntax-source-status",
      text: this.languageName(),
    });
    const saveButton = toolbar.createEl("button", { text: "Guardar" });
    saveButton.type = "button";
    saveButton.addEventListener("click", () => void this.saveNow());
    const host = this.contentEl.createDiv("syntax-source-editor");
    this.editorView = new EditorView({
      state: this.createEditorState(this.data ?? ""),
      parent: host,
    });
    return Promise.resolve();
  }

  override onClose(): Promise<void> {
    if (this.statusTimer !== undefined) window.clearTimeout(this.statusTimer);
    this.editorView?.destroy();
    this.editorView = undefined;
    this.statusElement = undefined;
    return Promise.resolve();
  }

  getViewData(): string {
    return this.editorView?.state.doc.toString() ?? this.data;
  }

  setViewData(data: string, clear: boolean): void {
    this.data = data;
    if (this.editorView === undefined) return;
    this.settingData = true;
    if (clear) {
      this.editorView.setState(this.createEditorState(data));
    } else {
      this.editorView.dispatch({
        changes: { from: 0, to: this.editorView.state.doc.length, insert: data },
      });
    }
    this.settingData = false;
    this.setStatus(this.languageName());
  }

  clear(): void {
    this.data = "";
    if (this.editorView === undefined) return;
    this.settingData = true;
    this.editorView.setState(this.createEditorState(""));
    this.settingData = false;
  }

  private createEditorState(documentText: string): EditorState {
    const extension = this.file?.extension ?? "";
    const runtime = this.registry.byExtension(extension);
    const common = runtime === undefined
      ? commonLanguageByExtension(extension)
      : undefined;
    const settings = this.getSettings();
    const languageId = runtime?.settings.id ?? common?.id ?? "source";
    const smartEditing = createSmartEditingExtensions(
      (state, position) =>
        position >= 0 && position <= state.doc.length
          ? {
              from: 0,
              to: state.doc.length,
              languageId,
              nativeIndentation: common !== undefined,
            }
          : undefined,
      this.getSettings,
    );
    return EditorState.create({
      doc: documentText,
      extensions: [
        ...(settings.lineNumbers ? [lineNumbers()] : []),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        bracketMatching(),
        highlightActiveLine(),
        ...(runtime === undefined
          ? []
          : [createSourceHighlighter(this.registry, extension)]),
        ...(common === undefined
          ? []
          : [
              common.support(),
              syntaxHighlighting(COMMON_HIGHLIGHT_STYLE),
            ]),
        ...smartEditing,
        keymap.of([
          {
            key: "Mod-s",
            preventDefault: true,
            run: () => {
              void this.saveNow();
              return true;
            },
          },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
        ]),
        ...(settings.lineWrapping ? [EditorView.lineWrapping] : []),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || this.settingData) return;
          this.data = update.state.doc.toString();
          this.requestSave();
          this.showPendingSave();
        }),
      ],
    });
  }

  private async saveNow(): Promise<void> {
    await this.save();
    this.setStatus("Guardado");
  }

  private showPendingSave(): void {
    this.setStatus("Cambios pendientes…");
    if (this.statusTimer !== undefined) window.clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(() => {
      this.setStatus("Guardado automáticamente");
      this.statusTimer = undefined;
    }, 2200);
  }

  private languageName(): string {
    return (
      this.registry.byExtension(this.file?.extension ?? "")?.descriptor.name ??
      commonLanguageByExtension(this.file?.extension ?? "")?.name ??
      "Source"
    );
  }

  private setStatus(text: string): void {
    this.statusElement?.setText(text);
  }
}
