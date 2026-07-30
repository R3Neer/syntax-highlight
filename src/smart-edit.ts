import {
  insertNewlineAndIndent,
  toggleComment,
} from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import {
  EditorSelection,
  EditorState,
  Prec,
  type Extension,
  type SelectionRange,
} from "@codemirror/state";
import { EditorView, keymap, type Command } from "@codemirror/view";

import type { SyntaxPluginSettings } from "./settings";

export interface EditingContext {
  from: number;
  to: number;
  languageId: string;
  nativeIndentation?: boolean;
}

export type EditingContextResolver = (
  state: EditorState,
  position: number,
) => EditingContext | undefined;

interface EditProposal {
  from: number;
  to: number;
  insert: string;
  selectionFrom: number;
  selectionTo: number;
}

const PAIRS: Readonly<Record<string, string>> = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
};

const CLOSERS = new Set(Object.values(PAIRS));

function unit(settings: SyntaxPluginSettings): string {
  return settings.indentStyle === "tabs"
    ? "\t"
    : " ".repeat(settings.indentSize);
}

function lineIndent(state: EditorState, position: number): string {
  return /^[\t ]*/.exec(state.doc.lineAt(position).text)?.[0] ?? "";
}

function lineBounds(source: string, position: number): { from: number; to: number } {
  let from = position;
  let to = position;
  while (from > 0 && source[from - 1] !== "\n" && source[from - 1] !== "\r") from -= 1;
  while (to < source.length && source[to] !== "\n" && source[to] !== "\r") to += 1;
  return { from, to };
}

function previousLine(source: string, from: number): { from: number; to: number } | undefined {
  if (from === 0) return undefined;
  let end = from - 1;
  if (source[end] === "\n" && source[end - 1] === "\r") end -= 1;
  let start = end;
  while (start > 0 && source[start - 1] !== "\n" && source[start - 1] !== "\r") start -= 1;
  return { from: start, to: end };
}

function nextLine(source: string, to: number): { from: number; to: number } | undefined {
  if (to >= source.length) return undefined;
  let start = to + 1;
  if (source[to] === "\r" && source[to + 1] === "\n") start += 1;
  let end = start;
  while (end < source.length && source[end] !== "\n" && source[end] !== "\r") end += 1;
  return { from: start, to: end };
}

function logicalBounds(
  source: string,
  position: number,
  context: EditingContext,
): { from: number; to: number } {
  let current = lineBounds(source, position);
  current = {
    from: Math.max(current.from, context.from),
    to: Math.min(current.to, context.to),
  };
  let from = current.from;
  let to = current.to;

  while (from > context.from) {
    const previous = previousLine(source, from);
    if (previous === undefined || previous.to < context.from) break;
    const text = source.slice(previous.from, previous.to).trimEnd();
    if (!/(?:,|\.\.|[=+\-*/%&|^])$/.test(text)) break;
    from = Math.max(previous.from, context.from);
  }
  while (to < context.to) {
    const text = source.slice(from, to).trimEnd();
    if (!/(?:,|\.\.|[=+\-*/%&|^])$/.test(text)) break;
    const following = nextLine(source, to);
    if (following === undefined || following.from > context.to) break;
    to = Math.min(following.to, context.to);
  }
  return { from, to };
}

interface CandidateAnalysis {
  commas: number;
  intervals: number;
  lastBoundary: number;
  invalid: boolean;
}

function analyzeCandidate(source: string): CandidateAnalysis {
  const stack: string[] = [];
  let commas = 0;
  let intervals = 0;
  let lastBoundary = -1;
  let invalid = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";
    if (character === "#") {
      invalid = true;
      break;
    }
    if (character === '"' || character === "'") {
      const quote = character;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") index += 2;
        else if (source[index] === quote) break;
        else index += 1;
      }
      if (index >= source.length) invalid = true;
      continue;
    }
    const closer = PAIRS[character];
    if (closer !== undefined && character !== '"' && character !== "'") {
      stack.push(closer);
      continue;
    }
    if (CLOSERS.has(character)) {
      if (stack.pop() !== character) {
        invalid = true;
        break;
      }
      continue;
    }
    if (stack.length > 0) continue;
    if (character === ",") commas += 1;
    if (character === "." && source[index + 1] === ".") {
      intervals += 1;
      index += 1;
      continue;
    }
    if (
      character === "=" ||
      character === ":" ||
      character === ";" ||
      character === "{" ||
      character === "}"
    ) {
      lastBoundary = index;
    }
  }
  if (stack.length > 0) invalid = true;
  return { commas, intervals, lastBoundary, invalid };
}

