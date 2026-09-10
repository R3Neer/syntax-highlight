export interface CodeBlockBodyLine {
  lineFrom: number;
  lineTo: number;
  sourceFrom: number;
  sourceTo: number;
  logicalFrom: number;
  logicalTo: number;
}

export interface MappedCodeRange {
  from: number;
  to: number;
}

export interface CodeBlockSourceSection {
  lineStart: number;
  lineEnd: number;
}

export interface MudCodeBlock {
  from: number;
  to: number;
  language: string;
  languageFrom: number;
  languageTo: number;
  openingLine: number;
  openingLineFrom: number;
  openingLineTo: number;
  closingLineFrom?: number;
  closingLineTo?: number;
  quoteDepth: number;
  body: string;
  bodyLines: readonly CodeBlockBodyLine[];
}

export function isSafeMarkdownProcessorLanguage(language: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(language);
}

interface SourceLine {
  from: number;
  to: number;
  next: number;
  text: string;
}

interface QuotePrefix {
  depth: number;
  offset: number;
}

interface OpeningFence {
  fence: string;
  rawLanguage: string;
  languageFrom: number;
  languageTo: number;
  quoteDepth: number;
}

function sourceLines(source: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let from = 0;

  while (from <= source.length) {
    let to = from;
    while (to < source.length && source[to] !== "\n" && source[to] !== "\r") {
      to += 1;
    }
    let next = to;
    if (source[next] === "\r" && source[next + 1] === "\n") next += 2;
    else if (next < source.length) next += 1;
    lines.push({ from, to, next, text: source.slice(from, to) });
    if (next >= source.length) break;
    from = next;
  }
  return lines;
}

function consumeBlockquotePrefix(
  text: string,
  maximumDepth = Number.POSITIVE_INFINITY,
): QuotePrefix {
  let cursor = 0;
  let depth = 0;

  while (depth < maximumDepth) {
    const markerStart = cursor;
    let spaces = 0;
    while (spaces < 3 && text[cursor] === " ") {
      cursor += 1;
      spaces += 1;
    }
    if (text[cursor] !== ">") {
      cursor = markerStart;
      break;
    }
    cursor += 1;
    if (text[cursor] === " " || text[cursor] === "\t") cursor += 1;
    depth += 1;
  }

  return { depth, offset: cursor };
}

