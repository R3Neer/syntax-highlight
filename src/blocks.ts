export interface MudCodeBlock {
  from: number;
  to: number;
  language: string;
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

export function findCodeBlocks(
  source: string,
  acceptedLanguages: ReadonlySet<string>,
): MudCodeBlock[] {
  const lines = sourceLines(source);
  const blocks: MudCodeBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) continue;
    const opening =
      /^[\t ]*(`{3,}|~{3,})[\t ]*([A-Za-z0-9_-]+)(?:[\t ].*)?$/.exec(
        line.text,
      );
    if (opening === null) continue;
    const language = opening[2]?.toLocaleLowerCase() ?? "";
    if (!acceptedLanguages.has(language)) continue;

    const fence = opening[1] ?? "```";
    const fenceChar = fence[0] ?? "`";
    const minimum = fence.length;
    const closingPattern = new RegExp(
      `^[\\t ]*${fenceChar === "`" ? "`" : "~"}{${minimum},}[\\t ]*$`,
    );
    const bodyFrom = line.next;
    let bodyTo = source.length;

    for (let closingIndex = index + 1; closingIndex < lines.length; closingIndex += 1) {
      const closingLine = lines[closingIndex];
      if (closingLine !== undefined && closingPattern.test(closingLine.text)) {
        bodyTo = closingLine.from;
        index = closingIndex;
        break;
      }
    }
    blocks.push({ from: bodyFrom, to: bodyTo, language });
  }

  return blocks;
}

export function findMudCodeBlocks(source: string): MudCodeBlock[] {
  return findCodeBlocks(source, new Set(["mud"]));
}
