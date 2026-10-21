import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../games/the-last-draft/engine.mjs";
const docs = {
  story: "First line\nSecond line\nLast line",
  poem: "The room keeps a little light.",
  notes: "Invitation to the evening reading.",
};
const fresh = () => E.createRepository(docs);
const change = (r, doc, text) =>
  E.commit(E.edit(r, doc, text), "Improve the manuscript for our readers");
function divergent(
  ours = "Our new first line\nSecond line\nLast line",
  theirs = "First line\nSecond line\nTheir new last line",
) {
  let r = fresh();
  r = E.branch(r, "other");
  r = change(r, "story", theirs);
  r = E.switchBranch(r, "main");
  r = change(r, "story", ours);
  return r;
}
test("edits change working copy without mutating snapshots or input", () => {
  const r = fresh(),
    next = E.edit(r, "story", "A rewritten story");
  assert.equal(r.working.story, docs.story);
  assert.equal(next.working.story, "A rewritten story");
  assert.equal(E.head(next).docs.story, docs.story);
  assert(E.dirty(next));
});
test("commits keep snapshots, descriptions, authors and ancestry", () => {
  const r = change(fresh(), "story", "A new ending written for the magazine");
  assert.equal(E.history(r).length, 2);
  assert.equal(E.head(r).parents[0], "r1");
  assert.equal(r.commits.r1.docs.story, docs.story);
  assert.equal(E.head(r).author, "You");
  assert(!E.dirty(r));
});
test("meaningful revision notes and changed files are required", () => {
  assert.throws(() => E.commit(fresh(), "A useful message with no changes"));
  assert.throws(() => E.commit(E.edit(fresh(), "story", "changed"), "save"));
});
test("restore copies only selected file and preserves all historical records", () => {
  let r = change(fresh(), "story", "New story version");
  r = change(r, "poem", "A new poem for tonight");
  const before = Object.keys(r.commits).length;
  r = E.restore(r, "r1", "story");
  assert.equal(r.working.story, docs.story);
  assert.equal(r.working.poem, "A new poem for tonight");
  assert.equal(Object.keys(r.commits).length, before);
  r = E.commit(r, "Recover the opening story manuscript");
  assert.equal(Object.keys(r.commits).length, before + 1);
});
test("branch commits are independent and switching changes files", () => {
  let r = E.branch(fresh(), "experiment");
  r = change(r, "story", "Alternate story");
  const alternate = E.head(r).id;
  r = E.switchBranch(r, "main");
  assert.equal(r.working.story, docs.story);
  assert.equal(r.branches.experiment, alternate);
  r = E.switchBranch(r, "experiment");
  assert.equal(r.working.story, "Alternate story");
});
test("unsaved work blocks switching, branching and merging", () => {
  let r = E.branch(fresh(), "experiment");
  r = E.edit(r, "story", "Unsaved words");
  for (const action of [
    () => E.switchBranch(r, "main"),
    () => E.branch(r, "another"),
    () => E.merge(r, "main"),
  ])
    assert.throws(action, /Save your working/);
});
test("invalid and duplicate branch names are rejected", () => {
  for (const name of ["main", "__proto__", "../danger", "UPPER", "a"])
    assert.throws(() => E.branch(fresh(), name));
});
test("compatible lines of one manuscript merge while retaining both parents", () => {
  const r = E.merge(divergent(), "other");
  assert.equal(
    r.working.story,
    "Our new first line\nSecond line\nTheir new last line",
  );
  assert.equal(E.head(r).parents.length, 2);
  assert.equal(E.history(r).length, 4);
});
test("compatible edits to separate manuscripts both survive", () => {
  let r = E.branch(fresh(), "other");
  r = change(r, "poem", "A poem with an open door");
  r = E.switchBranch(r, "main");
  r = change(r, "notes", "A reading on Friday evening");
  r = E.merge(r, "other");
  assert.equal(r.working.poem, "A poem with an open door");
  assert.equal(r.working.notes, "A reading on Friday evening");
});
test("overlapping lines create a real conflict, keeping compatible edits", () => {
  let r = divergent(
    "First line\nOur middle\nLast line",
    "First line\nTheir middle\nTheir last line",
  );
  const main = r.branches.main;
  r = E.merge(r, "other");
  assert.equal(r.branches.main, main);
  assert.equal(r.pending.conflicts.story.length, 1);
  assert.equal(r.pending.docs.story, "First line\nOur middle\nTheir last line");
  assert.throws(() => E.commit(r, "Avoid the conflict without resolving"));
});
test("manual resolution produces a two-parent commit", () => {
  let r = E.merge(
    divergent(
      "First line\nOur middle\nLast line",
      "First line\nTheir middle\nLast line",
    ),
    "other",
  );
  r = E.resolve(
    r,
    { story: "First line\nA considered editorial synthesis\nLast line" },
    "Reconcile both editorial voices in the middle",
  );
  assert.equal(r.pending, null);
  assert.equal(E.head(r).parents.length, 2);
  assert.match(r.working.story, /synthesis/);
});
test("cancel conflict preserves both branches", () => {
  const r = divergent("Our entire replacement", "Their entire replacement"),
    merged = E.merge(r, "other"),
    canceled = E.cancelMerge(merged);
  assert.deepEqual(canceled.branches, r.branches);
  assert.deepEqual(canceled.working, r.working);
});
test("structural edits conservatively require human review; identical edits do not", () => {
  assert.equal(E.mergeText("a\nb", "a\nx\nb", "a\nb\ny").conflicts.length, 1);
  assert.deepEqual(E.mergeText("a", "b", "b"), { text: "b", conflicts: [] });
});
test("revert appends history and preserves compatible later changes", () => {
  let r = change(fresh(), "story", "First line\nChanged middle\nLast line");
  const undo = E.head(r).id;
  r = change(r, "poem", "Keep this later poem");
  const count = E.history(r).length;
  r = E.revert(r, undo);
  assert.equal(r.working.story, docs.story);
  assert.equal(r.working.poem, "Keep this later poem");
  assert.equal(E.history(r).length, count + 1);
  assert(r.commits[undo]);
});
test("revert conflicting later edits asks for resolution", () => {
  let r = change(fresh(), "story", "First line\nChanged middle\nLast line");
  const undo = E.head(r).id;
  r = change(r, "story", "First line\nLater middle\nLast line");
  r = E.revert(r, undo);
  assert.equal(r.pending.kind, "revert");
  r = E.resolve(
    r,
    { story: docs.story },
    "Undo the middle while retaining the history",
  );
  assert.equal(E.head(r).parents.length, 1);
});
function contribution() {
  let r = E.branch(fresh(), "submission");
  r = change(r, "notes", "A revised invitation to the evening reading");
  r = E.switchBranch(r, "main");
  return E.openReview(r, "submission", "Our reading invitation");
}
test("pull requests are proposals and approval is enforced", () => {
  const r = contribution();
  assert.equal(r.working.notes, docs.notes);
  assert.throws(() => E.mergeReview(r, "pr1"), /Approve/);
  assert.throws(() => E.merge(r, "submission"), /approval/);
});
test("request changes, revision, approval and merge are actual state transitions", () => {
  let r = contribution();
  r = E.review(
    r,
    "pr1",
    "changes_requested",
    "Please correct the reading date",
  );
  assert.equal(r.reviews[0].status, "changes_requested");
  r = E.switchBranch(r, "submission");
  r = change(r, "notes", "Corrected invitation for the November reading");
  assert.equal(r.reviews[0].status, "open");
  r = E.switchBranch(r, "main");
  r = E.review(r, "pr1", "approved", "The reading date is now correct");
  r = E.mergeReview(r, "pr1");
  assert.equal(r.reviews[0].status, "merged");
  assert.match(r.working.notes, /Corrected/);
});
test("new commits invalidate approval and self-approval is forbidden", () => {
  let r = contribution();
  assert.throws(
    () =>
      E.review(
        r,
        "pr1",
        "approved",
        "This looks completely ready to print",
        "Kit Vale",
      ),
    /own work/,
  );
  r = E.review(r, "pr1", "approved", "The invitation is ready for readers");
  r = E.switchBranch(r, "submission");
  r = change(r, "notes", "Unreviewed changes to this contribution");
  assert.equal(r.reviews[0].status, "open");
  assert.equal(r.reviews[0].approvedHead, null);
});
test("publication pins an approved main revision and does not mutate later", () => {
  let r = contribution();
  assert.throws(() => E.publish(r, r.branches.main), /reviews/);
  r = E.review(
    r,
    "pr1",
    "approved",
    "This invitation is ready for publication",
  );
  r = E.mergeReview(r, "pr1");
  const approval = r.branches.main;
  r = E.publish(r, approval);
  assert.equal(r.publication.revision, approval);
  r = change(r, "notes", "A post-publication draft for another issue");
  assert.notEqual(r.publication.docs.notes, r.working.notes);
  assert.throws(() => E.publish(r, approval), /exact main/);
});

test("conflicting approved proposals require a new review of the resolved source branch", () => {
  let r = contribution();
  r = change(r, "notes", "A different main invitation for our readers");
  r = E.review(
    r,
    "pr1",
    "approved",
    "The contribution reads well as submitted",
  );
  assert.throws(() => E.mergeReview(r, "pr1"), /conflicts with main/);
  r = E.switchBranch(r, "submission");
  r = E.merge(r, "main");
  assert(r.pending);
  r = E.resolve(
    r,
    { notes: "A reconciled invitation including both editors’ changes" },
    "Reconcile main with the proposed invitation",
  );
  assert.equal(r.reviews[0].status, "open");
  r = E.switchBranch(r, "main");
  assert.throws(() => E.mergeReview(r, "pr1"), /Approve/);
  r = E.review(
    r,
    "pr1",
    "approved",
    "The reconciled invitation is ready to publish",
  );
  r = E.mergeReview(r, "pr1");
  assert.equal(r.reviews[0].status, "merged");
  assert.match(r.working.notes, /reconciled/);
});
