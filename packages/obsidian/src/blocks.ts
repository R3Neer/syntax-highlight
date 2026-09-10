export interface MudCodeBlock {
  from: number;
  to: number;
  language: string;
  languageFrom: number;
  languageTo: number;
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

interface OpeningFence {
  fence: string;
  rawLanguage: string;
  languageFrom: number;
  languageTo: number;
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

function openingFence(line: SourceLine): OpeningFence | undefined {
  // Every fenced block is a container, even when its language is irrelevant to
  // Syntax Highlight. Otherwise a literal ```text example inside another fence
  // could be mistaken for a real top-level Text block during a vault rewrite.
  const opening = /^[\t ]*(`{3,}|~{3,})(.*)$/.exec(line.text);
  if (opening === null) return undefined;
  const fence = opening[1] ?? "```";
  const remainder = opening[2] ?? "";
  const info = remainder.replace(/^[\t ]+/, "");

  // CommonMark does not allow a backtick inside the info string of a backtick
  // fence. Treating such a line as an opener would make this scanner less safe.
  if (fence[0] === "`" && info.includes("`")) return undefined;

  const rawLanguage = /^[^\t ]+/.exec(info)?.[0] ?? "";
  if (!rawLanguage) {
    const end = line.from + line.text.length;
    return { fence, rawLanguage: "", languageFrom: end, languageTo: end };
  }

  const fenceOffset = line.text.indexOf(fence);
  const languageOffset = line.text.indexOf(
    rawLanguage,
    Math.max(0, fenceOffset + fence.length),
  );
  if (languageOffset < 0) return undefined;
  const languageFrom = line.from + languageOffset;
  return {
    fence,
    rawLanguage,
    languageFrom,
    languageTo: languageFrom + rawLanguage.length,
  };
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

    const language = opening.rawLanguage.toLocaleLowerCase();
    const fenceChar = opening.fence[0] ?? "`";
    const minimum = opening.fence.length;
    const closingPattern = new RegExp(
      `^[\\t ]*${fenceChar === "`" ? "`" : "~"}{${minimum},}[\\t ]*$`,
    );
    const bodyFrom = line.next;
    let bodyTo = source.length;
    let closingIndex: number | undefined;

    for (let candidate = index + 1; candidate < lines.length; candidate += 1) {
      const closingLine = lines[candidate];
      if (closingLine !== undefined && closingPattern.test(closingLine.text)) {
        bodyTo = closingLine.from;
        closingIndex = candidate;
        break;
      }
    }

    // Skip the complete fenced container whether or not its language is one of
    // the requested ones. This prevents false positives inside unrelated fences.
    index = closingIndex ?? lines.length;

    if (!language || !acceptedLanguages.has(language)) continue;
    blocks.push({
      from: bodyFrom,
      to: bodyTo,
      language,
      languageFrom: opening.languageFrom,
      languageTo: opening.languageTo,
    });
  }

  return blocks;
}

export function findMudCodeBlocks(source: string): MudCodeBlock[] {
  return findCodeBlocks(source, new Set(["mud"]));
}
