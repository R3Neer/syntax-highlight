import { describe, expect, it } from "vitest";

import {
  commonLanguageByExtension,
  commonLanguageByFence,
  commonLanguages,
} from "../src/common-languages";

describe("common language catalog", () => {
  it("resolves aliases and extensions case-insensitively", () => {
    expect(commonLanguageByFence("CSharp")?.id).toBe("csharp");
    expect(commonLanguageByFence("typescript")?.id).toBe("typescript");
    expect(commonLanguageByFence("BASH")?.id).toBe("bash");
    expect(commonLanguageByFence("sh")?.id).toBe("bash");
    expect(commonLanguageByFence("NU")?.id).toBe("nu");
    expect(commonLanguageByFence("nushell")?.id).toBe("nu");
    expect(commonLanguageByFence("TEXT")?.id).toBe("text");
    expect(commonLanguageByFence("plaintext")?.id).toBe("text");
    expect(commonLanguageByFence("txt")?.id).toBe("text");
    expect(commonLanguageByExtension(".HPP")?.id).toBe("cpp");
    expect(commonLanguageByExtension("py")?.id).toBe("python");
    expect(commonLanguageByExtension(".sh")?.id).toBe("bash");
    expect(commonLanguageByExtension(".nu")?.id).toBe("nu");
    expect(commonLanguageByExtension(".txt")).toBeUndefined();
    expect(commonLanguageByFence("TOML")).toBeUndefined();
    expect(commonLanguageByExtension(".ToMl")).toBeUndefined();
  });

  it("keeps Markdown in the catalog for fences", () => {
    expect(commonLanguageByFence("md")?.id).toBe("markdown");
    expect(commonLanguages().some(({ extensions }) => extensions.includes("md"))).toBe(
      true,
    );
  });

  it("models Text as a parserless Markdown-block language", () => {
    const text = commonLanguageByFence("text");
    expect(text?.name).toBe("Text");
    expect(text?.support).toBeUndefined();
    expect(text?.extensions).toEqual([]);
  });
});
