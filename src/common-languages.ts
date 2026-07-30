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
  type LanguageSupport,
} from "@codemirror/language";
import { csharp } from "@replit/codemirror-lang-csharp";
import { tags } from "@lezer/highlight";

export interface CommonLanguage {
  id: string;
  name: string;
  fences: readonly string[];
  extensions: readonly string[];
  support(): LanguageSupport;
}

const COMMON_LANGUAGES: readonly CommonLanguage[] = [
  {
    id: "javascript",
    name: "JavaScript",
    fences: ["js", "javascript", "jsx", "mjs", "cjs"],
    extensions: ["js", "jsx", "mjs", "cjs"],
    support: () => javascript({ jsx: true }),
  },
  {
    id: "typescript",
    name: "TypeScript",
    fences: ["ts", "typescript", "tsx", "mts", "cts"],
    extensions: ["ts", "tsx", "mts", "cts"],
    support: () => javascript({ jsx: true, typescript: true }),
  },
  {
    id: "json",
    name: "JSON",
    fences: ["json", "jsonc"],
    extensions: ["json", "jsonc"],
    support: json,
  },
  {
    id: "html",
    name: "HTML",
    fences: ["html", "htm"],
    extensions: ["html", "htm"],
    support: html,
  },
  {
    id: "css",
    name: "CSS",
    fences: ["css"],
    extensions: ["css"],
    support: css,
  },
  {
    id: "python",
    name: "Python",
    fences: ["py", "python"],
    extensions: ["py"],
    support: python,
  },
  {
    id: "java",
    name: "Java",
    fences: ["java"],
    extensions: ["java"],
    support: java,
  },
  {
    id: "c",
    name: "C",
    fences: ["c"],
    extensions: ["c", "h"],
    support: cpp,
  },
  {
    id: "cpp",
    name: "C++",
    fences: ["cpp", "c++", "cc", "cxx"],
    extensions: ["cpp", "cc", "cxx", "hpp", "hxx"],
    support: cpp,
  },
  {
    id: "csharp",
    name: "C#",
    fences: ["cs", "csharp"],
    extensions: ["cs"],
    support: csharp,
  },
  {
    id: "sql",
    name: "SQL",
    fences: ["sql"],
    extensions: ["sql"],
    support: () => sql({ dialect: PostgreSQL }),
  },
  {
    id: "yaml",
    name: "YAML",
    fences: ["yaml", "yml"],
    extensions: ["yaml", "yml"],
    support: yaml,
  },
  {
    id: "markdown",
    name: "Markdown",
    fences: ["md", "markdown"],
    extensions: ["md", "markdown"],
    support: markdown,
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

export const COMMON_HIGHLIGHT_STYLE = HighlightStyle.define([
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
  {
    tag: [tags.typeName, tags.className, tags.namespace],
    class: "syntax-common-type",
  },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    class: "syntax-common-callable",
  },
  {
    tag: [tags.definition(tags.variableName), tags.definitionKeyword],
    class: "syntax-common-declaration",
  },
  {
    tag: [tags.string, tags.special(tags.string), tags.regexp],
    class: "syntax-common-string",
  },
  { tag: [tags.number, tags.integer, tags.float, tags.bool, tags.null], class: "syntax-common-number" },
  {
    tag: [tags.operator, tags.compareOperator, tags.logicOperator, tags.arithmeticOperator],
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
]);
