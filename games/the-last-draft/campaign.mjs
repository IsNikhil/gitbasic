import * as E from "./engine.mjs";
import {
  endings,
  story,
  poem,
  clarity,
  voice,
  note,
  revisedNote,
} from "./content.mjs";
export const SAVE_KEY = "the-last-draft-v1";
export const SCHEMA = 1;
const check = (ok, message) => {
  if (!ok) throw new Error(message);
};
const saveText = (r, doc, text, message, author) =>
  E.commit(E.edit(r, doc, text), message, author);
/** @param {number} chapter @returns {import("./types.js").Mission} */
export function seed(chapter) {
  let repo = E.createRepository({
    story: story(endings.early),
    poem,
    notes: note,
  });
  repo = saveText(
    repo,
    "story",
    story(endings.original),
    "Keep the invitation beneath the blue cup",
    "Elias Finch",
  );
  const recovery = repo.branches.main;
  if (chapter === 0 || chapter === 4)
    repo = saveText(
      repo,
      "story",
      story(endings.wrong),
      "Replace the invitation with a clean departure",
      "Elias Finch",
    );
  if (chapter === 2 || chapter === 4) {
    repo = E.branch(repo, "voice");
    repo = saveText(
      repo,
      "poem",
      voice,
      "Give the cup a watchful voice",
      "June Mercer",
    );
    repo = E.switchBranch(repo, "main");
    if (chapter === 2) {
      repo = E.branch(repo, "copydesk");
      repo = saveText(
        repo,
        "notes",
        note.replace("after sunset", "at 6 PM"),
        "Clarify the time of the reading",
        "Owen Reed",
      );
      repo = E.switchBranch(repo, "main");
    }
    repo = saveText(
      repo,
      "poem",
      clarity,
      "Clarify the location of the cup",
      "Owen Reed",
    );
  }
  if (chapter >= 3) {
    repo = E.branch(repo, "kit-invitation");
    repo = saveText(
      repo,
      "notes",
      revisedNote.replace("14 November", "7 November"),
      "Make the reading invitation more welcoming",
      "Kit Vale",
    );
    repo = E.switchBranch(repo, "main");
  }
  return {
    repo,
    recovery,
    evidence: {},
    hint: 0,
    inspected: null,
    compareBranch: null,
    read: false,
    finalApproval: null,
    complication: null,
    resolutionDrafts: {},
    noteDraft: "",
    reviewDraft: "",
    branchDraft: "",
    selectedDoc: chapter === 2 ? "poem" : chapter === 3 ? "notes" : "story",
  };
}
/** @returns {import("./types.js").Campaign} */
export function newCampaign() {
  return {
    schema: SCHEMA,
    chapter: 0,
    unlocked: 0,
    completed: [],
    missions: { 0: seed(0) },
    gitMode: false,
    started: false,
  };
}
/** @param {import("./types.js").Campaign} state */
export const mission = (state) => state.missions[state.chapter];
/** @param {import("./types.js").Campaign} state */
export function objectives(state) {
  const m = mission(state),
    r = m.repo,
    e = m.evidence,
    docs = r.commits[r.branches.main].docs;
  const recovered = docs.story === story(endings.original);
  const resolved =
    Boolean(e.resolved) &&
    /cup/i.test(docs.poem.split("\n")[1] || "") &&
    /table/i.test(docs.poem.split("\n")[1] || "") &&
    docs.poem.includes("The window remembered rain by touch.");
  const reviewed =
    Boolean(
      e.requested &&
      e.received &&
      e.approved &&
      r.reviews.some((p) => p.status === "merged"),
    ) &&
    docs.notes.includes("14 November") &&
    docs.notes.includes("There will be a chair for either.");
  switch (state.chapter) {
    case 0:
      return [
        m.read,
        Boolean(e.inspected),
        Boolean(e.restored && e.savedRecovery && recovered),
      ];
    case 1:
      return [
        m.read,
        Boolean(e.experiment),
        Boolean(
          e.verifiedOriginal &&
          e.comparedExperiment &&
          r.current === "main" &&
          recovered,
        ),
      ];
    case 2:
      return [
        m.read && Boolean(e.comparedVoice),
        Boolean(e.compatible),
        resolved,
      ];
    case 3:
      return [
        m.read && Boolean(e.inspectedReview),
        Boolean(e.requested && e.received),
        reviewed,
      ];
    case 4:
      return [
        Boolean(e.safety && e.savedRecovery && e.safetyMerged && recovered),
        resolved,
        reviewed,
        Boolean(
          e.reverted &&
          r.publication &&
          r.publication.docs.notes.includes("By Kit Vale"),
        ),
      ];
    default:
      return [];
  }
}
/** @param {import("./types.js").Campaign} state */
export function reputation(state) {
  return [...new Set([...state.completed, state.chapter])].reduce(
    (sum, chapter) => {
      const s = { ...state, chapter };
      return sum + objectives(s).filter(Boolean).length * 10;
    },
    0,
  );
}
/** @param {import("./types.js").Campaign} state @param {import("./types.js").Action} action @returns {import("./types.js").Campaign} */
export function transition(state, action) {
  const next = E.copy(state),
    m = mission(next),
    e = m.evidence;
  let r = m.repo;
  switch (action.type) {
    case "start":
      next.started = true;
      break;
    case "mode":
      check(
        next.unlocked > 0 || next.completed.includes(0),
        "Git mode unlocks after your first recovered draft.",
      );
      next.gitMode = !next.gitMode;
      break;
    case "chapter":
      check(
        Number.isInteger(action.chapter) &&
          action.chapter >= 0 &&
          action.chapter <= next.unlocked,
        "Finish the previous chapter first.",
      );
      next.chapter = action.chapter;
      next.missions[action.chapter] ||= seed(action.chapter);
      return next;
    case "restart":
      next.missions[next.chapter] = seed(next.chapter);
      next.completed = next.completed.filter((c) => c !== next.chapter);
      return next;
    case "read":
      m.read = true;
      break;
    case "hint":
      m.hint = Math.min(3, m.hint + 1);
      break;
    case "select":
      check(Object.hasOwn(r.working, action.doc), "Choose a manuscript.");
      m.selectedDoc = action.doc;
      break;
    case "edit":
      r = E.edit(r, action.doc, action.text);
      break;
    case "inspect":
      check(r.commits[action.id], "Choose a revision.");
      m.inspected = action.id;
      if (action.id === m.recovery && m.selectedDoc === "story")
        e.inspected = true;
      break;
    case "restore":
      check(m.inspected, "Inspect a saved revision first.");
      r = E.restore(r, m.inspected, m.selectedDoc);
      if (m.inspected === m.recovery && m.selectedDoc === "story")
        e.restored = true;
      break;
    case "commit":
      r = E.commit(r, action.message);
      m.noteDraft = "";
      if (e.restored && r.working.story === story(endings.original))
        e.savedRecovery = true;
      if (next.chapter === 1 && e.experimentBranch === r.current) {
        const text = r.working.story,
          initial = story(endings.original).split("\n");
        const lines = text.split("\n");
        check(
          lines[0] === initial[0] &&
            lines[1] === initial[1] &&
            lines.slice(2).join("\n").trim().length >= 35 &&
            text !== story(endings.original),
          "Preserve the first two paragraphs and write a distinct ending of at least 35 characters. Your unsaved text is still here.",
        );
        e.experiment = r.branches[r.current];
      }
      break;
    case "branch":
      r = E.branch(r, action.name);
      m.branchDraft = "";
      if (next.chapter === 1) e.experimentBranch = action.name;
      if (next.chapter === 4) e.safety = action.name;
      break;
    case "switch":
      r = E.switchBranch(r, action.name);
      if (
        action.name === "main" &&
        e.experiment &&
        r.working.story === story(endings.original)
      )
        e.verifiedOriginal = true;
      break;
    case "compare":
      check(
        Object.hasOwn(r.branches, action.name),
        "Choose a version to compare.",
      );
      m.compareBranch = action.name;
      if (action.name === "voice") e.comparedVoice = true;
      if (
        action.name === e.experimentBranch &&
        e.verifiedOriginal &&
        e.experiment &&
        r.current === "main" &&
        r.commits[r.branches[action.name]].docs.story !== r.working.story
      )
        e.comparedExperiment = true;
      break;
    case "merge":
      check(
        r.current === "main" || action.source === "main",
        "Return to main to combine the editorial work.",
      );
      r = E.merge(r, action.source);
      if (r.pending) e.encounteredConflict = true;
      if (action.source === "copydesk" && !r.pending) e.compatible = true;
      if (
        action.source === e.safety &&
        !r.pending &&
        r.working.story === story(endings.original)
      )
        e.safetyMerged = true;
      break;
    case "resolve":
      if (r.pending?.conflicts.poem) {
        const text = action.resolutions.poem || "";
        check(
          /cup/i.test(text.split("\n")[1] || "") &&
            /table/i.test(text.split("\n")[1] || "") &&
            text.includes("The window remembered rain by touch."),
          "Keep the cup on the table and preserve June’s compatible window line. Either editor’s cup sentence, or your own blend, is welcome.",
        );
      }
      r = E.resolve(r, action.resolutions, action.message);
      if (e.encounteredConflict) e.resolved = true;
      m.resolutionDrafts = {};
      break;
    case "cancelMerge":
      r = E.cancelMerge(r);
      m.resolutionDrafts = {};
      break;
    case "openReview":
      r = E.openReview(
        r,
        "kit-invitation",
        "A warmer invitation for our readers",
      );
      break;
    case "inspectReview":
      check(r.reviews.length, "Open the submitted contribution first.");
      m.reviewHead = r.branches["kit-invitation"];
      e.inspectedReview = true;
      break;
    case "review": {
      check(
        m.reviewHead === r.branches["kit-invitation"],
        "Inspect the current proposal before reviewing it.",
      );
      const contribution = r.commits[r.branches["kit-invitation"]].docs.notes;
      if (action.decision === "approved")
        check(
          contribution.includes("14 November") && e.received && e.requested,
          "The reading date is still wrong, or the requested correction has not been reviewed. Ask Kit for changes first.",
        );
      if (action.decision === "changes_requested")
        check(
          /date|november|reading|14|7/i.test(action.comment),
          "Tell Kit what needs attention: the reading date. A specific comment makes revision possible.",
        );
      r = E.review(r, "pr1", action.decision, action.comment);
      m.reviewDraft = "";
      if (action.decision === "changes_requested") e.requested = true;
      if (action.decision === "approved") e.approved = true;
      break;
    }
    case "receive": {
      check(
        r.reviews[0]?.status === "changes_requested",
        "Request a correction before asking Kit for a revision.",
      );
      check(
        !e.received,
        "Kit’s corrected submission is already here. Inspect it and leave a fresh review.",
      );
      const current = r.current;
      r = E.switchBranch(r, "kit-invitation");
      r = saveText(
        r,
        "notes",
        revisedNote,
        "Correct the reading date to November fourteen",
        "Kit Vale",
      );
      r = E.switchBranch(r, current);
      e.received = true;
      break;
    }
    case "mergeReview":
      check(
        m.reviewHead === r.branches["kit-invitation"],
        "Inspect the revised submission before combining.",
      );
      r = E.mergeReview(r, "pr1");
      break;
    case "revert":
      check(m.inspected, "Select a revision to undo.");
      r = E.revert(r, m.inspected);
      if (m.inspected === m.complication && !r.pending) e.reverted = true;
      break;
    case "approveIssue": {
      const ready = objectives({
        ...next,
        missions: { ...next.missions, [next.chapter]: { ...m, repo: r } },
      });
      check(
        next.chapter === 4 &&
          ready.slice(0, 3).every(Boolean) &&
          e.reverted &&
          r.working.notes.includes("By Kit Vale") &&
          r.current === "main" &&
          !E.dirty(r) &&
          !r.pending,
        "Mara needs the recovered ending, resolved poem, reviewed invitation and restored byline, all saved on main.",
      );
      m.finalApproval = r.branches.main;
      break;
    }
    case "publish":
      check(
        next.chapter === 4 && m.finalApproval,
        "Request Mara’s final approval first.",
      );
      r = E.publish(r, m.finalApproval);
      break;
    case "complete":
      check(
        objectives(next).every(Boolean),
        "Finish the editorial objectives before closing this chapter.",
      );
      if (!next.completed.includes(next.chapter))
        next.completed.push(next.chapter);
      next.unlocked = Math.max(next.unlocked, Math.min(4, next.chapter + 1));
      break;
    default:
      throw new Error("Unknown editorial action.");
  }
  // A reproducible late production mistake, announced only after the contribution is integrated.
  if (
    next.chapter === 4 &&
    r.reviews[0]?.status === "merged" &&
    !m.complication
  ) {
    r = saveText(
      r,
      "notes",
      r.working.notes.replace(
        "By Kit Vale, community editor.",
        "By the editorial team.",
      ),
      "Replace the contributor byline during layout",
      "Mara Bell",
    );
    m.complication = r.branches.main;
  }
  m.repo = r;
  return next;
}

