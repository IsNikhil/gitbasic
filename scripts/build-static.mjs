/** Produce a deployable static site in a fresh temporary directory. No bundler or runtime dependencies. */
import { cp, mkdtemp, readdir, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("..", import.meta.url));
const output = await mkdtemp(path.join(tmpdir(), "git-from-zero-build-"));
for (const entry of [
  "index.html",
  "styles.css",
  "script.js",
  "images",
  "games",
])
  await cp(path.join(root, entry), path.join(output, entry), {
    recursive: true,
  });
async function validate(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await validate(file);
      continue;
    }
    if (!/\.(html|mjs|css)$/.test(file)) continue;
    const source = await readFile(file, "utf8");
    const links = file.endsWith(".html")
      ? [...source.matchAll(/(?:href|src)="([^"#]+)"/g)].map((m) => m[1])
      : file.endsWith(".mjs")
        ? [...source.matchAll(/from ["'](\.\/[^"']+)["']/g)].map((m) => m[1])
        : [];
    for (const link of links) {
      if (/^(https?:|mailto:|data:)/.test(link)) continue;
      const target = path.resolve(path.dirname(file), link.split("#")[0]);
      assert.ok(
        target === output || target.startsWith(output + path.sep),
        `Asset escapes build: ${link}`,
      );
      assert.ok(await stat(target), `Missing asset: ${link}`);
    }
  }
}
await validate(output);
console.log(
  `Production static build and local asset validation passed: ${output}`,
);