function openingFence(line: SourceLine): OpeningFence | undefined {
  // Blockquotes and Obsidian callouts are Markdown containers. Strip only their
  // container markers while recognizing the fence; the body mapping later does
  // the same thing line-by-line before syntax parsing.
  const quote = consumeBlockquotePrefix(line.text);
  const remainder = line.text.slice(quote.offset);

  // Every fenced block is a container, even when its language is irrelevant to
  // Syntax Highlight. Otherwise a literal ```text example inside another fence
  // could be mistaken for a real block during a vault rewrite.
  const opening = /^[\t ]*(`{3,}|~{3,})(.*)$/.exec(remainder);
  if (opening === null) return undefined;
  const fence = opening[1] ?? "```";
  const trailing = opening[2] ?? "";
  const info = trailing.replace(/^[\t ]+/, "");

  // CommonMark does not allow a backtick inside the info string of a backtick
  // fence. Treating such a line as an opener would make this scanner less safe.
  if (fence[0] === "`" && info.includes("`")) return undefined;

  const rawLanguage = /^[^\t ]+/.exec(info)?.[0] ?? "";
  if (!rawLanguage) {
    const end = line.from + line.text.length;
    return {
      fence,
      rawLanguage: "",
      languageFrom: end,
      languageTo: end,
      quoteDepth: quote.depth,
    };
  }

  const fenceOffset = remainder.indexOf(fence);
  const languageOffset = remainder.indexOf(
    rawLanguage,
    Math.max(0, fenceOffset + fence.length),
  );
  if (languageOffset < 0) return undefined;
  const languageFrom = line.from + quote.offset + languageOffset;
  return {
    fence,
    rawLanguage,
    languageFrom,
    languageTo: languageFrom + rawLanguage.length,
    quoteDepth: quote.depth,
  };
}

function isClosingFence(line: SourceLine, opening: OpeningFence): boolean {
  const quote = consumeBlockquotePrefix(line.text, opening.quoteDepth);
  if (quote.depth !== opening.quoteDepth) return false;
  const remainder = line.text.slice(quote.offset);
  const fenceChar = opening.fence[0] ?? "`";
  const minimum = opening.fence.length;
  const marker = fenceChar === "`" ? "`" : "~";
  return new RegExp(`^[\\t ]*${marker}{${minimum},}[\\t ]*$`).test(remainder);
}

function buildLogicalBody(
  source: string,
  lines: readonly SourceLine[],
  quoteDepth: number,
): { body: string; bodyLines: CodeBlockBodyLine[] } {
  let body = "";
  const bodyLines: CodeBlockBodyLine[] = [];

  for (const line of lines) {
    const quote = consumeBlockquotePrefix(line.text, quoteDepth);
    const sourceFrom = line.from + (quote.depth === quoteDepth ? quote.offset : 0);
    const sourceTo = line.to;
    const logicalFrom = body.length;
    body += source.slice(sourceFrom, sourceTo);
    const logicalTo = body.length;
    bodyLines.push({
      lineFrom: line.from,
      lineTo: line.to,
      sourceFrom,
      sourceTo,
      logicalFrom,
      logicalTo,
    });
    body += source.slice(line.to, line.next);
  }

  return { body, bodyLines };
}

export function mapCodeBlockRange(
  block: MudCodeBlock,
  logicalFrom: number,
  logicalTo: number,
): MappedCodeRange[] {
  if (logicalFrom >= logicalTo) return [];
  const mapped: MappedCodeRange[] = [];
  for (const line of block.bodyLines) {
    const from = Math.max(logicalFrom, line.logicalFrom);
    const to = Math.min(logicalTo, line.logicalTo);
    if (from >= to) continue;
    mapped.push({
      from: line.sourceFrom + (from - line.logicalFrom),
      to: line.sourceFrom + (to - line.logicalFrom),
    });
  }
  return mapped;
}

export function isCodeBlockContentPosition(
  block: MudCodeBlock,
  position: number,
): boolean {
  return block.bodyLines.some(
    ({ sourceFrom, sourceTo }) => position >= sourceFrom && position <= sourceTo,
  );
}

function comparableRenderedBody(value: string): string {
  const normalized = value.replace(/\r\n?/g, "\n");
  return normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
}

export function findCodeBlockBodyStartLine(
  markdownSource: string,
  fence: string,
  renderedSource: string,
  section?: CodeBlockSourceSection | null,
): number | undefined {
  const language = fence.toLocaleLowerCase();
  const targetBody = comparableRenderedBody(renderedSource);
  const matches = findCodeBlocks(markdownSource, new Set([language])).filter(
    (block) => comparableRenderedBody(block.body) === targetBody,
  );
  if (matches.length === 0) return undefined;

  if (section !== undefined && section !== null) {
    const scoped = matches.filter(
      ({ openingLine }) =>
        openingLine >= section.lineStart && openingLine <= section.lineEnd,
    );
    if (scoped.length === 1) return scoped[0]!.openingLine + 1;
    if (scoped.length > 1) return scoped[0]!.openingLine + 1;
  }

  return matches.length === 1 ? matches[0]!.openingLine + 1 : undefined;
}

export function findCodeBlocks(
  source: string,
  acceptedLanguages: ReadonlySet<string>,
): MudCodeBlock[] {
  const lines = sourceLines(source);
  const blocks: MudCodeBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) continue;
    const opening = openingFence(line);
    if (opening === undefined) continue;

    const openingIndex = index;
    const language = opening.rawLanguage.toLocaleLowerCase();
    let bodyEndIndex = lines.length;
    let closingIndex: number | undefined;
    let resumeIndex = lines.length;

    for (let candidate = openingIndex + 1; candidate < lines.length; candidate += 1) {
      const candidateLine = lines[candidate];
      if (candidateLine === undefined) continue;

      // Fenced code is not a lazy blockquote continuation. Once a quoted fence
      // loses one of its container markers, its quoted container has ended.
      if (opening.quoteDepth > 0) {
        const quote = consumeBlockquotePrefix(candidateLine.text, opening.quoteDepth);
        if (quote.depth !== opening.quoteDepth) {
          bodyEndIndex = candidate;
          resumeIndex = candidate - 1;
          break;
        }
      }

      if (isClosingFence(candidateLine, opening)) {
        bodyEndIndex = candidate;
        closingIndex = candidate;
        resumeIndex = candidate;
        break;
      }
    }

    const bodySourceLines = lines.slice(openingIndex + 1, bodyEndIndex);
    const { body, bodyLines } = buildLogicalBody(
      source,
      bodySourceLines,
      opening.quoteDepth,
    );
    const bodyFrom = line.next;
    const bodyTo = lines[bodyEndIndex]?.from ?? source.length;
    const closingLine =
      closingIndex === undefined ? undefined : lines[closingIndex];

    // Skip the complete fenced container whether or not its language is one of
    // the requested ones. This prevents false positives inside unrelated fences.
    index = closingIndex !== undefined ? closingIndex : resumeIndex;

    if (!language || !acceptedLanguages.has(language)) continue;
    blocks.push({
      from: bodyFrom,
      to: bodyTo,
      language,
      languageFrom: opening.languageFrom,
      languageTo: opening.languageTo,
      openingLine: openingIndex,
      openingLineFrom: line.from,
      openingLineTo: line.to,
      closingLineFrom: closingLine?.from,
      closingLineTo: closingLine?.to,
      quoteDepth: opening.quoteDepth,
      body,
      bodyLines,
    });
  }

  return blocks;
}

export function findMudCodeBlocks(source: string): MudCodeBlock[] {
  return findCodeBlocks(source, new Set(["mud"]));
}
