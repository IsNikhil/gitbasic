import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { once } from "node:events";
import { steps, KEY } from "../games/the-last-draft/guided-state.mjs";
const server = http.createServer(async (req, res) => {
  try {
    let file = path.join(
      process.cwd(),
      new URL(req.url, "http://localhost").pathname.replace(/^\/gitbasic/, ""),
    );
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".mjs": "text/javascript",
        ".js": "text/javascript",
        ".css": "text/css",
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
await mkdir("test-results/redesign", { recursive: true });
const errors = [];
async function audit(page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
}
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/games/the-last-draft/`);
    await page
      .getByRole("button", { name: "Select this document", exact: true })
      .waitFor();
    await page.screenshot({
      path: `test-results/redesign/after-opening-${name}.png`,
      fullPage: true,
    });
    assert.equal(await page.locator(".history").count(), 0);
    assert.equal(
      await page
        .getByRole("button", { name: /sandbox|branch|push|commit/i })
        .count(),
      0,
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .locator(".skip-link")
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await audit(page);
    await page
      .getByRole("button", { name: "Need a hint?", exact: true })
      .click();
    for (let n = 0; n < 2; n++)
      await page
        .getByRole("button", { name: "More specific hint", exact: true })
        .click();
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.editable) {
        if (i === 2) {
          await page
            .getByRole("button", { name: step.label, exact: true })
            .click();
          await page.getByRole("alert").waitFor();
          assert.equal(
            await page.evaluate(
              (key) => JSON.parse(localStorage.getItem(key)).cursor,
              KEY,
            ),
            2,
          );
        }
        const text = await page.locator("#draft").inputValue();
        const revised =
          step.file === "README.md"
            ? "Accessibility: our reading room has accessible seating and an entrance without steps."
            : i === 10
              ? text.replace("# The Lantern", "# An evening at The Lantern")
              : text.split("\n").slice(0, 2).join("\n") +
                "\nBring a friend; there is a place for you.";
        await page.locator("#draft").fill(revised);
        await page.reload();
        assert.equal(await page.locator("#draft").inputValue(), revised);
      }
      const action = page.getByRole("button", {
        name: step.label,
        exact: true,
      });
      if (i === 0) {
        await action.focus();
        await page.keyboard.press("Enter");
      } else await action.click();
      assert.equal(
        await page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)).cursor,
          KEY,
        ),
        i + 1,
        `step ${i}`,
      );
      if ([1, 4, 8, 13, 16, 19, 26, 36].includes(i)) {
        await audit(page);
        await page.screenshot({
          path: `test-results/redesign/after-step-${i + 1}-${name}.png`,
          fullPage: true,
        });
      }
      if (i === 8) {
        await page.locator(".history > summary").click();
        await page
          .getByRole("region", { name: "Scrollable revision ancestry diagram" })
          .waitFor();
        await audit(page);
        await page.screenshot({
          path: `test-results/redesign/after-history-${name}.png`,
          fullPage: true,
        });
      }
      if (i === 4) {
        await page.getByText("Progress & recovery", { exact: true }).click();
        await page
          .getByRole("button", { name: "Undo last action", exact: true })
          .click();
        assert.equal(
          await page.evaluate(
            (key) => JSON.parse(localStorage.getItem(key)).cursor,
            KEY,
          ),
          4,
        );
        await page
          .getByRole("button", {
            name: "Restore original document",
            exact: true,
          })
          .click();
      }
    }
    await page.reload();
    await page
      .getByRole("heading", { name: "Your invitation has a history." })
      .waitFor();
    await page
      .getByRole("link", { name: "Continue with advanced practice" })
      .click();
    await page
      .getByRole("button", { name: "Take your seat", exact: true })
      .waitFor();
    await page.goto(`${base}/gitbasic/games/the-last-draft/practical.html`);
    await page
      .getByRole("heading", { name: "Your invitation has a history." })
      .waitFor();
    await page.evaluate(() =>
      localStorage.setItem("unrelated-site-progress", "keep"),
    );
    await page.getByText("Progress & recovery", { exact: true }).click();
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Restart this invitation", exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)).cursor,
        KEY,
      ),
      steps.length,
    );
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Restart this invitation", exact: true })
      .click();
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("unrelated-site-progress"),
      ),
      "keep",
    );
    for (const w of [320, 768]) {
      await page.setViewportSize({ width: w, height: 900 });
      await audit(page);
    }
    await page.evaluate((key) => localStorage.setItem(key, "{broken"), KEY);
    await page.reload();
    await page.getByText(/Saved progress could not be read/).waitFor();
    await context.close();
  }
  const context = await browser.newContext({
    colorScheme: "dark",
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  const page = await context.newPage();
  await page.goto(`${base}/games/the-last-draft/`);
  await page
    .getByRole("button", { name: "Select this document", exact: true })
    .click();
  await page.getByText(/Saving is unavailable/).waitFor();
  await audit(page);
  await page.screenshot({
    path: "test-results/redesign/after-dark-mobile.png",
    fullPage: true,
  });
  await context.close();
  assert.deepEqual(errors, []);
  console.log(
    "Guided browser checks passed: all 37 actions on desktop/mobile, accessibility, hints, validation, undo, resume, restart, prefix hosting, navigation, dark mode and blocked/corrupt storage.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
