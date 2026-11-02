import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { once } from "node:events";
const output = "test-results";
await mkdir(output, { recursive: true });
const root = path.resolve(".");
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const route = url.pathname.replace(/^\/gitbasic(?=\/)/, "");
  let file = path.resolve(root, `.${decodeURIComponent(route)}`);
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        res.writeHead(301, { Location: url.pathname + "/" }).end();
        return;
      }
      file = path.join(file, "index.html");
    }
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
async function axe(page, label) {
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
  assert.equal(
    result.violations.length,
    0,
    `${label}: ${JSON.stringify(audits.at(-1))}`,
  );
}
async function noOverflow(page) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "No horizontal page overflow",
  );
}
async function click(page, name) {
  await page.getByRole("button", { name, exact: true }).click();
}
async function tab(page, name) {
  await click(page, name);
}
async function save(page, note) {
  await page.getByLabel("A note for the next editor").fill(note);
  await click(page, "Save Draft");
}
async function select(page, doc) {
  await page
    .getByLabel("Manuscript collection", { exact: true })
    .selectOption(doc);
}
async function recover(page, safety = false) {
  if (safety) {
    await tab(page, "Alternate versions");
    await page.getByLabel("Name a new possibility").fill("safe-ending");
    await click(page, "Try Another Ending");
  }
  await select(page, "story");
  await tab(page, "Revision history");
  await page
    .getByRole("button", { name: /Keep the invitation beneath the blue cup/ })
    .click();
  await click(page, "Restore this manuscript");
  assert.match(await page.locator("#manuscript").inputValue(), /blue cup/);
  await save(page, "Restore the invitation ending with the blue cup");
  if (safety) {
    await tab(page, "Alternate versions");
    await page
      .locator(".version-cards section")
      .filter({ has: page.getByRole("heading", { name: "main", exact: true }) })
      .getByRole("button", { name: "Switch here" })
      .click();
    await click(page, "Combine safe-ending");
  }
}
async function finish(page, next) {
  await click(page, "Finish this chapter");
  assert(
    await page
      .getByRole("heading", { name: "A little less chaos." })
      .isVisible(),
  );
  await click(page, `Continue to Chapter ${next} →`);
  await click(page, "Read & begin assignment");
}
async function resolveConflict(page, compatible = false) {
  await select(page, "poem");
  await tab(page, "Alternate versions");
  await click(page, "Compare voice");
  if (compatible) await click(page, "Combine copydesk");
  await click(page, "Combine voice");
  assert(
    await page
      .getByRole("heading", { name: "Conflicting editorial changes" })
      .isVisible(),
  );
  const area = page.getByLabel(
    "Resolved manuscript · Inventory of an Empty House",
  );
  await axe(page, `${page.viewportSize().width}px conflict workshop`);
  // Choose Owen's clearer cup and preserve June's independently changed window line.
  assert.match(await area.inputValue(), /window remembered rain/);
  await area.fill(
    "We counted what the house had kept.\nThe cup kept its small, white vigil on the kitchen table.\nThe window remembered rain by touch.",
  );
  await page
    .getByLabel("Explain your editorial decision")
    .fill("Combine clear location with the cup’s vigil");
  await click(page, "Save resolved version");
}
async function review(page) {
  await tab(page, "Editorial review");
  await click(page, "Open editorial request");
  await click(page, "Inspect proposed changes");
  await page
    .getByLabel("Your editorial comment")
    .fill("Please correct the reading date to 14 November");
  await click(page, "Request revisions");
  await click(page, "Receive Kit’s revision");
  await click(page, "Inspect proposed changes");
  await page
    .getByLabel("Your editorial comment")
    .fill("The revised November date is correct and clear");
  await click(page, "Approve Revision");
  await click(page, "Combine approved work");
  assert(
    await page
      .getByText("✓ Approved contribution merged.", { exact: false })
      .isVisible(),
  );
}
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1100 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const label = mobile ? "mobile" : "desktop";
    await page.goto(`${base}/games/the-last-draft/?practice=story`);
    await page.getByRole("button", { name: "Take your seat" }).waitFor();
    await page.screenshot({
      path: `${output}/${label}-welcome.png`,
      fullPage: true,
    });
    await axe(page, `${label} welcome`);
    await noOverflow(page);
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .locator(".skip")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await click(page, "Take your seat");
    assert(
      await page
        .getByRole("button", { name: /05.*The Midnight Edition/ })
        .isDisabled(),
    );
    await click(page, "Read & begin assignment");
    await page.screenshot({
      path: `${output}/${label}-desk.png`,
      fullPage: true,
    });
    await axe(page, `${label} chapter 1`);
    await recover(page);
    await finish(page, 2);
    await tab(page, "Alternate versions");
    await page.getByLabel("Name a new possibility").fill("tragic-ending");
    await click(page, "Try Another Ending");
    await tab(page, "Manuscript");
    const original = await page.locator("#manuscript").inputValue();
    const text =
      original.split("\n").slice(0, 2).join("\n") +
      "\nThe house was empty. Ada kept the key, though there was no longer anyone to let her in.";
    await page.locator("#manuscript").fill(text);
    await page
      .getByLabel("A note for the next editor")
      .fill("Explore a late arrival and an empty house");
    await page.reload();
    assert.equal(await page.locator("#manuscript").inputValue(), text);
    assert.equal(
      await page.locator("#revision-note").inputValue(),
      "Explore a late arrival and an empty house",
    );
    await save(page, "Explore a late arrival and an empty house");
    await tab(page, "Alternate versions");
    await page
      .locator(".version-cards section")
      .filter({ has: page.getByRole("heading", { name: "main", exact: true }) })
      .getByRole("button", { name: "Switch here" })
      .click();
    await click(page, "Compare tragic-ending");
    await axe(page, `${label} branch comparison`);
    await finish(page, 3);
    await resolveConflict(page, true);
    await finish(page, 4);
    await review(page);
    await axe(page, `${label} reviewed contribution`);
    await finish(page, 5);
    await recover(page, true);
    await resolveConflict(page);
    await review(page);
    await tab(page, "Revision history");
    await page
      .getByRole("button", {
        name: /Replace the contributor byline during layout/,
      })
      .click();
    await click(page, "Undo this revision safely");
    await click(page, "Request final approval");
    await click(page, "Publish the magazine");
    assert(
      await page
        .getByRole("heading", { name: "The presses are running." })
        .isVisible(),
    );
    await axe(page, `${label} publication`);
    await noOverflow(page);
    await page.screenshot({
      path: `${output}/${label}-published.png`,
      fullPage: true,
    });
    await click(page, "Take It to GitHub ↗");
    assert(
      await page
        .getByRole("heading", { name: "Take It to GitHub", exact: true })
        .isVisible(),
    );
    await axe(page, `${label} GitHub module`);
    await click(page, "Back to the magazine");
    await click(page, "Story Mode · show Git terms");
    assert(
      await page.getByText("git revert <commit>", { exact: true }).isVisible(),
    );
    await page.reload();
    assert.equal(
      await page
        .getByRole("button", { name: "Git Mode · on" })
        .getAttribute("aria-pressed"),
      "true",
    );
    page.once("dialog", (d) => d.dismiss());
    await click(page, "Reset campaign");
    assert(
      await page.getByRole("button", { name: "Git Mode · on" }).isVisible(),
    );
    page.once("dialog", (d) => d.accept());
    await click(page, "Restart this chapter");
    assert.equal(
      await page.getByRole("progressbar").getAttribute("aria-valuenow"),
      "0",
    );
    await noOverflow(page);
    await context.close();
    console.log(
      `${label}: all five chapters played, published, reloaded and restarted.`,
    );
  }
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  assert.equal(await page.title(), "Git & GitHub, from zero");
  await page.locator("#merge-btn").click();
  await page.locator("#merge-btn").click();
  assert.match(await page.locator("#merge-done").textContent(), /merged/);
  await page.locator('[data-keep="both"]').click();
  assert.match(await page.locator("#conflict-result").textContent(), /both/);
  await page.locator("#gloss-search").fill("no-such-word");
  assert(await page.locator("#gloss-empty").isVisible());
  await page.locator("#hw-1").check();
  await page.reload();
  assert(await page.locator("#hw-1").isChecked());
  const answers = [1, 0, 2, 0, 1];
  for (let i = 0; i < 5; i++)
    await page.locator(".q").nth(i).locator("button").nth(answers[i]).click();
  assert.match(await page.locator("#quiz-score").textContent(), /all 5 right/);
  await page.locator('[data-cmd="2"]').click();
  assert.match(await page.locator("#term-cmd").textContent(), /git add/);
  for (const id of [
    "hero",
    "git-vs-github",
    "repository",
    "commit",
    "branch",
    "pull-request",
    "merge",
    "flow",
    "commands",
    "hello-world",
    "quiz",
    "glossary",
    "keep-going",
  ])
    assert.equal(await page.locator(`#${id}`).count(), 1);
  assert.equal(
    await page
      .locator('script[src*="the-last-draft"],link[href*="game.css"]')
      .count(),
    0,
  );
  await page.locator("#hero").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/homepage-after.png` });
  const existingAudit = await new AxeBuilder({ page }).analyze();
  const addedLinkAudit = await new AxeBuilder({ page })
    .include('a[href="games/the-last-draft/"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.equal(
    addedLinkAudit.violations.length,
    0,
    "The resource link adds no accessibility violations",
  );
  console.log(
    "Existing site audit (baseline issues):",
    existingAudit.violations.map((v) => ({ id: v.id, count: v.nodes.length })),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await noOverflow(page);
  await page.screenshot({ path: `${output}/homepage-mobile-after.png` });
  await page.goto(`${base}/gitbasic/`);
  await page.getByRole("link", { name: /Play The Last Draft/ }).click();
  assert.match(page.url(), /\/gitbasic\/games\/the-last-draft\//);
  await page.goto(`${base}/gitbasic/games/the-last-draft/?practice=story`);
  await page.getByRole("button", { name: "Take your seat" }).waitFor();
  await page.evaluate(() =>
    localStorage.setItem("the-last-draft-v1", "{broken"),
  );
  await page.reload();
  assert(await page.locator(".storage-warning").isVisible());
  await click(page, "Take your seat");
  assert(
    await page
      .getByRole("heading", { name: "Which Draft Is Final?", exact: true })
      .isVisible(),
  );
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 1024 });
    await noOverflow(page);
    await axe(page, `${width}px responsive desk`);
  }
  page.once("dialog", (d) => d.accept());
  await click(page, "Reset campaign");
  assert(
    await page.getByRole("button", { name: "Take your seat" }).isVisible(),
  );
  assert.equal(
    await page.evaluate(() =>
      Boolean(JSON.parse(localStorage.getItem("gitfromzero-hello-world"))["1"]),
    ),
    true,
    "Reset preserves existing site data",
  );
  await context.close();
  const blocked = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await blocked.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled");
    };
  });
  const blockedPage = await blocked.newPage();
  await blockedPage.goto(`${base}/games/the-last-draft/?practice=story`);
  await click(blockedPage, "Take your seat");
  assert.match(
    await blockedPage.locator("#save-status").textContent(),
    /Saving unavailable/,
  );
  await click(blockedPage, "Read & begin assignment");
  await axe(blockedPage, "Dark system preference and blocked storage");
  await blocked.close();
  assert.deepEqual(errors, []);
  console.log(
    `${audits.length} game accessibility audits passed. Existing interactions, nested hosting, corrupt-save recovery and mobile overflow checks passed. No JavaScript errors.`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
