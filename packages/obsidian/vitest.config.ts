import { readFile } from "node:fs/promises";

import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "ebnf-as-text",
      enforce: "pre",
      async load(id) {
        if (!id.endsWith(".ebnf")) return undefined;
        return `export default ${JSON.stringify(await readFile(id, "utf8"))};`;
      },
    },
  ],
});
