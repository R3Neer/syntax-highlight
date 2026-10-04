import { EditorView } from "@codemirror/view";
import { Component, MarkdownRenderer, TextFileView, type WorkspaceLeaf } from "obsidian";
import { translate } from "./i18n";
import { NotebookDocument, notebookText, type NotebookCell } from "./notebook";
import { notebookEditorState } from "./notebook-editor";
import type { SyntaxPluginSettings } from "./settings";

export const NOTEBOOK_VIEW_TYPE = "syntax-highlight-notebook-view";
export class SyntaxNotebookView extends TextFileView {
  private document?: NotebookDocument;
  private editors: EditorView[] = [];
  private renders: Component[] = [];
  private editing = false;
  private opened = false;
  private error?: string;
  constructor(leaf: WorkspaceLeaf, private readonly settings: () => SyntaxPluginSettings) { super(leaf); }
  getViewType(): string { return NOTEBOOK_VIEW_TYPE; }
  override getDisplayText(): string { return this.file?.name ?? "Notebook"; }
  override getIcon(): string { return "notebook-pen"; }
  override onOpen(): Promise<void> { this.opened = true; this.loadNotebook(this.data ?? ""); return Promise.resolve(); }
  override onClose(): Promise<void> { this.opened = false; this.disposeCells(); return Promise.resolve(); }
  getViewData(): string { return this.document?.serialize() ?? this.data; }
  setViewData(data: string): void { this.data = data; this.loadNotebook(data); }
  clear(): void { this.data = ""; this.loadNotebook(""); }
  private loadNotebook(raw: string): void {
    this.document = undefined; this.error = undefined;
    try { this.document = new NotebookDocument(raw); }
    catch (error) { this.error = error instanceof Error ? error.message : String(error); }
    if (this.opened) this.render();
  }
  private disposeCells(): void {
    for (const editor of this.editors) editor.destroy();
    for (const component of this.renders) this.removeChild(component);
    this.editors = []; this.renders = [];
  }
  private render(): void {
    this.disposeCells(); this.contentEl.empty();
    this.contentEl.addClass("syntax-source-view", "syntax-notebook-view");
    const toolbar = this.contentEl.createDiv("syntax-source-toolbar");
    toolbar.createSpan({ text: this.label("Notebook · saved outputs · no execution", "Notebook · salidas guardadas · sin ejecución") });
    if (this.document) {
      const mode = toolbar.createEl("button", { text: this.editing ? this.label("Reading", "Lectura") : this.label("Editing", "Edición") });
      mode.addEventListener("click", () => { this.editing = !this.editing; this.render(); });
      const save = toolbar.createEl("button", { text: this.label("Save", "Guardar") });
      save.addEventListener("click", () => void this.save());
    }
    const body = this.contentEl.createDiv("syntax-notebook-cells");
    if (!this.document) {
      body.createEl("p", { text: this.error ?? "" });
      this.editor(body, this.data, "json", false, () => {}); return;
    }
    const model = this.document;
    model.notebook.cells.forEach((cell, index) => {
      const section = body.createDiv("syntax-notebook-cell");
      section.createDiv({ cls: "syntax-notebook-cell-label", text: `${index + 1} · ${cell.cell_type}${cell.cell_type === "code" ? ` · In [${cell.execution_count ?? " "}]` : ""}` });
      const source = notebookText(cell.source);
      if (cell.cell_type === "markdown" && !this.editing) {
        const component = new Component(); this.addChild(component); this.renders.push(component);
        const target = section.createDiv("syntax-notebook-markdown markdown-rendered");
        void MarkdownRenderer.render(this.app, source, target, this.file?.path ?? "", component)
          .catch(() => { if (target.isConnected) target.setText(source); });
      } else {
        const editable = this.editing && ["code", "markdown", "raw"].includes(cell.cell_type);
        const language = cell.cell_type === "code" ? model.language : cell.cell_type === "markdown" ? "markdown" : "text";
        this.editor(section, source, language, editable, (text) => {
          model.setSource(index, text); this.data = model.serialize(); this.requestSave();
          const label = section.querySelector<HTMLElement>(".syntax-notebook-output-label");
          if (label) label.setText(this.label("Saved outputs precede this edit", "Salidas guardadas anteriores a esta edición"));
        });
      }
      this.outputs(section, cell);
    });
  }
  private editor(parent: HTMLElement, text: string, language: string, editable: boolean, change: (text: string) => void): void {
    const host = parent.createDiv("syntax-source-editor syntax-notebook-editor");
    this.editors.push(new EditorView({ parent: host, state: notebookEditorState(text, language, editable,
      this.settings().lineNumbers && language !== "markdown", change, () => void this.save()) }));
  }
  private outputs(parent: HTMLElement, cell: NotebookCell): void {
    if (!Array.isArray(cell.outputs) || cell.outputs.length === 0) return;
    const container = parent.createDiv("syntax-notebook-outputs");
    container.createDiv({ cls: "syntax-notebook-output-label", text: this.label("Saved outputs", "Salidas guardadas") });
    for (const output of cell.outputs) {
      if (typeof output !== "object" || output === null) continue;
      const value = output as Record<string, unknown>;
      const data = value.data as Record<string, unknown> | undefined;
      const text = notebookText(value.text) || notebookText(value.traceback) || notebookText(data?.["text/plain"]);
      if (text) container.createEl("pre", { text });
      let displayed = !!text;
      for (const mime of ["image/png", "image/jpeg"]) {
        const image = notebookText(data?.[mime]).replace(/\s/g, "");
        if (image && /^[A-Za-z0-9+/]*={0,2}$/.test(image)) {
          container.createEl("img", { attr: { src: `data:${mime};base64,${image}`, alt: this.label("Saved image", "Imagen guardada") } });
          displayed = true;
        }
      }
      if (!displayed) container.createEl("p", { text: this.label("Output format has no preview", "Formato de salida sin vista previa") });
    }
  }
  private label(en: string, es: string): string { return translate(this.settings(), en, es); }
}
