export const RENDERED_PROCESSED_ATTRIBUTE = "data-syntax-highlight-processed";

export interface RenderedCodeBlockCandidate {
  pre: HTMLPreElement;
  code: HTMLElement;
  fence: string;
  source: string;
}

function languageClasses(element: Element): Set<string> {
  const fences = new Set<string>();
  for (const className of element.classList) {
    if (!className.startsWith("language-")) continue;
    const fence = className.slice("language-".length).toLocaleLowerCase();
    if (fence) fences.add(fence);
  }
  return fences;
}

function resolvedFence(
  pre: HTMLPreElement,
  code: HTMLElement,
): string | undefined {
  const preFences = languageClasses(pre);
  const codeFences = languageClasses(code);
  if (preFences.size > 1 || codeFences.size > 1) return undefined;

  const preFence = [...preFences][0];
  const codeFence = [...codeFences][0];
  if (preFence !== undefined && codeFence !== undefined && preFence !== codeFence) {
    return undefined;
  }
  return codeFence ?? preFence;
}

function directCodeChild(pre: HTMLPreElement): HTMLElement | undefined {
  const codeChildren = [...pre.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName === "CODE",
  );
  return codeChildren.length === 1 ? codeChildren[0] : undefined;
}

function alreadyProcessed(pre: HTMLPreElement): boolean {
  return (
    pre.closest(
      `[${RENDERED_PROCESSED_ATTRIBUTE}], .syntax-highlight-frame`,
    ) !== null
  );
}

export function collectUnprocessedRenderedCodeBlocks(
  root: HTMLElement,
): RenderedCodeBlockCandidate[] {
  const pres = new Set<HTMLPreElement>();
  if (root instanceof HTMLPreElement) pres.add(root);
  root.querySelectorAll("pre").forEach((pre) => {
    if (pre instanceof HTMLPreElement) pres.add(pre);
  });

  const candidates: RenderedCodeBlockCandidate[] = [];
  for (const pre of pres) {
    if (alreadyProcessed(pre)) continue;
    const code = directCodeChild(pre);
    if (code === undefined) continue;
    const fence = resolvedFence(pre, code);
    if (fence === undefined) continue;
    candidates.push({
      pre,
      code,
      fence,
      source: code.textContent ?? "",
    });
  }
  return candidates;
}

export function replaceRenderedCodeBlockCandidate(
  candidate: RenderedCodeBlockCandidate,
  host: HTMLElement,
): void {
  const auxiliaryChildren = [...candidate.pre.children].filter(
    (child) => child !== candidate.code,
  );
  const renderedPre = host.querySelector("pre");
  if (renderedPre !== null) renderedPre.append(...auxiliaryChildren);
  candidate.pre.replaceWith(host);
}
