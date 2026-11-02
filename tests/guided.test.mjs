import test from "node:test";
import assert from "node:assert/strict";
import {
  fresh,
  advance,
  steps,
  valid,
  load,
  KEY,
  ORIGINAL,
  FILE,
} from "../games/the-last-draft/guided-state.mjs";
import { snapshot, tip } from "../games/the-last-draft/git-engine.mjs";
function write(s) {
  if (steps[s.cursor].editable)
    s.draft =
      steps[s.cursor].file === "README.md"
        ? "Accessibility: our reading room has accessible seating and an entrance without steps."
        : s.cursor === 10
          ? s.draft.replace("# The Lantern", "# An evening at The Lantern")
          : s.draft.split("\n").slice(0, 2).join("\n") +
            "\nBring a friend; there is a place for you.";
  return s;
}
test("guided writing reaches reviewed publication through actual repository changes", () => {
  let s = fresh();
  const readback = { getItem: () => JSON.stringify(s) };
  for (let i = 0; i < steps.length; i++) {
    s = advance(write(s));
    assert.equal(s.cursor, i + 1);
    assert.ok(valid(s), `valid state at ${i}`);
    assert.deepEqual(load(readback).state, s);
    if (i === 0) assert.equal(tip(s.repo), null, "staging is not committing");
    if (i === 2) {
      assert.equal(snapshot(s.repo)[FILE], ORIGINAL);
      assert.notEqual(s.repo.working[FILE], ORIGINAL);
    }
    if (i === 4) assert.equal(s.repo.working[FILE], ORIGINAL);
    if (i === 8)
      assert.equal(snapshot(s.repo, s.repo.branches.main)[FILE], ORIGINAL);
    if (i === 13) {
      assert.equal(s.repo.commits[tip(s.repo)].parents.length, 2);
      assert.match(snapshot(s.repo)[FILE], /An evening.*\n.*\nBring a friend/);
    }
    if (i === 15)
      assert.deepEqual(s.repo.server.commits, {}, "connection does not push");
    if (i === 18)
      assert.match(
        s.repo.working[FILE],
        /Friday/,
        "fetch leaves local text alone",
      );
  }
  assert.equal(s.repo.prs[0].status, "merged");
  assert.equal(tip(s.repo), s.repo.server.branches.main);
  assert.equal(snapshot(s.repo, "0000001")[FILE], ORIGINAL);
});
test("empty clicks and wrong-line edits do not advance or mutate repository", () => {
  let s = advance(advance(fresh()));
  const before = structuredClone(s);
  assert.throws(() => advance(s), /Change a few words/);
  assert.deepEqual(s, before);
  while (s.cursor < 6) s = advance(write(s));
  s.draft = "A completely different document";
  const wrong = structuredClone(s);
  assert.throws(() => advance(s), /Keep the other lines/);
  assert.deepEqual(s, wrong);
});
test("undo recovers replaced experiment and preserves staged snapshot", () => {
  let s = fresh();
  while (s.cursor < 4) s = advance(write(s));
  const experiment = s.repo.working[FILE];
  s = advance(s);
  assert.equal(s.repo.working[FILE], ORIGINAL);
  s = s.undo;
  assert.equal(s.repo.working[FILE], experiment);
  assert.equal(snapshot(s.repo)[FILE], ORIGINAL);
  assert.ok(valid(s));
  s = advance(s);
  assert.equal(s.cursor, 5);
});
test("progress loading rejects corruption and preserves separate campaign keys", () => {
  for (const value of [
    "{",
    JSON.stringify({ ...fresh(), cursor: 999 }),
    JSON.stringify({ ...fresh(), repo: {} }),
  ]) {
    const result = load({
      getItem(key) {
        assert.equal(key, KEY);
        return value;
      },
    });
    assert.ok(result.warning);
    assert.deepEqual(result.state, fresh());
  }
  assert.ok(
    load({
      getItem() {
        throw new Error("blocked");
      },
    }).warning,
  );
});
