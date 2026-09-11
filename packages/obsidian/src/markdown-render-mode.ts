import type { SyntaxPluginSettings } from "./settings";

export interface MarkdownRenderViewState {
  mode: "source" | "preview";
  sourcePath?: string;
  ownsElement: boolean;
}

export function markdownHighlightEnabledForContext(
  settings: Pick<SyntaxPluginSettings, "markdownEditor" | "markdownReading">,
  views: readonly MarkdownRenderViewState[],
  sourcePath: string,
): boolean {
  const owner = views.find(({ ownsElement }) => ownsElement);
  if (owner !== undefined) {
    return owner.mode === "source"
      ? settings.markdownEditor
      : settings.markdownReading;
  }

  const matchingSourceViews = views.filter(
    (view) => view.sourcePath === sourcePath,
  );
  const fallback = matchingSourceViews.length === 1
    ? matchingSourceViews[0]
    : undefined;
  return fallback?.mode === "source"
    ? settings.markdownEditor
    : settings.markdownReading;
}
