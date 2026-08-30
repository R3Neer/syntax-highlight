#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";

import { format, highlight } from "@r3neer/syntax-highlight-core";
import { createMudAdapter } from "@r3neer/syntax-highlight-language-mud";

async function stdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function usage(): never {
  process.stderr.write("Usage: syntax-highlight <highlight|format> [--language mud] [file|-]\n");
  process.exit(2);
}

const args = process.argv.slice(2);
const command = args.shift();
if (command !== "highlight" && command !== "format") usage();
let language = "mud";
const languageIndex = args.indexOf("--language");
if (languageIndex >= 0) {
  language = args[languageIndex + 1] ?? "";
  args.splice(languageIndex, 2);
}
if (language !== "mud") {
  process.stderr.write(`Unsupported language: ${language}\n`);
  process.exit(2);
}
const file = args[0] ?? "-";
const source = file === "-" ? await stdin() : await readFile(file, "utf8");
const adapter = createMudAdapter();
if (command === "highlight") {
  process.stdout.write(JSON.stringify(highlight(source, adapter), null, 2) + "\n");
} else {
  process.stdout.write(format(source, adapter).formatted);
}
