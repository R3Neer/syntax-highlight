export const LANGUAGE_PACK_SCHEMA_VERSION = 2 as const;

export type VisualRole =
  | "text" | "comment" | "keyword" | "type" | "constant"
  | "declaration" | "callable" | "string" | "number"
  | "operator" | "delimiter" | "punctuation" | "meta";

export interface CategoryDefinition {
  id: string;
  name: string;
  description: string;
  group: string;
  role: VisualRole;
}

export interface OperatorPolicy {
  production: string;
  compact: string[];
  prefix: string[];
  word: string[];
}

export interface LanguagePackV2 {
  schemaVersion: 2;
  id: string;
  version: string;
  name: string;
  aliases: string[];
  fences: string[];
  extensions: string[];
  categories: CategoryDefinition[];
  operators?: OperatorPolicy;
  previewSource?: string;
}

export interface SyntaxSpan {
  from: number;
  to: number;
  categoryId: string;
}

export interface SyntaxDiagnostic {
  severity: "info" | "warning" | "error";
  message: string;
  from?: number;
  to?: number;
  code?: string;
}

export interface HighlightDocument {
  schemaVersion: 1;
  languageId: string;
  languageVersion: string;
  source: string;
  spans: SyntaxSpan[];
  diagnostics: SyntaxDiagnostic[];
  revision?: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  colors: Record<string, string>;
}

export interface TextEdit { from: number; to: number; insert: string }

export interface FormatResult {
  source: string;
  formatted: string;
  edits: TextEdit[];
  diagnostics: SyntaxDiagnostic[];
}

export interface LanguageAdapter {
  readonly pack: LanguagePackV2;
  readonly revision?: string;
  tokenize(source: string): readonly SyntaxSpan[];
  format?(source: string): FormatResult;
}