/** Validate persisted graphs before rendering or traversing them. Unknown schemas are not migrated silently. */
export function validSave(s) {
  try {
    if (
      s?.schema !== SCHEMA ||
      !Number.isInteger(s.chapter) ||
      !Number.isInteger(s.unlocked) ||
      s.chapter < 0 ||
      s.chapter > s.unlocked ||
      s.unlocked > 4 ||
      !Array.isArray(s.completed) ||
      !s.missions ||
      typeof s.started !== "boolean" ||
      typeof s.gitMode !== "boolean"
    )
      return false;
    if (
      new Set(s.completed).size !== s.completed.length ||
      s.completed.some(
        (c) =>
          !Number.isInteger(c) || c < 0 || c > s.unlocked || !s.missions[c],
      )
    )
      return false;
    if (!s.missions[s.chapter]) return false;
    for (const [chapter, m] of Object.entries(s.missions)) {
      if (
        !/^[0-4]$/.test(chapter) ||
        Number(chapter) > s.unlocked ||
        !m ||
        typeof m.read !== "boolean" ||
        !m.evidence ||
        typeof m.evidence !== "object" ||
        !Number.isInteger(m.hint) ||
        m.hint < 0 ||
        m.hint > 3
      )
        return false;
      const r = m.repo,
        ids = Object.keys(r.commits);
      const revisionExists = (id) =>
        typeof id === "string" &&
        /^r[1-9]\d*$/.test(id) &&
        Object.hasOwn(r.commits, id);
      const docsValid = (docs) =>
        docs &&
        Object.keys(docs).sort().join(",") === "notes,poem,story" &&
        Object.values(docs).every(
          (v) => typeof v === "string" && v.length <= 20000,
        );
      if (
        !ids.length ||
        ids.length > 2000 ||
        !docsValid(r.working) ||
        !revisionExists(r.branches.main) ||
        !Object.hasOwn(r.branches, r.current) ||
        !revisionExists(r.branches[r.current]) ||
        !Number.isSafeInteger(r.next) ||
        !revisionExists(m.recovery) ||
        !Object.hasOwn(r.working, m.selectedDoc) ||
        !Array.isArray(r.reviews)
      )
        return false;
      for (const [id, c] of Object.entries(r.commits)) {
        if (
          !/^r[1-9]\d*$/.test(id) ||
          c.id !== id ||
          !docsValid(c.docs) ||
          typeof c.message !== "string" ||
          typeof c.author !== "string" ||
          !Array.isArray(c.parents) ||
          c.parents.length > 2 ||
          Number(id.slice(1)) >= r.next ||
          c.parents.some(
            (p) =>
              !revisionExists(p) || Number(p.slice(1)) >= Number(id.slice(1)),
          )
        )
          return false;
      }
      if (
        Object.entries(r.branches).some(
          ([name, id]) =>
            !/^[a-z][a-z0-9-]{1,30}$/.test(name) || !revisionExists(id),
        )
      )
        return false;
      if (
        r.reviews.some(
          (p) =>
            !["open", "changes_requested", "approved", "merged"].includes(
              p.status,
            ) ||
            !Object.hasOwn(r.branches, p.source) ||
            !Object.hasOwn(r.branches, p.target) ||
            typeof p.title !== "string" ||
            typeof p.author !== "string" ||
            !Array.isArray(p.comments) ||
            p.comments.some(
              (c) =>
                typeof c.text !== "string" ||
                typeof c.reviewer !== "string" ||
                !["comment", "changes_requested", "approved"].includes(
                  c.decision,
                ) ||
                !revisionExists(c.head),
            ) ||
            (p.status === "approved" &&
              p.approvedHead !== r.branches[p.source]),
        )
      )
        return false;
      if (
        r.pending &&
        (!["merge", "revert"].includes(r.pending.kind) ||
          !docsValid(r.pending.docs) ||
          !revisionExists(r.pending.ours) ||
          !revisionExists(r.pending.theirs) ||
          !r.pending.conflicts ||
          Object.entries(r.pending.conflicts).some(
            ([doc, conflicts]) =>
              !Object.hasOwn(r.working, doc) ||
              !Array.isArray(conflicts) ||
              conflicts.some(
                (c) =>
                  !(
                    c.line === null ||
                    (Number.isSafeInteger(c.line) && c.line > 0)
                  ) ||
                  !["base", "ours", "theirs"].every(
                    (k) => typeof c[k] === "string",
                  ),
              ),
          ))
      )
        return false;
      if (
        r.publication &&
        (!revisionExists(r.publication.revision) ||
          !docsValid(r.publication.docs) ||
          JSON.stringify(r.publication.docs) !==
            JSON.stringify(r.commits[r.publication.revision].docs))
      )
        return false;
      if (m.inspected && !revisionExists(m.inspected)) return false;
      if (
        [m.finalApproval, m.complication, m.reviewHead].some(
          (id) => id && !revisionExists(id),
        )
      )
        return false;
      if (m.compareBranch && !Object.hasOwn(r.branches, m.compareBranch))
        return false;
      if (
        !m.resolutionDrafts ||
        typeof m.noteDraft !== "string" ||
        typeof m.reviewDraft !== "string" ||
        typeof m.branchDraft !== "string"
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
/** @param {import("./types.js").ProgressStorage} storage @returns {{state: import("./types.js").Campaign, warning: string}} */
export function loadProgress(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { state: newCampaign(), warning: "" };
    const state = JSON.parse(raw);
    if (validSave(state)) return { state, warning: "" };
    return {
      state: newCampaign(),
      warning:
        "This save is damaged or from an unsupported version. A fresh campaign is ready; the old save is kept until you choose to begin.",
    };
  } catch {
    return {
      state: newCampaign(),
      warning:
        "Saved progress could not be read. You can still play; saving may be unavailable.",
    };
  }
}
/** @param {import("./types.js").ProgressStorage} storage @param {import("./types.js").Campaign} state */
export function persist(storage, state) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
