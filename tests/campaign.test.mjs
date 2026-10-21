import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../games/the-last-draft/campaign.mjs";
import { story, endings, voice } from "../games/the-last-draft/content.mjs";
const act = (s, type, args = {}) => C.transition(s, { type, ...args });
function recovery(s, safety = false) {
  s = act(s, "read");
  if (safety) s = act(s, "branch", { name: "safe-ending" });
  s = act(s, "select", { doc: "story" });
  s = act(s, "inspect", { id: C.mission(s).recovery });
  s = act(s, "restore");
  s = act(s, "commit", {
    message: "Restore Ada’s invitation beneath the blue cup",
  });
  if (safety) {
    s = act(s, "switch", { name: "main" });
    s = act(s, "merge", { source: "safe-ending" });
  }
  return s;
}
function experiment(s) {
  s = act(s, "read");
  s = act(s, "branch", { name: "tragic-ending" });
  s = act(s, "edit", {
    doc: "story",
    text: story(
      "At dawn the house stood empty. Ada put the key in her pocket and watched the river carry the last light away.",
    ),
  });
  s = act(s, "commit", {
    message: "Explore Ada arriving after her brother leaves",
  });
  s = act(s, "switch", { name: "main" });
  return act(s, "compare", { name: "tragic-ending" });
}
function conflict(s, compatible = false) {
  s = act(s, "read");
  s = act(s, "compare", { name: "voice" });
  if (compatible) s = act(s, "merge", { source: "copydesk" });
  s = act(s, "merge", { source: "voice" });
  assert(C.mission(s).repo.pending);
  return act(s, "resolve", {
    resolutions: { poem: voice },
    message: "Preserve the cup’s vigil and the window’s voice",
  });
}
function review(s) {
  s = act(s, "read");
  s = act(s, "openReview");
  s = act(s, "inspectReview");
  s = act(s, "review", {
    decision: "changes_requested",
    comment: "Please correct the date to 14 November",
  });
  s = act(s, "receive");
  s = act(s, "inspectReview");
  s = act(s, "review", {
    decision: "approved",
    comment: "The corrected November date is ready",
  });
  return act(s, "mergeReview");
}
function advance(s) {
  s = act(s, "complete");
  return act(s, "chapter", { chapter: s.chapter + 1 });
}
function finalStart() {
  let s = C.newCampaign();
  s = advance(recovery(s));
  s = advance(experiment(s));
  s = advance(conflict(s, true));
  s = advance(review(s));
  return s;
}
test("all five chapters have a playable state-driven path to publication", () => {
  let s = finalStart();
  s = recovery(s, true);
  s = conflict(s);
  s = review(s);
  const m = C.mission(s);
  assert(m.complication);
  assert.match(m.repo.working.notes, /editorial team/);
  s = act(s, "inspect", { id: m.complication });
  s = act(s, "revert");
  s = act(s, "approveIssue");
  s = act(s, "publish");
  assert.deepEqual(C.objectives(s), [true, true, true, true]);
  s = act(s, "complete");
  assert.deepEqual(s.completed, [0, 1, 2, 3, 4]);
  assert(C.validSave(s));
});
test("chapter completion and selection cannot bypass objectives", () => {
  const s = C.newCampaign();
  assert.throws(() => act(s, "complete"));
  assert.throws(() => act(s, "chapter", { chapter: 4 }));
  assert.throws(() => act(s, "publish"));
});
test("typing the right ending alone does not satisfy recovery evidence", () => {
  let s = C.newCampaign();
  s = act(s, "read");
  s = act(s, "edit", { doc: "story", text: story(endings.original) });
  s = act(s, "commit", { message: "Write the correct ending from memory" });
  assert.equal(C.objectives(s)[2], false);
  assert.throws(() => act(s, "complete"));
});
test("main must remain intact in the alternate-ending mission", () => {
  let s = advance(recovery(C.newCampaign()));
  s = act(s, "read");
  s = act(s, "edit", { doc: "story", text: "Destroy the original on main" });
  s = act(s, "commit", {
    message: "Rewrite the story without an alternate branch",
  });
  assert.equal(C.objectives(s)[1], false);
});
test("conflict resolution accepts either editorial voice but protects compatible lines", () => {
  let s = advance(recovery(C.newCampaign()));
  s = advance(experiment(s));
  s = act(s, "read");
  s = act(s, "compare", { name: "voice" });
  s = act(s, "merge", { source: "copydesk" });
  s = act(s, "merge", { source: "voice" });
  assert.throws(() =>
    act(s, "resolve", {
      resolutions: { poem: "Remove everything" },
      message: "Discard both editors and their manuscripts",
    }),
  );
  s = act(s, "resolve", {
    resolutions: {
      poem: "We counted what the house had kept.\nAn empty cup stood on the kitchen table.\nThe window remembered rain by touch.",
    },
    message: "Keep the clear cup and the revised window",
  });
  assert(C.objectives(s).every(Boolean));
});
test("wrong date and stale inspections cannot be approved", () => {
  let s = finalStart();
  s = act(s, "openReview");
  s = act(s, "inspectReview");
  assert.throws(() =>
    act(s, "review", {
      decision: "approved",
      comment: "Everything seems perfectly fine to me",
    }),
  );
  s = act(s, "review", {
    decision: "changes_requested",
    comment: "Please correct the reading date",
  });
  s = act(s, "receive");
  assert.throws(
    () =>
      act(s, "review", {
        decision: "approved",
        comment: "The new date appears to be correct",
      }),
    /Inspect/,
  );
});
test("late complication blocks publication until safely reverted and approved", () => {
  let s = review(conflict(recovery(finalStart(), true)));
  assert.throws(() => act(s, "approveIssue"));
  s = act(s, "inspect", { id: C.mission(s).complication });
  s = act(s, "revert");
  s = act(s, "approveIssue");
  s = act(s, "edit", {
    doc: "poem",
    text: "An unapproved late change to this poem",
  });
  assert.throws(() => act(s, "publish"));
});
test("progress persists, reload resumes working text, review drafts and mode", () => {
  let s = advance(recovery(C.newCampaign()));
  s = act(s, "mode");
  s = act(s, "edit", {
    doc: "poem",
    text: "An unfinished line at the close of day",
  });
  C.mission(s).reviewDraft = "Consider the date again";
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k),
      setItem: (k, v) => values.set(k, v),
    };
  assert(C.persist(storage, s));
  const loaded = C.loadProgress(storage);
  assert.deepEqual(loaded.state, s);
  assert.equal(loaded.warning, "");
  assert.equal(
    C.mission(loaded.state).repo.working.poem,
    "An unfinished line at the close of day",
  );
});
test("restart resets only selected mission and preserves unlocks", () => {
  let s = finalStart();
  const prior = structuredClone(s.missions[0]);
  s = recovery(s, true);
  s = act(s, "restart");
  assert.deepEqual(s.missions[0], prior);
  assert.deepEqual(C.mission(s), C.seed(4));
  assert.equal(s.unlocked, 4);
});
test("broken JSON, outdated schema, invalid DAG and malformed state fail gracefully", () => {
  for (const raw of [
    "{",
    '{"schema":0}',
    JSON.stringify({ ...C.newCampaign(), missions: { 0: {} } }),
  ]) {
    const loaded = C.loadProgress({ getItem: () => raw });
    assert(loaded.warning);
    assert.deepEqual(loaded.state, C.newCampaign());
  }
  const s = C.newCampaign();
  s.missions[0].repo.commits.r1.parents = ["r3"];
  assert.equal(C.validSave(s), false);
});
test("blocked and exhausted storage are reported without preventing play", () => {
  const storage = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("quota");
    },
  };
  assert(C.loadProgress(storage).warning);
  assert.equal(C.persist(storage, C.newCampaign()), false);
  assert(C.transition(C.newCampaign(), { type: "start" }).started);
});
test("pending conflict resolution drafts survive a reload", () => {
  let s = finalStart();
  s = act(s, "merge", { source: "voice" });
  C.mission(s).resolutionDrafts.poem = "My unfinished synthesis";
  assert(C.validSave(s));
  assert.deepEqual(
    C.loadProgress({ getItem: () => JSON.stringify(s) }).state,
    s,
  );
});

test("corrupt review metadata and inherited revision names are rejected before rendering", () => {
  let s = finalStart();
  s = act(s, "openReview");
  s = act(s, "inspectReview");
  s = act(s, "review", {
    decision: "comment",
    comment: "I will check the date first",
  });
  const broken = structuredClone(s);
  delete C.mission(broken).repo.reviews[0].comments[0].decision;
  assert.equal(C.validSave(broken), false);
  const inherited = structuredClone(s);
  C.mission(inherited).repo.branches.main = "__proto__";
  assert.equal(C.validSave(inherited), false);
  const badParent = structuredClone(s);
  C.mission(badParent).repo.commits.r2.parents = ["__proto__"];
  assert.equal(C.validSave(badParent), false);
  const badApproval = structuredClone(s);
  C.mission(badApproval).finalApproval = "<img src=x onerror=alert(1)>";
  assert.equal(C.validSave(badApproval), false);
});
