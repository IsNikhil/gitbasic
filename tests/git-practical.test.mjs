import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyRepo,
  seedRepo,
  execute,
  editFile,
  github,
  tip,
  snapshot,
  clean,
  tokenize,
} from "../games/the-last-draft/git-engine.mjs";
import {
  newProgress,
  seedChapter,
  complete,
  objectives,
  validProgress,
  persist,
  loadProgress,
  SAVE_KEY,
} from "../games/the-last-draft/git-campaign.mjs";
import { playChapter } from "./practical-paths.mjs";
const cmd = (r, c) => {
  const result = execute(r, c);
  assert.equal(result.ok, true, `${c}: ${result.output}`);
  return result.repo;
};
const save = (r, p, t, m = "Save editorial change") =>
  cmd(cmd(editFile(r, p, t), `git add ${p}`), `git commit -m "${m}"`);
test("all eleven assignments complete through stateful commands and GitHub actions", async () => {
  let p = newProgress();
  p.started = true;
  for (let n = 0; n < 11; n++) {
    p.chapter = n;
    let r = p.missions[n];
    assert.equal(
      objectives(n, r).every(Boolean),
      false,
      `chapter ${n + 1} starts incomplete`,
    );
    await playChapter(n, {
      run(c) {
        r = cmd(r, c);
      },
      edit(path, text) {
        r = editFile(r, path, text);
      },
      github(a, v) {
        r = github(r, a, v);
      },
      inspect(id) {
        r = cmd(r, `git show ${id}`);
      },
    });
    assert.ok(
      objectives(n, r).every(Boolean),
      `chapter ${n + 1}: ${objectives(n, r)}`,
    );
    p.missions[n] = r;
    p = complete(p);
    assert.ok(validProgress(p), `valid save chapter ${n + 1}`);
    const store = {
      getItem() {
        return this.value;
      },
      setItem(k, v) {
        assert.equal(k, SAVE_KEY);
        this.value = v;
      },
      value: null,
    };
    assert.ok(persist(store, p));
    assert.deepEqual(loadProgress(store).state, p);
  }
  assert.deepEqual(p.completed, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});
test("index snapshots are immutable and selective, including edits made after add", () => {
  let r = cmd(emptyRepo(), "git init");
  r = cmd(r, "git add welcome.md");
  const staged = r.index["welcome.md"];
  r = editFile(r, "welcome.md", "New unstaged prose");
  const before = structuredClone(r);
  r = cmd(r, 'git commit -m "Keep the staged invitation"');
  assert.equal(snapshot(r)["welcome.md"], staged);
  assert.equal(snapshot(r)["README.md"], undefined);
  assert.equal(r.working["welcome.md"], "New unstaged prose");
  assert.deepEqual(before.index, { "welcome.md": staged });
  assert.equal(execute(r, 'git commit -m "Nothing staged"').ok, false);
});
test("parser handles quoting and rejects malformed, unsupported and shell commands atomically", () => {
  assert.deepEqual(tokenize('git commit -m "Mara\'s new reading"'), [
    "git",
    "commit",
    "-m",
    "Mara's new reading",
  ]);
  const r = seedRepo();
  for (const c of [
    'git commit -m "unfinished',
    "rm -rf /",
    "git add missing.md",
    "git push --force",
    "git status nonsense",
    "git status; whoami",
    "git branch __proto__",
    "git switch nowhere",
    "git restore --source=missing welcome.md",
  ]) {
    const before = structuredClone(r),
      result = execute(r, c);
    assert.equal(result.ok, false, c);
    assert.deepEqual(result.repo, before, c);
  }
});
test("branching, fast-forward, diverging merge, deletion and dirty-switch protection", () => {
  let r = seedRepo();
  r = cmd(r, "git branch feature");
  r = cmd(r, "git switch feature");
  r = save(r, "welcome.md", "A new invitation");
  const feature = tip(r);
  r = cmd(r, "git switch main");
  r = cmd(r, "git merge feature");
  assert.equal(tip(r), feature);
  r = cmd(r, "git branch -d feature");
  assert.equal(r.branches.feature, undefined);
  r = editFile(r, "README.md", "Unfinished edits");
  assert.equal(execute(r, "git switch -c experiment").ok, false);
});
test("merge conflict validation, abort and two-parent completion preserve history", () => {
  let r = seedChapter(6),
    before = structuredClone(r);
  r = cmd(r, "git merge venue");
  assert.ok(r.pending);
  assert.equal(execute(r, "git add welcome.md").ok, false);
  assert.equal(execute(r, 'git commit -m "Unresolved"').ok, false);
  const aborted = cmd(r, "git merge --abort");
  assert.deepEqual(aborted.working, before.working);
  assert.equal(tip(aborted), tip(before));
  r = save(
    r,
    "welcome.md",
    "# The Lantern\nReading night: Saturday\nEveryone belongs here.",
  );
  assert.equal(r.pending, null);
  assert.equal(r.commits[tip(r)].parents.length, 2);
  assert.ok(clean(r));
});
test("fetch leaves the working tree alone, push rejects remote divergence, pull integrates", () => {
  let r = seedChapter(5);
  r.protected = false;
  r = github(r, "collaborator");
  const local = tip(r),
    text = r.working["welcome.md"];
  r = cmd(r, "git fetch origin");
  assert.equal(tip(r), local);
  assert.equal(r.working["welcome.md"], text);
  assert.notEqual(r.tracking["origin/main"], local);
  assert.equal(execute(r, "git push origin main").ok, false);
  r = cmd(r, "git pull origin main");
  assert.equal(tip(r), r.server.branches.main);
  assert.match(r.working["welcome.md"], /Saturday/);
});
test("PR requires published revisions, current checks, current approval and synchronized main", () => {
  let r = seedChapter(5);
  assert.equal(execute(r, "git push origin main").ok, false);
  r = cmd(r, "git switch -c feature");
  assert.throws(() => github(r, "open"));
  r = save(
    r,
    "welcome.md",
    "# The Lantern\nReading night: Saturday\nEveryone belongs here.",
  );
  r = cmd(r, "git push -u origin feature");
  r = github(r, "open");
  assert.throws(() => github(r, "merge"));
  r = github(r, "checks");
  r = github(r, "approve");
  r = save(r, "README.md", r.working["README.md"] + "\nAnother useful note.");
  r = cmd(r, "git push");
  assert.throws(() => github(r, "merge"), /latest pushed/);
  r = github(r, "checks");
  r = github(r, "approve");
  r = github(r, "collaborator");
  assert.throws(() => github(r, "merge"), /main changed/);
});
test("reset retains recoverable commits, revert preserves shared history, restore unstages", () => {
  let r = seedChapter(7);
  r = cmd(r, "git revert HEAD");
  const fixed = tip(r);
  assert.match(snapshot(r)["README.md"], /Mara and you/);
  r = cmd(r, "git reset --hard HEAD~1");
  assert.ok(r.commits[fixed]);
  assert.match(r.working["README.md"], /anonymous/);
  r = cmd(r, `git reset --hard ${fixed}`);
  assert.ok(clean(r));
  r = editFile(r, "README.md", "new");
  r = cmd(r, "git add README.md");
  r = cmd(r, "git restore --staged README.md");
  assert.equal(r.working["README.md"], "new");
  assert.notEqual(r.index["README.md"], "new");
});
test("private rebase changes ancestry; shared rebase is rejected without mutation", () => {
  let r = seedRepo();
  r = cmd(r, "git switch -c feature");
  r = save(r, "README.md", "Private contribution");
  const old = tip(r);
  r = cmd(r, "git switch main");
  r = save(r, "welcome.md", "Public invitation");
  const base = tip(r);
  r = cmd(r, "git switch feature");
  r = cmd(r, "git rebase main");
  assert.notEqual(tip(r), old);
  assert.equal(r.commits[tip(r)].parents[0], base);
  assert.equal(snapshot(r)["README.md"], "Private contribution");
  assert.equal(snapshot(r)["welcome.md"], "Public invitation");
  r = cmd(r, "git remote add origin lantern");
  r = cmd(r, "git push -u origin feature");
  const before = structuredClone(r);
  const result = execute(r, "git rebase main");
  assert.equal(result.ok, false);
  assert.deepEqual(result.repo, before);
});
test("tracked deletions commit; ignored files stay out of snapshots; stash restores text", () => {
  let r = seedRepo();
  r = editFile(r, ".gitignore", "scratch.tmp");
  r = editFile(r, "scratch.tmp", "private");
  r = cmd(r, "git add .");
  r = cmd(r, 'git commit -m "Ignore scratch text"');
  assert.equal(snapshot(r)["scratch.tmp"], undefined);
  assert.equal(execute(r, "git add scratch.tmp").ok, false);
  r = editFile(r, "README.md", "Working edits");
  r = cmd(r, "git stash");
  assert.ok(clean(r));
  r = cmd(r, "git stash pop");
  assert.equal(r.working["README.md"], "Working edits");
  delete r.working["welcome.md"];
  r = cmd(r, "git add welcome.md");
  r = cmd(r, 'git commit -m "Remove invitation"');
  assert.equal(snapshot(r)["welcome.md"], undefined);
});
test("save validation rejects bad structure, cycles, missing references, invalid progress and quota failures", () => {
  const p = newProgress();
  assert.ok(validProgress(p));
  for (const mutate of [
    (p) => (p.version = 99),
    (p) => (p.completed = [10]),
    (p) => (p.chapter = 9),
    (p) => (p.missions[0].commits["0000001"].parents = ["0000001"]),
    (p) => (p.missions[0].current = "missing"),
    (p) => (p.missions[0].working = null),
    (p) => (p.missions[0].prs = [{}]),
    (p) => (p.logs = { 0: [{}] }),
  ]) {
    const bad = structuredClone(p);
    mutate(bad);
    assert.equal(validProgress(bad), false);
    assert.ok(loadProgress({ getItem: () => JSON.stringify(bad) }).warning);
  }
  assert.ok(loadProgress({ getItem: () => "{broken" }).warning);
  assert.equal(
    persist(
      {
        setItem() {
          throw new Error("Quota");
        },
      },
      p,
    ),
    false,
  );
  assert.throws(() => complete(p), /objectives/);
});
test("pending conflict drafts and sandbox checkpoints survive validated storage", () => {
  const p = newProgress();
  p.completed = [0, 1, 2, 3, 4, 5];
  p.chapter = 6;
  p.missions[6] = cmd(seedChapter(6), "git merge venue");
  p.missions[6] = editFile(
    p.missions[6],
    "welcome.md",
    "A draft resolution still being written",
  );
  p.mode = "sandbox";
  p.sandbox = editFile(p.sandbox, "README.md", "An independent experiment");
  assert.ok(validProgress(p));
  const loaded = loadProgress({ getItem: () => JSON.stringify(p) });
  assert.deepEqual(loaded.state, p);
});
test("creating a remote cannot overwrite different local commits with colliding IDs", () => {
  let r = cmd(emptyRepo(), "git init");
  r = save(r, "welcome.md", "An independently written publication");
  const first = structuredClone(r.commits[tip(r)]);
  r = github(r, "create");
  r = cmd(r, "git remote add origin lantern");
  r = cmd(r, "git fetch origin");
  assert.deepEqual(r.commits[first.id], first);
  r = cmd(r, "git push -u origin main");
  assert.deepEqual(r.server.commits[first.id], first);
});
test("checkout refuses to overwrite an untracked file, and reset preserves unrelated files", () => {
  let r = seedRepo();
  r = cmd(r, "git switch -c feature");
  r = save(r, "notes.md", "Tracked on feature");
  r = cmd(r, "git switch main");
  r = editFile(r, "notes.md", "Untracked on main");
  const before = structuredClone(r);
  const result = execute(r, "git switch feature");
  assert.equal(result.ok, false);
  assert.deepEqual(result.repo, before);
  r = cmd(r, "git reset --hard HEAD");
  assert.equal(r.working["notes.md"], "Untracked on main");
});
test("fork and upstream have independent remote references and permissions", () => {
  let r = github(seedChapter(9), "fork");
  const forkTip = r.server.branches.main;
  r = github(r, "collaborator");
  assert.equal(r.server.branches.main, forkTip);
  assert.notEqual(r.upstreamServer.branches.main, forkTip);
  r = cmd(r, "git remote add upstream lantern");
  r = cmd(r, "git fetch upstream");
  assert.equal(r.tracking["upstream/main"], r.upstreamServer.branches.main);
  assert.equal(r.server.branches.main, forkTip);
  r = cmd(r, "git switch -c feature");
  r = save(r, "README.md", "A contribution for our fork");
  assert.equal(execute(r, "git push upstream feature").ok, false);
  r = cmd(r, "git push -u origin feature");
  assert.equal(r.server.branches.feature, tip(r));
  assert.equal(r.upstreamServer.branches.feature, undefined);
});
test("a repeated merge uses the nearest common ancestor across both parents", () => {
  let r = seedRepo();
  r = cmd(r, "git switch -c source");
  r = save(r, "welcome.md", "Saturday");
  r = cmd(r, "git switch main");
  r = save(r, "README.md", "Independent editorial note");
  r = cmd(r, "git merge source");
  r = cmd(r, "git switch source");
  r = save(r, "welcome.md", "Sunday");
  r = cmd(r, "git switch main");
  r = cmd(r, "git merge source");
  assert.equal(r.pending, null);
  assert.equal(snapshot(r)["welcome.md"], "Sunday");
  assert.equal(snapshot(r)["README.md"], "Independent editorial note");
});
test("patches preserve unrelated untracked prose and private rebase preserves deletions", () => {
  let r = seedChapter(7);
  r = editFile(r, "notes.md", "Untracked notes");
  r = cmd(r, "git revert HEAD");
  assert.equal(r.working["notes.md"], "Untracked notes");
  r = cmd(r, "git switch -c private");
  delete r.working["welcome.md"];
  r = cmd(r, "git add welcome.md");
  r = cmd(r, 'git commit -m "Remove the old invitation"');
  r = cmd(r, "git rebase main");
  assert.equal(r.working["welcome.md"], undefined);
  assert.equal(r.working["notes.md"], "Untracked notes");
});
