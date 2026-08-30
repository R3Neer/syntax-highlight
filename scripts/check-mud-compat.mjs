import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const argument = process.argv.indexOf("--mud-root");
const mudRoot = argument >= 0 ? process.argv[argument + 1] : undefined;
if (!mudRoot) {
  console.error("Usage: node scripts/check-mud-compat.mjs --mud-root <Mud checkout>");
  process.exit(2);
}

const pairs = [
  ["mud-lexico.ebnf", "especificacion/gramatica/mud-lexico.ebnf"],
  ["mud.ebnf", "especificacion/gramatica/mud.ebnf"],
];
let current = true;
for (const [embedded, canonical] of pairs) {
  const [left, right] = await Promise.all([
    readFile(path.resolve("packages/language-mud/grammars", embedded), "utf8"),
    readFile(path.resolve(mudRoot, canonical), "utf8"),
  ]);
  if (left !== right) {
    current = false;
    console.error(`${embedded} differs from ${canonical}`);
  }
}
if (!current) process.exit(1);
console.log("OK: embedded MUD grammars match the canonical checkout.");
