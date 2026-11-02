import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { once } from "node:events";
import { playChapter } from "./practical-paths.mjs";
import { SAVE_KEY } from "../games/the-last-draft/git-campaign.mjs";
const root = path.resolve(process.env.STATIC_ROOT || ".");
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let file = path.resolve(
      root,
      "." + decodeURIComponent(url.pathname.replace(/^\/gitbasic(?=\/)/, "")),
    );
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".png": "image/png",
      }[path.extname(file)] || "text/plain",
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
});
const errors = [],
  audits = [];
await mkdir("test-results", { recursive: true });
async function audit(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  audits.push({
    label,
    violations: result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  });
  assert.equal(result.violations.length, 0, JSON.stringify(audits.at(-1)));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    `${label}: no horizontal overflow`,
  );
}
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const click = (name) =>
      page.getByRole("button", { name, exact: true }).click();
    const tab = async (name) => {
      await click(name);
    };
    await page.goto(`${base}/gitbasic/games/the-last-draft/?practice=story`);
    await page
      .getByRole("link", {
        name: "Play the 11-chapter Git & GitHub campaign →",
      })
      .click();
    await page
      .getByRole("button", { name: "Take your seat", exact: true })
      .waitFor();
    await audit(page, `${width} welcome`);
    await page.keyboard.press("Tab");
    assert.ok(
      await page
        .locator(".skip")
        .evaluate((el) => el === document.activeElement),
    );
    await page.screenshot({
      path: `test-results/practical-${width}-welcome.png`,
      fullPage: true,
    });
    await click("Take your seat");
    assert.ok(
      await page
        .getByRole("button", { name: /11 The Saturday edition/ })
        .isDisabled(),
    );
    for (let n = 0; n < 11; n++) {
      await playChapter(n, {
        async run(command) {
          if (n === 0 && command.startsWith("git add")) {
            await click("Stage this file");
            return;
          }
          if (n === 0 && command.startsWith("git commit")) {
            await page
              .getByLabel("Name this snapshot · commit message")
              .fill("Make the invitation warmer");
            await click("Name & save snapshot");
            return;
          }
          await page.getByLabel("Git command", { exact: true }).fill(command);
          await click("Run command");
          const result = await page.evaluate((key) => {
            const p = JSON.parse(localStorage.getItem(key));
            return p.logs[p.chapter].at(-1);
          }, SAVE_KEY);
          assert.equal(
            result.ok,
            true,
            `${width} chapter ${n + 1} ${command}: ${result.output}`,
          );
          if (
            command === "git merge venue" ||
            (command === "git merge origin/main" && n === 10)
          )
            await audit(page, `${width} conflict ${n + 1}`);
        },
        async edit(file, text) {
          await tab("Files & staging");
          const target = page
            .locator('.file-list button[data-action="file"]')
            .filter({ hasText: file });
          if (await target.count()) await target.first().click();
          else {
            await page.getByLabel("New file name").fill(file);
            await click("Add file");
          }
          await page
            .getByLabel(`Working text · ${file}`, { exact: true })
            .fill(text);
          if (n === 0) {
            await page.reload();
            assert.equal(
              await page
                .getByLabel(`Working text · ${file}`, { exact: true })
                .inputValue(),
              text,
            );
          }
        },
        async inspect(id) {
          await tab("History & branches");
          await page
            .locator(`button[data-action="inspect"][data-value="${id}"]`)
            .click();
          await tab("Files & staging");
        },
        async github(action, value) {
          await tab("GitHub & review");
          if (action === "issue") {
            await page.getByLabel("Issue description").fill(value);
            await click("Open issue");
          } else if (action === "comment") {
            await page.getByLabel("Reply to the reviewer").fill(value);
            await click("Post reply");
          } else
            await page
              .locator(`button[data-action="github"][data-value="${action}"]`)
              .click();
          assert.equal(
            await page.locator("#feedback.error").count(),
            0,
            `${width} chapter ${n + 1} GitHub ${action}: ${await page.locator("#feedback").textContent()}`,
          );
        },
      });
      await audit(page, `${width} assignment ${n + 1}`);
      await click("Finish assignment");
      assert.equal(
        await page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)).completed.length,
          SAVE_KEY,
        ),
        n + 1,
      );
      console.log(`${width}px: assignment ${n + 1}/11 complete`);
      if (n === 3) {
        await tab("History & branches");
        await page.screenshot({
          path: `test-results/practical-${width}-history.png`,
          fullPage: true,
        });
      }
      if (n < 10) await click("Continue to next assignment →");
    }
    await page.screenshot({
      path: `test-results/practical-${width}-published.png`,
      fullPage: true,
    });
    await page.reload();
    assert.equal(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)).completed.length,
        SAVE_KEY,
      ),
      11,
    );
    await click("Reference & glossary");
    await audit(page, `${width} reference`);
    await page
      .getByRole("button", { name: "Copy to terminal", exact: true })
      .first()
      .click();
    assert.equal(
      await page.getByLabel("Git command", { exact: true }).inputValue(),
      "git init",
    );
    await click("Open sandbox");
    await page.getByLabel("Git command", { exact: true }).fill("git nonsense");
    await click("Run command");
    assert.ok(await page.locator("#feedback.error").isVisible());
    await page.getByLabel("Git command", { exact: true }).focus();
    await page.keyboard.press("ArrowUp");
    assert.equal(
      await page.getByLabel("Git command", { exact: true }).inputValue(),
      "git nonsense",
    );
    await page
      .getByLabel("Working text · welcome.md", { exact: true })
      .fill("<img src=x onerror=alert(1)>");
    await click("Stage this file");
    await page
      .getByLabel("Name this snapshot · commit message")
      .fill("Keep text safe");
    await click("Name & save snapshot");
    await click("History & branches");
    assert.equal(await page.locator("#workspace-content img").count(), 0);
    page.once("dialog", (d) => d.dismiss());
    await click("Reset sandbox");
    assert.ok(
      (await page.locator("#workspace-content").textContent()).includes("<img"),
    );
    page.once("dialog", (d) => d.accept());
    await click("Reset sandbox");
    await click("Files & staging");
    assert.match(
      await page
        .getByLabel("Working text · welcome.md", { exact: true })
        .inputValue(),
      /Friday/,
    );
    await click("Return to campaign");
    assert.equal(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)).completed.length,
        SAVE_KEY,
      ),
      11,
    );
    page.once("dialog", (d) => d.accept());
    await click("Retry assignment");
    assert.ok(
      await page
        .getByRole("button", { name: "Assignment completed ✓", exact: true })
        .isDisabled(),
    );
    page.once("dialog", (d) => d.accept());
    await click("Restart campaign");
    assert.ok(
      await page
        .getByRole("button", { name: "Take your seat", exact: true })
        .isVisible(),
    );
    await page.evaluate(
      (key) => localStorage.setItem(key, "{bad json"),
      SAVE_KEY,
    );
    await page.reload();
    await click("Take your seat");
    assert.ok(await page.locator(".storage-warning").isVisible());
    await context.close();
  }
  // Storage denial remains playable and is clearly reported.
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new Error("Denied");
    };
  });
  const page = await context.newPage();
  await page.goto(
    `${base}/games/the-last-draft/practical.html?practice=commands`,
  );
  await page
    .getByRole("button", { name: "Take your seat", exact: true })
    .click();
  assert.ok(await page.locator(".storage-warning").isVisible());
  await context.close();
  assert.deepEqual(errors, []);
  console.log(
    "Both complete campaigns, accessibility, responsive layouts, persistence, resets, terminal recall and safe rendering passed.",
  );
} finally {
  await writeFile(
    "test-results/practical-accessibility.json",
    JSON.stringify(audits, null, 2),
  );
  await browser.close();
  server.close();
}
