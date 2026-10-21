/** Deterministic, immutable manuscript version control. No network or browser APIs. */
/** @template T @param {T} value @returns {T} */
export const copy = (value) => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};
export const meaningful = (text) =>
  typeof text === "string" &&
  text.trim().length >= 16 &&
  text.trim().split(/\s+/).length >= 4;
/** @param {import("./types.js").Repository} repo */
export const head = (repo) => repo.commits[repo.branches[repo.current]];
/** @param {import("./types.js").Repository} repo */
export const dirty = (repo) => !same(head(repo).docs, repo.working);
/** @param {import("./types.js").Documents} docs @returns {import("./types.js").Repository} */
export function createRepository(docs, author = "Mara Bell") {
  return {
    commits: {
      r1: {
        id: "r1",
        parents: [],
        docs: copy(docs),
        message: "Collect the first magazine manuscripts",
        author,
      },
    },
    branches: { main: "r1" },
    current: "main",
    working: copy(docs),
    next: 2,
    pending: null,
    reviews: [],
    publication: null,
  };
}
/** @param {import("./types.js").Repository} repo */
function clean(repo) {
  requireThat(
    !repo.pending,
    "Finish or cancel the conflicting combination first.",
  );
  requireThat(
    !dirty(repo),
    "Save your working changes before switching or combining versions.",
  );
}
/** @param {import("./types.js").Repository} repo @param {string} message @param {string} author @param {string[]} [parents] */
function record(
  repo,
  message,
  author,
  parents = [repo.branches[repo.current]],
) {
  requireThat(
    meaningful(message),
    "Write a revision note of at least four words and 16 characters that explains what changed.",
  );
  const id = `r${repo.next++}`;
  repo.commits[id] = {
    id,
    parents,
    docs: copy(repo.working),
    message: message.trim(),
    author,
  };
  repo.branches[repo.current] = id;
  for (const review of repo.reviews) {
    if (review.source === repo.current && review.status !== "merged") {
      review.status = "open";
      review.approvedHead = null;
    }
  }
  return repo;
}
/** @param {import("./types.js").Repository} repo @param {string} doc @param {string} text */
export function edit(repo, doc, text) {
  requireThat(
    Object.hasOwn(repo.working, doc),
    "That manuscript is not in this collection.",
  );
  requireThat(
    typeof text === "string" && text.length <= 20000,
    "Keep each manuscript under 20,000 characters.",
  );
  requireThat(
    !repo.pending,
    "Use the conflict editor to resolve this combination.",
  );
  const next = copy(repo);
  next.working[doc] = text;
  return next;
}
/** @param {import("./types.js").Repository} repo @param {string} message */
export function commit(repo, message, author = "You") {
  requireThat(!repo.pending, "Resolve the conflicting passage before saving.");
  requireThat(dirty(repo), "There are no changed manuscripts to save.");
  return record(copy(repo), message, author);
}
/** @param {import("./types.js").Repository} repo @param {string} [tip] */
export function history(repo, tip = repo.branches[repo.current]) {
  const seen = new Set(/** @type {string[]} */ ([]));
  const visit = (id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    repo.commits[id].parents.forEach(visit);
  };
  visit(tip);
  return [...seen]
    .map((id) => repo.commits[id])
    .sort((a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1)));
}
/** @param {import("./types.js").Repository} repo @param {string} revision @param {string} doc */
export function restore(repo, revision, doc) {
  requireThat(
    repo.commits[revision] && Object.hasOwn(repo.commits[revision].docs, doc),
    "Choose an existing revision and manuscript.",
  );
  return edit(repo, doc, repo.commits[revision].docs[doc]);
}
/** @param {import("./types.js").Repository} repo @param {string} name */
export function branch(repo, name) {
  clean(repo);
  requireThat(
    /^[a-z][a-z0-9-]{1,30}$/.test(name) &&
      !Object.hasOwn(repo.branches, name) &&
      name !== "__proto__",
    "Use a new name: 2–31 lowercase letters, numbers or hyphens, starting with a letter.",
  );
  const next = copy(repo);
  next.branches[name] = next.branches[next.current];
  next.current = name;
  return next;
}
/** @param {import("./types.js").Repository} repo @param {string} name */
export function switchBranch(repo, name) {
  clean(repo);
  requireThat(
    Object.hasOwn(repo.branches, name),
    "Choose an existing alternate version.",
  );
  const next = copy(repo);
  next.current = name;
  next.working = copy(head(next).docs);
  return next;
}
/** @param {import("./types.js").Repository} repo @param {string} a @param {string} b */
export function commonAncestor(repo, a, b) {
  const ancestors = new Set(history(repo, a).map((c) => c.id));
  return history(repo, b).find((c) => ancestors.has(c.id))?.id;
}
/** Line-wise three-way merge. Structural edits conservatively ask for human review. */
/** @param {string} base @param {string} ours @param {string} theirs @returns {{text: string, conflicts: import("./types.js").Conflict[]}} */
export function mergeText(base, ours, theirs) {
  if (ours === theirs || theirs === base) return { text: ours, conflicts: [] };
  if (ours === base) return { text: theirs, conflicts: [] };
  const b = base.split("\n"),
    o = ours.split("\n"),
    t = theirs.split("\n");
  if (b.length !== o.length || b.length !== t.length)
    return { text: ours, conflicts: [{ line: null, base, ours, theirs }] };
  const conflicts = [];
  const lines = b.map((line, i) => {
    if (o[i] === t[i] || t[i] === line) return o[i];
    if (o[i] === line) return t[i];
    conflicts.push({ line: i + 1, base: line, ours: o[i], theirs: t[i] });
    return o[i];
  });
  return { text: lines.join("\n"), conflicts };
}
/** @param {import("./types.js").Documents} base @param {import("./types.js").Documents} ours @param {import("./types.js").Documents} theirs */
function mergeDocuments(base, ours, theirs) {
  const docs = {},
    conflicts = {};
  for (const doc of Object.keys(base)) {
    const merged = mergeText(base[doc], ours[doc], theirs[doc]);
    docs[doc] = merged.text;
    if (merged.conflicts.length) conflicts[doc] = merged.conflicts;
  }
  return { docs, conflicts };
}
/** @param {import("./types.js").Repository} repo @param {string} source @param {string} message @param {string|null} [reviewId] */
function mergeInternal(repo, source, message, reviewId = null) {
  clean(repo);
  requireThat(
    Object.hasOwn(repo.branches, source) && source !== repo.current,
    "Choose a different existing version to combine.",
  );
  const ours = repo.branches[repo.current],
    theirs = repo.branches[source];
  requireThat(
    !history(repo, ours).some((c) => c.id === theirs),
    "These revisions are already included here.",
  );
  const base = commonAncestor(repo, ours, theirs);
  requireThat(base, "These versions have no shared starting point.");
  const result = mergeDocuments(
    repo.commits[base].docs,
    head(repo).docs,
    repo.commits[theirs].docs,
  );
  const next = copy(repo);
  if (Object.keys(result.conflicts).length) {
    next.pending = {
      ...result,
      ours,
      theirs,
      source,
      message,
      reviewId,
      kind: "merge",
    };
    return next;
  }
  next.working = result.docs;
  record(next, message, "You", [ours, theirs]);
  if (reviewId) next.reviews.find((r) => r.id === reviewId).status = "merged";
  return next;
}
/** @param {import("./types.js").Repository} repo @param {string} source */
export function merge(
  repo,
  source,
  message = "Combine the independent editorial revisions",
) {
  requireThat(
    !repo.reviews.some(
      (r) =>
        r.source === source &&
        r.target === repo.current &&
        r.status !== "merged",
    ),
    "This contribution requires approval. Combine it from its review request.",
  );
  return mergeInternal(repo, source, message);
}
/** @param {import("./types.js").Repository} repo @param {import("./types.js").Documents} resolutions @param {string} message */
export function resolve(repo, resolutions, message) {
  requireThat(repo.pending, "There is no conflict to resolve.");
  const next = copy(repo),
    pending = next.pending;
  for (const doc of Object.keys(pending.conflicts)) {
    requireThat(
      typeof resolutions[doc] === "string" &&
        resolutions[doc].trim().length >= 20 &&
        resolutions[doc].length <= 20000 &&
        !/^(<<<<<<<|=======|>>>>>>>)/m.test(resolutions[doc]),
      "Write a complete resolved manuscript without conflict markers.",
    );
    pending.docs[doc] = resolutions[doc];
  }
  next.working = pending.docs;
  next.pending = null;
  record(
    next,
    message,
    "You",
    pending.kind === "revert" ? [pending.ours] : [pending.ours, pending.theirs],
  );
  if (pending.reviewId) {
    const review = next.reviews.find((r) => r.id === pending.reviewId);
    // Resolution changes the reviewed result. Ask for review again rather than treating it as approved.
    review.status = "open";
    review.approvedHead = null;
  }
  return next;
}
/** @param {import("./types.js").Repository} repo */
export function cancelMerge(repo) {
  const next = copy(repo);
  next.pending = null;
  return next;
}
/** @param {import("./types.js").Repository} repo @param {string} revision */
export function revert(
  repo,
  revision,
  message = "Undo the selected editorial change safely",
) {
  clean(repo);
  const selected = repo.commits[revision];
  requireThat(
    selected?.parents.length === 1,
    "Choose a non-merge revision with one parent to undo.",
  );
  requireThat(
    history(repo).some((c) => c.id === revision),
    "That revision is not part of this version’s history.",
  );
  const result = mergeDocuments(
    selected.docs,
    head(repo).docs,
    repo.commits[selected.parents[0]].docs,
  );
  const next = copy(repo);
  if (Object.keys(result.conflicts).length) {
    next.pending = {
      ...result,
      ours: repo.branches[repo.current],
      theirs: revision,
      kind: "revert",
      message,
    };
    return next;
  }
  requireThat(
    !same(next.working, result.docs),
    "This change has already been undone.",
  );
  next.working = result.docs;
  return record(next, message, "You");
}
/** @param {import("./types.js").Repository} repo @param {string} source @param {string} title */
export function openReview(repo, source, title, author = "Kit Vale") {
  requireThat(
    Object.hasOwn(repo.branches, source) && source !== "main",
    "Submit a contribution branch for review.",
  );
  requireThat(
    !repo.reviews.some((r) => r.source === source && r.status !== "merged"),
    "This version already has an open review.",
  );
  const next = copy(repo);
  next.reviews.push({
    id: `pr${next.reviews.length + 1}`,
    source,
    target: "main",
    title,
    author,
    status: "open",
    comments: [],
    approvedHead: null,
  });
  return next;
}
/** @param {import("./types.js").Repository} repo @param {string} id @param {import("./types.js").Decision} decision @param {string} comment */
export function review(repo, id, decision, comment, reviewer = "You") {
  requireThat(
    ["comment", "changes_requested", "approved"].includes(decision),
    "Choose a valid review decision.",
  );
  requireThat(
    meaningful(comment),
    "Leave a useful editorial comment: at least four words and 16 characters.",
  );
  const next = copy(repo),
    request = next.reviews.find((r) => r.id === id);
  requireThat(
    request && request.status !== "merged",
    "Choose an open editorial request.",
  );
  requireThat(
    reviewer !== request.author || decision === "comment",
    "A contributor cannot approve their own work.",
  );
  request.comments.push({
    reviewer,
    decision,
    text: comment.trim(),
    head: next.branches[request.source],
  });
  if (decision !== "comment") {
    request.status = decision;
    request.approvedHead =
      decision === "approved" ? next.branches[request.source] : null;
  }
  return next;
}
/** @param {import("./types.js").Repository} repo @param {string} id */
export function mergeReview(repo, id) {
  const request = repo.reviews.find((r) => r.id === id);
  requireThat(
    request?.status === "approved" &&
      request.approvedHead === repo.branches[request.source],
    "Approve the current contribution before combining it.",
  );
  requireThat(
    repo.current === request.target,
    "Return to main to combine this contribution.",
  );
  const merged = mergeInternal(
    repo,
    request.source,
    `Merge approved contribution: ${request.title}`,
    id,
  );
  requireThat(
    !merged.pending,
    "This proposal conflicts with main. Switch to the contribution branch, combine main into it, resolve the conflict, then inspect and approve the revised proposal.",
  );
  return merged;
}
/** @param {import("./types.js").Repository} repo @param {string} approvedHead */
export function publish(repo, approvedHead) {
  clean(repo);
  requireThat(
    repo.current === "main" && approvedHead === repo.branches.main,
    "The editor-in-chief must approve this exact main revision before publication.",
  );
  requireThat(
    repo.reviews.length > 0 && repo.reviews.every((r) => r.status === "merged"),
    "Finish all contribution reviews before publication.",
  );
  const next = copy(repo);
  next.publication = { revision: approvedHead, docs: copy(head(repo).docs) };
  return next;
}
