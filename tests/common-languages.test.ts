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
    expect(commonLanguageByExtension(".HPP")?.id).toBe("cpp");
    expect(commonLanguageByExtension("py")?.id).toBe("python");
    expect(commonLanguageByFence("TOML")?.id).toBe("toml");
    expect(commonLanguageByExtension(".ToMl")?.id).toBe("toml");
  });

  it("loads TOML language support", () => {
    expect(() => commonLanguageByExtension("toml")?.support()).not.toThrow();
  });

  it("keeps Markdown in the catalog for fences", () => {
    expect(commonLanguageByFence("md")?.id).toBe("markdown");
    expect(commonLanguages().some(({ extensions }) => extensions.includes("md"))).toBe(
      true,
    );
  });
});
