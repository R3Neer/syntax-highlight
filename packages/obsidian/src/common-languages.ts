import { nushell } from "@codincod/codemirror-lang-nushell";
import { shell } from "@codincod/codemirror-lang-shell";
import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { PostgreSQL, sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";
import {
  HighlightStyle,
  LanguageSupport,
  StreamLanguage,
  type StreamParser,
} from "@codemirror/language";
import { powerShell } from "@codemirror/legacy-modes/mode/powershell";
import { csharp } from "@replit/codemirror-lang-csharp";
import { tags, type Tag } from "@lezer/highlight";

export type CommonPresentationFamily = "text" | "markdown";

export interface CommonLanguagePresentation {
  badge?: boolean;
  lineNumbers?: boolean;
  family?: CommonPresentationFamily;
}

export type CommonStreamTokenTable = Readonly<
  Record<string, Tag | readonly Tag[]>
>;

export interface CommonTreeEngine {
  kind: "tree";
  support: () => LanguageSupport;
}

export interface CommonStreamEngine {
  kind: "stream";
  parser: StreamParser<unknown>;
  tokenTags: CommonStreamTokenTable;
}

export interface CommonPlainEngine {
  kind: "plain";
}

export type CommonLanguageEngine =
  | CommonTreeEngine
  | CommonStreamEngine
  | CommonPlainEngine;

export interface CommonLanguage {
  id: string;
  name: string;
  fences: readonly string[];
  extensions: readonly string[];
  engine: CommonLanguageEngine;
  /** Optional visual furniture policy. Omitted values keep ordinary code-block behavior. */
  presentation?: CommonLanguagePresentation;
}

function treeEngine(support: () => LanguageSupport): CommonTreeEngine {
  return { kind: "tree", support };
}

function streamEngine<State>(
  parser: StreamParser<State>,
  tokenTags: CommonStreamTokenTable,
): CommonStreamEngine {
  return {
    kind: "stream",
    parser: parser as StreamParser<unknown>,
    tokenTags,
  };
}

const POWERSHELL_TOKEN_TAGS: CommonStreamTokenTable = {
  variable: tags.variableName,
  number: tags.number,
  operator: tags.operator,
  builtin: tags.standard(tags.variableName),
  punctuation: tags.punctuation,
  string: tags.string,
  comment: tags.comment,
  keyword: tags.keyword,
  error: tags.invalid,
};

const COMMON_LANGUAGES: readonly CommonLanguage[] = [
  {
    id: "javascript",
    name: "JavaScript",
    fences: ["js", "javascript", "jsx", "mjs", "cjs"],
    extensions: ["js", "jsx", "mjs", "cjs"],
    engine: treeEngine(() => javascript({ jsx: true })),
  },
  {
    id: "typescript",
    name: "TypeScript",
    fences: ["ts", "typescript", "tsx", "mts", "cts"],
    extensions: ["ts", "tsx", "mts", "cts"],
    engine: treeEngine(() => javascript({ jsx: true, typescript: true })),
  },
  {
    id: "json",
    name: "JSON",
    fences: ["json", "jsonc"],
    extensions: ["json", "jsonc"],
    engine: treeEngine(json),
  },
  {
    id: "html",
    name: "HTML",
    fences: ["html", "htm"],
    extensions: ["html", "htm"],
    engine: treeEngine(html),
  },
  {
    id: "css",
    name: "CSS",
    fences: ["css"],
    extensions: ["css"],
    engine: treeEngine(css),
  },
  {
    id: "bash",
    name: "Bash",
    fences: ["bash", "sh", "shell"],
    extensions: ["sh", "bash"],
    engine: treeEngine(() => shell()),
  },
  {
    id: "nu",
    name: "Nushell",
    fences: ["nu", "nushell"],
    extensions: ["nu"],
    engine: treeEngine(nushell),
  },
  {
    id: "powershell",
    name: "PowerShell",
    fences: ["powershell", "pwsh", "ps1"],
    extensions: ["ps1", "psm1", "psd1"],
    engine: streamEngine(powerShell, POWERSHELL_TOKEN_TAGS),
  },
  {
    id: "python",
    name: "Python",
    fences: ["py", "python"],
    extensions: ["py"],
    engine: treeEngine(python),
  },
  {
    id: "java",
    name: "Java",
    fences: ["java"],
    extensions: ["java"],
    engine: treeEngine(java),
  },
  {
    id: "c",
    name: "C",
    fences: ["c"],
    extensions: ["c", "h"],
    engine: treeEngine(cpp),
  },
  {
    id: "cpp",
    name: "C++",
    fences: ["cpp", "c++", "cc", "cxx"],
    extensions: ["cpp", "cc", "cxx", "hpp", "hxx"],
    engine: treeEngine(cpp),
  },
  {
    id: "csharp",
    name: "C#",
    fences: ["cs", "csharp"],
    extensions: ["cs"],
    engine: treeEngine(csharp),
  },
  {
    id: "sql",
    name: "SQL",
    fences: ["sql"],
    extensions: ["sql"],
    engine: treeEngine(() => sql({ dialect: PostgreSQL })),
  },
  {
    id: "yaml",
    name: "YAML",
    fences: ["yaml", "yml"],
    extensions: ["yaml", "yml"],
    engine: treeEngine(yaml),
  },
  {
    id: "markdown",
    name: "Markdown",
    fences: ["md", "markdown"],
    extensions: ["md", "markdown"],
    engine: treeEngine(markdown),
    presentation: {
      badge: false,
      lineNumbers: false,
      family: "markdown",
    },
  },
  {
    id: "text",
    name: "Text",
    fences: ["text", "plaintext", "txt"],
    extensions: [],
    engine: { kind: "plain" },
    presentation: {
      badge: false,
      lineNumbers: false,
      family: "text",
    },
  },
];

function normalized(value: string): string {
  return value.toLocaleLowerCase().replace(/^\./, "");
}

export function commonLanguages(): readonly CommonLanguage[] {
  return COMMON_LANGUAGES;
}

export function commonLanguageByFence(
  fence: string,
): CommonLanguage | undefined {
  const target = normalized(fence);
  return COMMON_LANGUAGES.find(({ fences }) =>
    fences.some((candidate) => normalized(candidate) === target),
  );
}

export function commonLanguageByExtension(
  extension: string,
): CommonLanguage | undefined {
  const target = normalized(extension);
  return COMMON_LANGUAGES.find(({ extensions }) =>
    extensions.some((candidate) => normalized(candidate) === target),
  );
}

export function effectiveCommonStreamTokenTable(
  engine: CommonStreamEngine,
): Record<string, Tag | readonly Tag[]> {
  return {
    ...engine.tokenTags,
    ...(engine.parser.tokenTable ?? {}),
  };
}

export function effectiveCommonStreamParser(
  engine: CommonStreamEngine,
): StreamParser<unknown> {
  return {
    ...engine.parser,
    tokenTable: effectiveCommonStreamTokenTable(engine),
  };
}

export function commonLanguageSupport(
  language: CommonLanguage,
): LanguageSupport | undefined {
  switch (language.engine.kind) {
    case "tree":
      return language.engine.support();
    case "stream":
      return new LanguageSupport(
        StreamLanguage.define(effectiveCommonStreamParser(language.engine)),
      );
    case "plain":
      return undefined;
  }
}

function semanticCommonHighlightStyle(): HighlightStyle {
  return HighlightStyle.define([
    { tag: tags.comment, class: "syntax-common-comment" },
    {
      tag: [
        tags.keyword,
        tags.controlKeyword,
        tags.moduleKeyword,
        tags.operatorKeyword,
      ],
      class: "syntax-common-keyword",
    },
    { tag: tags.definitionKeyword, class: "syntax-common-declaration" },
    {
      tag: [tags.typeName, tags.className, tags.namespace],
      class: "syntax-common-type",
    },
    {
      tag: tags.standard(tags.variableName),
      class: "syntax-common-callable",
    },
    { tag: tags.variableName, class: "syntax-common-variable" },
    {
      tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
      class: "syntax-common-callable",
    },
    {
      tag: tags.definition(tags.variableName),
      class: "syntax-common-declaration",
    },
    { tag: tags.propertyName, class: "syntax-common-property" },
    {
      tag: [tags.string, tags.special(tags.string)],
      class: "syntax-common-string",
    },
    { tag: tags.regexp, class: "syntax-common-regex" },
    {
      tag: [tags.number, tags.integer, tags.float, tags.bool, tags.null, tags.atom],
      class: "syntax-common-number",
    },
    {
      tag: [
        tags.operator,
        tags.compareOperator,
        tags.logicOperator,
        tags.arithmeticOperator,
      ],
      class: "syntax-common-operator",
    },
    {
      tag: [tags.bracket, tags.paren, tags.squareBracket, tags.brace],
      class: "syntax-common-delimiter",
    },
    {
      tag: [tags.punctuation, tags.separator],
      class: "syntax-common-punctuation",
    },
    {
      tag: [tags.meta, tags.processingInstruction, tags.annotation],
      class: "syntax-common-meta",
    },
    { tag: tags.invalid, class: "syntax-common-meta" },
  ]);
}

export const COMMON_SEMANTIC_HIGHLIGHT_STYLE = semanticCommonHighlightStyle();