function trimmedRange(
  source: string,
  from: number,
  to: number,
): { from: number; to: number; text: string } | undefined {
  const raw = source.slice(from, to);
  const left = raw.length - raw.trimStart().length;
  const right = raw.trimEnd().length;
  if (right <= left) return undefined;
  return {
    from: from + left,
    to: from + right,
    text: raw.slice(left, right),
  };
}

export function retroactiveWrap(
  source: string,
  position: number,
  typed: string,
  context: EditingContext,
): EditProposal | undefined {
  if (context.languageId !== "mud" || !["[", "(", "]", ")"].includes(typed)) {
    return undefined;
  }
  const logical = logicalBounds(source, position, context);
  const opening = typed === "[" || typed === "(";
  let candidate = trimmedRange(
    source,
    opening ? position : logical.from,
    opening ? logical.to : position,
  );
  if (candidate === undefined) return undefined;

  let analysis = analyzeCandidate(candidate.text);
  if (!opening && analysis.lastBoundary >= 0) {
    candidate = trimmedRange(
      source,
      candidate.from + analysis.lastBoundary + 1,
      candidate.to,
    );
    if (candidate === undefined) return undefined;
    analysis = analyzeCandidate(candidate.text);
  }
  if (analysis.invalid || analysis.lastBoundary >= 0) return undefined;

  const interval = analysis.intervals === 1 && analysis.commas === 0;
  const collection = analysis.intervals === 0 && analysis.commas > 0;
  if (!interval && !collection) return undefined;
  if (collection && (typed === "(" || typed === ")")) return undefined;

  const prefix = opening ? typed : "[";
  const suffix = opening ? "]" : typed;
  const insert = `${prefix}${candidate.text}${suffix}`;
  return {
    from: candidate.from,
    to: candidate.to,
    insert,
    selectionFrom: opening ? 1 : insert.length,
    selectionTo: opening ? 1 : insert.length,
  };
}

function blockDelimiterProposal(
  state: EditorState,
  position: number,
  typed: string,
  context: EditingContext,
  settings: SyntaxPluginSettings,
): EditProposal | undefined {
  if (context.languageId !== "mud") return undefined;
  const delimiter = typed === "#" ? "###" : typed === '"' ? '"""' : undefined;
  if (
    delimiter === undefined ||
    position < 2 ||
    state.sliceDoc(position - 2, position) !== typed.repeat(2)
  ) {
    return undefined;
  }
  const line = state.doc.lineAt(position);
  const before = state.sliceDoc(line.from, position - 2);
  const after = state.sliceDoc(position, line.to);
  if (!/^[\t ]*$/.test(before) || !/^[\t ]*$/.test(after)) return undefined;
  const indentation = before;
  const inner = indentation + unit(settings);
  const insert = `${delimiter}\n${inner}\n${indentation}${delimiter}`;
  return {
    from: position - 2,
    to: position,
    insert,
    selectionFrom: delimiter.length + 1 + inner.length,
    selectionTo: delimiter.length + 1 + inner.length,
  };
}

