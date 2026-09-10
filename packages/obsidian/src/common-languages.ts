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
    id: "bash",
    name: "Bash",
    fences: ["bash", "sh", "shell"],
    extensions: ["sh", "bash"],
    support: () => shell(),
  },
  {
    id: "nu",
    name: "Nushell",
    fences: ["nu", "nushell"],
    extensions: ["nu"],
    support: nushell,
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

type CommonHighlightHost = "reading" | "editor";

function createCommonHighlightStyle(host: CommonHighlightHost): HighlightStyle {
  const classes = (
    semantic: string,
    reading: string,
    editor: string,
  ): string => `${semantic} ${host === "reading" ? reading : editor}`;

  return HighlightStyle.define([
    {
      tag: tags.comment,
      class: classes("syntax-common-comment", "token comment", "cm-comment"),
    },
    {
      tag: [
        tags.keyword,
        tags.controlKeyword,
        tags.moduleKeyword,
        tags.operatorKeyword,
      ],
      class: classes("syntax-common-keyword", "token keyword", "cm-keyword"),
    },
    {
      tag: tags.definitionKeyword,
      class: classes("syntax-common-declaration", "token keyword", "cm-keyword"),
    },
    {
      tag: [tags.typeName, tags.className, tags.namespace],
      class: classes("syntax-common-type", "token class-name", "cm-variable-2"),
    },
    {
      tag: tags.variableName,
      class: classes("syntax-common-variable", "token variable", "cm-variable"),
    },
    {
      tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
      class: classes("syntax-common-callable", "token function", "cm-def"),
    },
    {
      tag: tags.definition(tags.variableName),
      class: classes("syntax-common-declaration", "token variable", "cm-def"),
    },
    {
      tag: tags.propertyName,
      class: classes("syntax-common-property", "token property", "cm-property"),
    },
    {
      tag: [tags.string, tags.special(tags.string)],
      class: classes("syntax-common-string", "token string", "cm-string"),
    },
    {
      tag: tags.regexp,
      class: classes("syntax-common-regex", "token regex", "cm-string-2"),
    },
    {
      tag: [tags.number, tags.integer, tags.float],
      class: classes("syntax-common-number", "token number", "cm-number"),
    },
    {
      tag: [tags.bool, tags.null, tags.atom],
      class: classes("syntax-common-number", "token boolean", "cm-atom"),
    },
    {
      tag: [
        tags.operator,
        tags.compareOperator,
        tags.logicOperator,
        tags.arithmeticOperator,
      ],
      class: classes("syntax-common-operator", "token operator", "cm-operator"),
    },
    {
      tag: [tags.bracket, tags.paren, tags.squareBracket, tags.brace],
      class: classes("syntax-common-delimiter", "token punctuation", "cm-bracket"),
    },
    {
      tag: [tags.punctuation, tags.separator],
      class: classes("syntax-common-punctuation", "token punctuation", "cm-bracket"),
    },
    {
      tag: [tags.meta, tags.processingInstruction, tags.annotation],
      class: classes("syntax-common-meta", "token tag", "cm-meta"),
    },
  ]);
}

export const COMMON_READING_HIGHLIGHT_STYLE = createCommonHighlightStyle("reading");
export const COMMON_EDITOR_HIGHLIGHT_STYLE = createCommonHighlightStyle("editor");
