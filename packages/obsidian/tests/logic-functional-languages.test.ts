import { describe, expect, it } from "vitest";

import { commonLanguageByFence } from "../src/common-languages";
import { commonSemanticRanges } from "../src/common-semantic-ranges";

function classesAt(fence: string, source: string, fragment: string): string {
  const language = commonLanguageByFence(fence)!;
  const offset = source.indexOf(fragment);
  return commonSemanticRanges(language, source)
    .filter(({ from, to }) => from <= offset && to >= offset + fragment.length)
    .map(({ classes }) => classes)
    .join(" ");
}

describe("Haskell and Prolog highlighting", () => {
  it("highlights Haskell keywords, numbers and nested comments", () => {
    const source = "module Demo where\nanswer = 42 {- outer {- inner -} done -}\n";
    expect(classesAt("haskell", source, "module")).toContain("syntax-common-keyword");
    expect(classesAt("hs", source, "42")).toContain("syntax-common-number");
    expect(classesAt("haskell", source, "inner")).toContain("syntax-common-comment");
  });

  it("highlights Prolog clauses, variables, quoted atoms and comments", () => {
    const source = "parent('Ana', X) :- mother('Ana', X). % relation\n/* longer\ncomment */\n";
    expect(classesAt("prolog", source, "parent")).toContain("syntax-common-callable");
    expect(classesAt("pl", source, "'Ana'")).toContain("syntax-common-callable");
    expect(classesAt("pl", source, "X")).toContain("syntax-common-variable");
    expect(classesAt("prolog", source, ":-")).toContain("syntax-common-operator");
    expect(classesAt("prolog", source, "relation")).toContain("syntax-common-comment");
    expect(classesAt("prolog", source, "comment")).toContain("syntax-common-comment");
  });
});
