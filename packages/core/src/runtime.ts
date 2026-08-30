import type {
  FormatResult,
  HighlightDocument,
  LanguageAdapter,
  SyntaxSpan,
  TextEdit,
} from "./types";

function normalizedSpans(source: string, spans: readonly SyntaxSpan[]): SyntaxSpan[] {
  const result = [...spans].sort((left, right) => left.from - right.from || left.to - right.to);
  let end = 0;
  for (const span of result) {
    if (!Number.isInteger(span.from) || !Number.isInteger(span.to) || span.from < end || span.to <= span.from || span.to > source.length) {
      throw new Error(`Invalid or overlapping syntax span ${span.from}..${span.to}.`);
    }
    end = span.to;
  }
  return result;
}

export function highlight(source: string, adapter: LanguageAdapter): HighlightDocument {
  return {
    schemaVersion: 1,
    languageId: adapter.pack.id,
    languageVersion: adapter.pack.version,
    source,
    spans: normalizedSpans(source, adapter.tokenize(source)),
    diagnostics: [],
    revision: adapter.revision,
  };
}

export function applyEdits(source: string, edits: readonly TextEdit[]): string {
  const ordered = [...edits].sort((left, right) => left.from - right.from || left.to - right.to);
  let end = 0;
  let output = "";
  for (const edit of ordered) {
    if (edit.from < end || edit.to < edit.from || edit.to > source.length) throw new Error("Invalid or overlapping text edits.");
    output += source.slice(end, edit.from) + edit.insert;
    end = edit.to;
  }
  return output + source.slice(end);
}

export function minimalEdit(source: string, formatted: string): TextEdit[] {
  if (source === formatted) return [];
  let from = 0;
  while (from < source.length && from < formatted.length && source[from] === formatted[from]) from += 1;
  let sourceTo = source.length;
  let formattedTo = formatted.length;
  while (sourceTo > from && formattedTo > from && source[sourceTo - 1] === formatted[formattedTo - 1]) {
    sourceTo -= 1;
    formattedTo -= 1;
  }
  return [{ from, to: sourceTo, insert: formatted.slice(from, formattedTo) }];
}

export function format(source: string, adapter: LanguageAdapter): FormatResult {
  if (adapter.format === undefined) return { source, formatted: source, edits: [], diagnostics: [{ severity: "info", code: "formatter-unavailable", message: `No formatter is available for ${adapter.pack.id}.` }] };
  const result = adapter.format(source);
  if (applyEdits(source, result.edits) !== result.formatted) throw new Error("Formatter edits do not reproduce formatted output.");
  return result;
}
