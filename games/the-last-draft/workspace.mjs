import { dirty, history } from "./engine.mjs";
import { manuscripts } from "./content.mjs";
import { mission } from "./campaign.mjs";
import { esc, button, comparison } from "./view-helpers.mjs";
import { historyGraph } from "./history-graph.mjs";
/** @param {import("./types.js").Campaign} state */
export function editorView(state) {
  const m = mission(state),
    r = m.repo,
    doc = m.selectedDoc,
    meta = manuscripts[doc];
  return `<div class="document-heading"><div><span class="eyebrow">${meta.kind} · ${meta.author}</span><h2>${meta.title}</h2></div><span class="pill ${dirty(r) ? "changed" : ""}">${dirty(r) ? "Unsaved revision" : "Draft recorded"}</span></div>
    <p class="editor-help" id="editor-help">Edit the manuscript below. Typing updates your working copy; Save Draft records a permanent revision of all changed manuscripts.</p>
    <label class="sr-only" for="manuscript">${meta.title} manuscript</label><textarea id="manuscript" class="manuscript" spellcheck="true" maxlength="20000" aria-describedby="editor-help" ${r.pending ? "disabled" : ""}>${esc(r.working[doc])}</textarea>
    <form data-form="commit" class="save-form"><label for="revision-note">A note for the next editor</label><div class="form-line"><input id="revision-note" name="message" value="${esc(m.noteDraft)}" placeholder="What changed, and why?" minlength="16" maxlength="240" required ${r.pending ? "disabled" : ""}><button class="primary" ${r.pending ? "disabled" : ""}>${state.gitMode ? "Stage all & commit" : "Save Draft"} <span aria-hidden="true">↗</span></button></div><small>At least four words. A useful note makes the right draft easier to find.</small></form>`;
}
/** @param {import("./types.js").Campaign} state */
export function historyView(state) {
  const m = mission(state),
    r = m.repo,
    doc = m.selectedDoc;
  const selected = r.commits[m.inspected];
  return `<div class="panel-heading"><span class="eyebrow">Nothing lost. Everything legible.</span><h2>Revision history</h2><p>Choose a checkpoint to inspect its saved text. Restoring copies this manuscript into your working copy; save it to make a new revision.</p></div>
    <ol class="revision-list">${history(r)
      .map(
        (c) =>
          `<li class="${m.inspected === c.id ? "selected" : ""}">${button(`<span class="revision-id">${c.id}</span><span><strong>${esc(c.message)}</strong><small>${esc(c.author)} · ${c.parents.length === 2 ? "Combined histories" : "Saved revision"}${state.gitMode ? ` · parents: ${c.parents.join(", ") || "none"}` : ""}</small></span>`, "inspect", `data-id="${c.id}" aria-pressed="${m.inspected === c.id}"`)}</li>`,
      )
      .join("")}</ol>
    ${selected ? `<section class="compare-panel" aria-label="Selected revision comparison"><h3>${esc(selected.message)}</h3>${comparison(r.working[doc], selected.docs[doc], "Working copy · now", `${selected.id} · ${selected.author}`)}<div class="actions">${button("Restore this manuscript", "restore", r.pending ? "disabled" : "", "primary")}${state.chapter === 4 ? button("Undo this revision safely", "revert", r.pending ? "disabled" : "") : ""}</div><p class="fine-print">Restore copies the selected file. ${state.chapter === 4 ? "Undo reverses this revision’s changes across files in a new commit; it keeps the old record." : "The saved history stays intact."}</p></section>` : '<p class="empty-state">A manuscript’s past is only a checkpoint away. Choose a revision above.</p>'}`;
}
/** @param {import("./types.js").Campaign} state */
export function versionsView(state) {
  const m = mission(state),
    r = m.repo,
    selected = m.compareBranch,
    doc = m.selectedDoc;
  const branches = Object.entries(r.branches);
  return `<div class="panel-heading"><span class="eyebrow">Room for another possibility</span><h2>Alternate versions${state.gitMode ? " · branches" : ""}</h2><p>Each version has its own latest revision. Save your changes before switching. Comparing does not change either manuscript.</p></div>
    ${historyGraph(r)}<div class="branch-map" aria-label="Branch tips and revision ancestry">${branches.map(([name, id]) => `<div class="branch-row ${name === r.current ? "current" : ""}"><span class="branch-track" aria-hidden="true">${name === "main" ? "● ──" : "└ ── ●"}</span><strong>${esc(name)}</strong><span class="pill">${id}</span><span>${name === r.current ? "You are here" : ""}</span></div>`).join("")}<details><summary>Follow the actual revision connections</summary><ol class="ancestry">${Object.values(
      r.commits,
    )
      .map(
        (c) =>
          `<li><strong>${c.id}</strong> ← ${c.parents.join(" + ") || "starting point"} <span>${esc(c.message)}</span></li>`,
      )
      .join("")}</ol></details></div>
    <form data-form="branch"><label for="branch-name">Name a new possibility</label><div class="form-line"><input id="branch-name" name="name" value="${esc(m.branchDraft)}" placeholder="another-ending" pattern="[a-z][a-z0-9-]{1,30}" maxlength="31" required><button class="primary">${state.gitMode ? "Create & switch branch" : "Try Another Ending"}</button></div></form>
    <div class="version-cards">${branches.map(([name, id]) => `<section><h3>${esc(name)}</h3><p>${esc(r.commits[id].message)}</p><div class="actions">${name !== r.current ? button("Switch here", "switch", `data-name="${esc(name)}"`) : '<span class="current-label">Current version</span>'}${button("Compare", "compare", `data-name="${esc(name)}" aria-label="Compare ${esc(name)}"`)}${name !== r.current ? button("Combine Changes", "merge", `data-source="${esc(name)}" aria-label="Combine ${esc(name)}"`) : ""}</div></section>`).join("")}</div>
    ${selected ? `<section class="compare-panel"><h3>Comparing ${esc(r.current)} with ${esc(selected)}</h3>${comparison(r.working[doc], r.commits[r.branches[selected]].docs[doc], `${r.current} · working copy`, `${selected} · saved draft`)}</section>` : ""}`;
}
/** @param {import("./types.js").Campaign} state */
export function conflictView(state) {
  const m = mission(state),
    p = m.repo.pending;
  if (!p) return "";
  return `<section class="conflict-workshop"><div class="panel-heading"><span class="eyebrow">Two editors. One passage. Your judgment.</span><h2>Conflicting editorial changes</h2><p>Compatible changes have been kept in the proposed result below. The overlapping passages need a human decision. Choose either voice or write your own synthesis.</p></div><form data-form="resolve">${Object.entries(
    p.conflicts,
  )
    .map(
      ([doc, conflicts]) =>
        `<h3>${manuscripts[doc].title}</h3>${conflicts.map((c) => `<div class="conflict-passage"><p class="ancestor"><strong>Shared starting point${c.line ? ` · line ${c.line}` : ""}:</strong> ${esc(c.base)}</p>${comparison(c.ours, c.theirs, "Current version", "Incoming version")}</div>`).join("")}<label for="resolve-${doc}">Resolved manuscript · ${manuscripts[doc].title}</label><textarea id="resolve-${doc}" name="${doc}" class="resolution" maxlength="20000" required>${esc(m.resolutionDrafts[doc] ?? p.docs[doc])}</textarea>`,
    )
    .join(
      "",
    )}<label for="resolution-note">Explain your editorial decision</label><input id="resolution-note" name="message" value="${esc(m.resolutionNote || "")}" placeholder="Preserve the cup’s clarity and the window’s voice" minlength="16" maxlength="240" required><div class="actions"><button class="primary">Save resolved version</button>${button("Cancel combination", "cancelMerge")}</div></form></section>`;
}
/** @param {import("./types.js").Campaign} state */
export function reviewView(state) {
  const m = mission(state),
    r = m.repo,
    request = r.reviews[0],
    inspected = m.reviewHead === r.branches["kit-invitation"];
  if (!request)
    return `<div class="panel-heading"><span class="eyebrow">Shared magazine workspace · simulation</span><h2>One contribution waiting</h2><p>Kit has sent a warmer invitation on <strong>kit-invitation</strong>. Open a review request to discuss bringing those changes into main.</p></div><div class="submission"><span class="avatar">KV</span><div><h3>A warmer invitation for our readers</h3><p>Kit Vale · community editor · kit-invitation → main</p>${button("Open editorial request", "openReview", "", "primary")}</div></div><p class="fine-print">This is a local simulation of a shared workspace, not a connection to GitHub.</p>`;
  return `<div class="panel-heading"><span class="eyebrow">Shared magazine workspace · request #1</span><h2>${esc(request.title)}</h2><p>Kit Vale proposes <strong>kit-invitation → main</strong>. The proposal has not changed main until it is merged.</p><span class="pill">${request.status.replaceAll("_", " ")}</span></div>
    ${button(inspected ? "Inspect proposal again" : "Inspect proposed changes", "inspectReview", "", "primary")}
    ${inspected ? comparison(r.commits[r.branches.main].docs.notes, r.commits[r.branches[request.source]].docs.notes, "Main · current invitation", "Kit’s proposed invitation") : '<p class="empty-state">Open the comparison before making an editorial decision.</p>'}
    <ol class="conversation">${request.comments.map((c) => `<li><strong>${esc(c.reviewer)} · ${c.decision.replaceAll("_", " ")}</strong><p>${esc(c.text)}</p><small>On revision ${c.head}</small></li>`).join("")}${m.evidence.received ? "<li><strong>Kit Vale · revised submission</strong><p>Corrected to 14 November. I was reading last year’s calendar. The ocean is lovely; the filing system needs work.</p></li>" : ""}</ol>
    ${request.status !== "merged" ? `<form data-form="review"><label for="review-comment">Your editorial comment</label><textarea id="review-comment" name="comment" rows="3" placeholder="Name the issue and suggest a useful correction…" minlength="16" maxlength="1200" required>${esc(m.reviewDraft)}</textarea><div class="actions"><button name="decision" value="comment">Leave comment</button><button name="decision" value="changes_requested">Request revisions</button><button name="decision" value="approved" class="primary">Approve Revision</button></div></form><div class="actions">${request.status === "changes_requested" && !m.evidence.received ? button("Receive Kit’s revision", "receive", "", "primary") : ""}${request.status === "approved" ? button("Combine approved work", "mergeReview", "", "primary") : ""}</div>` : '<p class="success-note">✓ Approved contribution merged. Its changes are now in main, with the review conversation preserved.</p>'}
    <p class="fine-print">Our magazine requires review and dismisses approval when new commits arrive. These are project policies, not universal GitHub defaults.</p>`;
}
