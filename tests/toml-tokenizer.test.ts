import { describe, expect, it } from "vitest";

import { tokenizeToml } from "../src/toml-tokenizer";

function categories(source: string): Map<string, string> {
  return new Map(
    tokenizeToml(source).map(({ text, categoryId }) => [text, categoryId]),
  );
}

describe("TOML tokenizer", () => {
  it("classifies tables, keys, scalar values, and comments", () => {
    const result = categories(
      '[export]\nroot = ".."\nfollow_links = false\nmax_chars = 10\nreleased = 2026-08-04T12:30:00Z\n# local',
    );

    expect(result.get("[export]")).toBe("table-header");
    expect(result.get("root")).toBe("bare-key");
    expect(result.get('".."')).toBe("string");
    expect(result.get("false")).toBe("boolean");
    expect(result.get("10")).toBe("number");
    expect(result.get("2026-08-04T12:30:00Z")).toBe("date-time");
    expect(result.get("# local")).toBe("comment");
  });

  it("distinguishes quoted and dotted keys from strings", () => {
    const tokens = tokenizeToml(
      '"display name" = "MUD"\nserver.host = "localhost"\ninline = { enabled = true, port = 8080 }',
    );
    const classified = tokens.map(({ text, categoryId }) => `${text}:${categoryId}`);

    expect(classified).toContain('"display name":quoted-key');
    expect(classified).toContain('"MUD":string');
    expect(classified).toContain("server:bare-key");
    expect(classified).toContain("host:bare-key");
    expect(classified).toContain("enabled:bare-key");
    expect(classified).toContain("port:bare-key");
  });

  it("handles multiline strings without treating embedded hashes as comments", () => {
    const tokens = tokenizeToml('message = """first\n# still text\nlast"""\n# comment');
    const strings = tokens.filter(({ categoryId }) => categoryId === "string");
    const comments = tokens.filter(({ categoryId }) => categoryId === "comment");

    expect(strings).toHaveLength(1);
    expect(strings[0]?.text).toContain("# still text");
    expect(comments.map(({ text }) => text)).toEqual(["# comment"]);
  });
});
