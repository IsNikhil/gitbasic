import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const files = [
  "script.js",
  ...["games/the-last-draft", "tests", "scripts"].flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith(".mjs"))
      .map((f) => `${dir}/${f}`),
  ),
];
for (const file of files) execFileSync(process.execPath, ["--check", file]);
const page = readFileSync("games/the-last-draft/index.html", "utf8");
assert.match(page, /type="module" src="\.\/app.mjs"/);
assert.match(
  readFileSync("index.html", "utf8"),
  /href="games\/the-last-draft\/"/,
);
assert(
  !readFileSync("index.html", "utf8").includes("game.css"),
  "Game styles must stay isolated",
);
for (const file of files.filter((f) => f.startsWith("games/"))) {
  const code = readFileSync(file, "utf8");
  for (const [, relative] of code.matchAll(/from ['"](\.\/[^'"]+)['"]/g))
    readFileSync(`games/the-last-draft/${relative.slice(2)}`);
}
console.log(
  `Syntax and static route checks passed for ${files.length} JavaScript modules. No compilation is required by this static site.`,
);