function typedProposal(
  state: EditorState,
  range: SelectionRange,
  typed: string,
  context: EditingContext,
  settings: SyntaxPluginSettings,
): EditProposal | undefined {
  if (!range.empty) {
    const close = PAIRS[typed];
    if (close === undefined) return undefined;
    const selected = state.sliceDoc(range.from, range.to);
    return {
      from: range.from,
      to: range.to,
      insert: `${typed}${selected}${close}`,
      selectionFrom: 1,
      selectionTo: 1 + selected.length,
    };
  }

  const block = blockDelimiterProposal(
    state,
    range.from,
    typed,
    context,
    settings,
  );
  if (block !== undefined) return block;

  const retrospective = retroactiveWrap(
    state.doc.toString(),
    range.from,
    typed,
    context,
  );
  if (retrospective !== undefined) return retrospective;

  if (CLOSERS.has(typed) && state.sliceDoc(range.from, range.from + 1) === typed) {
    return {
      from: range.from,
      to: range.from,
      insert: "",
      selectionFrom: 1,
      selectionTo: 1,
    };
  }

  const line = state.doc.lineAt(range.from);
  const prefix = state.sliceDoc(line.from, range.from);
  if (["}", "]", ")"].includes(typed) && /^[\t ]*$/.test(prefix)) {
    const indentation = lineIndent(state, range.from);
    const reduced = indentation.endsWith(unit(settings))
      ? indentation.slice(0, -unit(settings).length)
      : indentation;
    return {
      from: line.from,
      to: range.from,
      insert: `${reduced}${typed}`,
      selectionFrom: reduced.length + 1,
      selectionTo: reduced.length + 1,
    };
  }

  const close = PAIRS[typed];
  if (close === undefined || (typed === "#" && context.languageId === "mud")) {
    return undefined;
  }
  if (
    (typed === '"' || typed === "'") &&
    (/[A-Za-z0-9_]/.test(state.sliceDoc(range.from - 1, range.from)) ||
      /[A-Za-z0-9_]/.test(state.sliceDoc(range.from, range.from + 1)))
  ) {
    return undefined;
  }
  if (
    (typed === '"' || typed === "'") &&
    /(?:^|[^\\])(?:\\\\)*\\$/.test(state.sliceDoc(line.from, range.from))
  ) {
    return undefined;
  }

  return {
    from: range.from,
    to: range.to,
    insert: `${typed}${close}`,
    selectionFrom: 1,
    selectionTo: 1,
  };
}

function dispatchProposals(view: EditorView, proposals: EditProposal[]): boolean {
  const ordered = [...proposals].sort((left, right) => left.from - right.from);
  for (let index = 1; index < ordered.length; index += 1) {
    if ((ordered[index - 1]?.to ?? 0) > (ordered[index]?.from ?? 0)) return false;
  }
  let delta = 0;
  const ranges: SelectionRange[] = [];
  for (const proposal of ordered) {
    const base = proposal.from + delta;
    ranges.push(
      EditorSelection.range(
        base + proposal.selectionFrom,
        base + proposal.selectionTo,
      ),
    );
    delta += proposal.insert.length - (proposal.to - proposal.from);
  }
  view.dispatch({
    changes: ordered.map(({ from, to, insert }) => ({ from, to, insert })),
    selection: EditorSelection.create(ranges),
    userEvent: "input.type",
    scrollIntoView: true,
  });
  return true;
}

