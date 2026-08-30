import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [{
    name: "ebnf-as-text",
    enforce: "pre",
    transform(source, id) {
      return id.endsWith(".ebnf")
        ? { code: `export default ${JSON.stringify(source)};`, map: null }
        : undefined;
    },
  }],
  resolve: {
    alias: {
      "@r3nner/syntax-highlight-core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
      "@r3nner/syntax-highlight-language-mud": fileURLToPath(
        new URL("./packages/language-mud/src/index.ts", import.meta.url),
      ),
      "@r3nner/syntax-highlight-html": fileURLToPath(
        new URL("./packages/html/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["packages/*/tests/**/*.{test,spec}.{ts,mts,js,mjs}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
