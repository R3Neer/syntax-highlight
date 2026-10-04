export type NotebookCell = Record<string, unknown> & {
  cell_type: string;
  source: string | string[];
};
export type Notebook = Record<string, unknown> & {
  nbformat: number;
  cells: NotebookCell[];
};
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function notebookText(value: unknown): string {
  return typeof value === "string" ? value
    : Array.isArray(value) && value.every((part) => typeof part === "string")
      ? value.join("") : "";
}
export class NotebookDocument {
  readonly notebook: Notebook;
  private readonly original: string;
  constructor(readonly raw: string) {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.nbformat !== 4 || !Array.isArray(value.cells) ||
      !value.cells.every((cell: unknown) => object(cell) &&
        typeof cell.cell_type === "string" &&
        (typeof cell.source === "string" || (Array.isArray(cell.source) &&
          cell.source.every((part: unknown) => typeof part === "string"))))) {
      throw new Error("Unsupported notebook structure (nbformat 4 required).");
    }
    this.notebook = value as Notebook;
    this.original = JSON.stringify(value);
  }
  get language(): string {
    const metadata = this.notebook.metadata;
    if (!object(metadata)) return "python";
    const info = metadata.language_info;
    if (object(info) && typeof info.name === "string") return info.name;
    const kernel = metadata.kernelspec;
    return object(kernel) && typeof kernel.language === "string"
      ? kernel.language : "python";
  }
  setSource(index: number, text: string): void {
    const cell = this.notebook.cells[index];
    if (!cell || !["code", "markdown", "raw"].includes(cell.cell_type)) {
      throw new Error("Cell type is not editable.");
    }
    if (notebookText(cell.source) === text) return;
    cell.source = typeof cell.source === "string"
      ? text : text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  }
  serialize(): string {
    return JSON.stringify(this.notebook) === this.original
      ? this.raw : JSON.stringify(this.notebook, null, 2) + "\n";
  }
}