function smartEnter(
  resolver: EditingContextResolver,
  getSettings: () => SyntaxPluginSettings,
): Command {
  return (view) => {
    const settings = getSettings();
    const contexts = view.state.selection.ranges.map((range) =>
      range.empty ? resolver(view.state, range.from) : undefined,
    );
    if (
      contexts.length > 0 &&
      contexts.every((context) => context?.nativeIndentation === true)
    ) {
      return insertNewlineAndIndent(view);
    }
    const proposals: EditProposal[] = [];
    for (const [index, range] of view.state.selection.ranges.entries()) {
      if (!range.empty) return false;
      const context = contexts[index];
      if (context === undefined) return false;
      const line = view.state.doc.lineAt(range.from);
      const before = view.state.sliceDoc(line.from, range.from);
      const after = view.state.sliceDoc(range.from, line.to);
      const indentation = /^[\t ]*/.exec(before)?.[0] ?? "";
      const trimmed = before.trimStart();

      if (
        context.languageId === "mud" &&
        settings.continueLineComments &&
        /^#(?!##)(?: )?$/.test(trimmed) &&
        after.trim() === ""
      ) {
        proposals.push({
          from: line.from,
          to: range.from,
          insert: indentation,
          selectionFrom: indentation.length,
          selectionTo: indentation.length,
        });
        continue;
      }
      if (
        context.languageId === "mud" &&
        settings.continueLineComments &&
        /^#(?!##)/.test(trimmed)
      ) {
        const insert = `\n${indentation}# `;
        proposals.push({
          from: range.from,
          to: range.from,
          insert,
          selectionFrom: insert.length,
          selectionTo: insert.length,
        });
        continue;
      }

      const left = view.state.sliceDoc(Math.max(context.from, range.from - 3), range.from);
      const right = view.state.sliceDoc(range.from, Math.min(context.to, range.from + 3));
      const triple =
        context.languageId === "mud" &&
        ((left.endsWith('"""') && right.startsWith('"""')) ||
          (left.endsWith("###") && right.startsWith("###")));
      if (triple) {
        const insert = `\n${indentation}${unit(settings)}\n${indentation}`;
        proposals.push({
          from: range.from,
          to: range.from,
          insert,
          selectionFrom: 1 + indentation.length + unit(settings).length,
          selectionTo: 1 + indentation.length + unit(settings).length,
        });
        continue;
      }

      const immediateLeft = view.state.sliceDoc(range.from - 1, range.from);
      const immediateRight = view.state.sliceDoc(range.from, range.from + 1);
      if (PAIRS[immediateLeft] === immediateRight) {
        const inner = indentation + unit(settings);
        const insert = `\n${inner}\n${indentation}`;
        proposals.push({
          from: range.from,
          to: range.from,
          insert,
          selectionFrom: 1 + inner.length,
          selectionTo: 1 + inner.length,
        });
        continue;
      }

      const continuation =
        /(?:[({[]|,|:=|=>|->|\.\.|[=+\-*/%&|^])[\t ]*$/.test(before);
      const nextIndent = continuation ? indentation + unit(settings) : indentation;
      const insert = `\n${nextIndent}`;
      proposals.push({
        from: range.from,
        to: range.from,
        insert,
        selectionFrom: insert.length,
        selectionTo: insert.length,
      });
    }
    return dispatchProposals(view, proposals);
  };
}

function deletePair(
  resolver: EditingContextResolver,
): Command {
  return (view) => {
    const proposals: EditProposal[] = [];
    for (const range of view.state.selection.ranges) {
      if (!range.empty || resolver(view.state, range.from) === undefined) return false;
      const left = view.state.sliceDoc(range.from - 1, range.from);
      const right = view.state.sliceDoc(range.from, range.from + 1);
      if (PAIRS[left] !== right) return false;
      proposals.push({
        from: range.from - 1,
        to: range.from + 1,
        insert: "",
        selectionFrom: 0,
        selectionTo: 0,
      });
    }
    return dispatchProposals(view, proposals);
  };
}

export function createSmartEditingExtensions(
  resolver: EditingContextResolver,
  getSettings: () => SyntaxPluginSettings,
): Extension[] {
  const settings = getSettings();
  return [
    EditorState.tabSize.of(settings.indentSize),
    indentUnit.of(unit(settings)),
    EditorState.languageData.of((state, position) => {
      const context = resolver(state, position);
      return context?.languageId === "mud"
        ? [{ commentTokens: { line: "#", block: { open: "###", close: "###" } } }]
        : [];
    }),
    EditorView.inputHandler.of((view, _from, _to, text) => {
      if (!getSettings().autoClose || text.length !== 1) return false;
      const proposals: EditProposal[] = [];
      for (const range of view.state.selection.ranges) {
        const context = resolver(view.state, range.from);
        if (context === undefined || range.to > context.to) return false;
        const proposal = typedProposal(
          view.state,
          range,
          text,
          context,
          getSettings(),
        );
        if (proposal === undefined) return false;
        proposals.push(proposal);
      }
      return dispatchProposals(view, proposals);
    }),
    Prec.highest(
      keymap.of([
        { key: "Enter", run: smartEnter(resolver, getSettings) },
        { key: "Backspace", run: deletePair(resolver) },
        { key: "Mod-/", run: toggleComment },
      ]),
    ),
  ];
}
