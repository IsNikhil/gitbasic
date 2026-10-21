import { manuscripts } from "./content.mjs";
import {
  loadProgress,
  persist,
  transition,
  mission,
  objectives,
  newCampaign,
} from "./campaign.mjs";
import { dirty } from "./engine.mjs";
import { esc, button } from "./view-helpers.mjs";
import {
  editorView,
  historyView,
  versionsView,
  conflictView,
  reviewView,
} from "./workspace.mjs";
import {
  masthead,
  welcome,
  chapterNavigation,
  missionPanel,
  messagePanel,
  learningPanel,
  ending,
  githubModule,
} from "./panels.mjs";
const app = document.querySelector("#app"),
  announcement = document.querySelector("#announcement");
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw new Error("Unavailable");
    },
    setItem() {
      throw new Error("Unavailable");
    },
  };
}
const loaded = loadProgress(storage);
let state = loaded.state,
  warning = loaded.warning,
  tab = "editor",
  screen = state.started ? "desk" : "welcome";
let feedback = "",
  isError = false,
  saveAvailable = true;
const tabs = () => [
  ["editor", "Manuscript"],
  ["history", "Revision history"],
  ...(state.chapter >= 1 ? [["versions", "Alternate versions"]] : []),
  ...(state.chapter >= 3 ? [["review", "Editorial review"]] : []),
];
function save() {
  saveAvailable = persist(storage, state);
  const label = document.querySelector("#save-status");
  if (label)
    label.textContent = saveAvailable
      ? "● Progress saved on this device"
      : "Saving unavailable · keep this tab open";
}
function announce(text) {
  announcement.textContent = "";
  setTimeout(() => {
    announcement.textContent = text;
  }, 20);
}
function render(focusId) {
  const m = mission(state),
    r = m.repo;
  const active =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const focusAction = active?.dataset?.action;
  const focusName = active?.dataset?.name;
  const focusTab = active?.dataset?.tab;
  const activeId = active?.id;
  const focusData = active?.dataset;
  app.innerHTML =
    masthead(state) +
    (warning ? `<p class="storage-warning">${esc(warning)}</p>` : "") +
    (screen === "welcome"
      ? welcome(state)
      : `${chapterNavigation(state)}<div class="toolbar"><span id="save-status">${saveAvailable ? "● Progress saved on this device" : "Saving unavailable · keep this tab open"}</span><div>${state.completed.includes(4) ? button("Take It to GitHub", "github") : ""}${button("Reset campaign", "reset", "", "text-button")}</div></div>${
          screen === "ending"
            ? ending(state)
            : screen === "github"
              ? githubModule()
              : `<div class="editorial-layout" id="desk" tabindex="-1">${missionPanel(state)}<div class="desk-content">${messagePanel(state)}${m.complication ? `<section class="urgent-note"><strong>11:56 PM · A note from production</strong><p>“I replaced Kit’s byline with ‘the editorial team’ during layout. That was my mistake.” — Mara</p><p>Keep the invitation, restore the credit. Inspect “Replace the contributor byline during layout” in history and undo that revision safely.</p>${m.evidence.reverted ? "<strong>✓ Credit restored. The correction has its own revision.</strong>" : ""}</section>` : ""}<div class="workspace"><div class="workspace-top"><label for="document-select">Manuscript collection${state.gitMode ? " · repository" : ""}</label><select id="document-select">${Object.entries(
                  manuscripts,
                )
                  .map(
                    ([id, d]) =>
                      `<option value="${id}" ${id === m.selectedDoc ? "selected" : ""}>${d.title}</option>`,
                  )
                  .join(
                    "",
                  )}</select><span class="branch-badge">↳ ${esc(r.current)}</span></div><nav class="workspace-tabs" aria-label="Editorial tools">${tabs()
                  .map(([id, label]) =>
                    button(
                      label,
                      "tab",
                      `data-tab="${id}" aria-current="${tab === id ? "page" : "false"}"`,
                    ),
                  )
                  .join(
                    "",
                  )}</nav><div id="workspace-content" tabindex="-1">${r.pending ? conflictView(state) : ({ editor: editorView, history: historyView, versions: versionsView, review: reviewView }[tab] || editorView)(state)}</div></div><div id="feedback" class="feedback ${isError ? "error" : "success"}" ${feedback ? "" : "hidden"}>${esc(feedback)}</div>${state.chapter === 4 ? `<section class="publication-panel"><span class="eyebrow">The midnight edition</span><h2>Ready for the presses?</h2><p>Mara approves an exact saved revision. Changes after approval need a fresh sign-off.</p><div class="actions">${button("Request final approval", "approveIssue")}${button("Publish the magazine", "publish", "", "primary")}</div>${m.finalApproval ? `<p>Approval recorded for ${m.finalApproval}${m.finalApproval === r.branches.main && !dirty(r) ? " · current issue" : " · outdated; request approval again"}</p>` : ""}</section>` : ""}${learningPanel(state)}</div></div>`
        }`);
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  else if (activeId && document.getElementById(activeId))
    document.getElementById(activeId).focus({ preventScroll: true });
  else if (focusTab) {
    const tabButton = app.querySelector(`button[data-tab="${focusTab}"]`);
    if (tabButton instanceof HTMLButtonElement)
      tabButton.focus({ preventScroll: true });
  } else if (focusAction) {
    const candidates = [...app.querySelectorAll("button")];
    const replacement = candidates.find(
      (el) =>
        el.dataset.action === focusAction &&
        (!focusName || el.dataset.name === focusName) &&
        ["id", "source", "chapter"].every(
          (key) => !focusData[key] || el.dataset[key] === focusData[key],
        ),
    );
    (replacement || document.getElementById("workspace-content"))?.focus({
      preventScroll: true,
    });
  } else if (active && active !== document.body) {
    document
      .getElementById("workspace-content")
      ?.focus({ preventScroll: true });
  }
}
const messages = {
  read: "Assignment read. Your editorial desk is ready.",
  inspect: "Saved revision opened for comparison.",
  restore:
    "Earlier text restored to your working copy. Save a new revision to record it.",
  commit: "Draft recorded. Your revision note is now part of the history.",
  branch: "Alternate version created. You are now working on that branch.",
  switch: "Version switched. The manuscript now reflects its saved history.",
  compare: "Versions compared. Neither manuscript was changed.",
  merge: "Revisions combined. Both histories are preserved.",
  resolve: "Editorial conflict resolved and saved with both histories.",
  cancelMerge: "Combination canceled. Both saved versions are intact.",
  openReview: "Editorial request opened. Main has not changed.",
  inspectReview: "The current contribution is open for review.",
  review: "Your editorial decision and comment have been recorded.",
  receive: "Kit corrected the date. Inspect the new revision before approving.",
  mergeReview: "Approved contribution merged into main.",
  revert: "The change was undone in a new revision. Earlier history remains.",
  approveIssue: "Mara approved this exact issue revision.",
  publish:
    "The midnight edition is published. All four final objectives are complete.",
  restart: "This chapter has restarted. Other chapters are preserved.",
  hint: "A hint is now available in your assignment panel.",
  mode: "Learning mode changed. Progress is preserved.",
  select: "Manuscript opened.",
};
function dispatch(action) {
  try {
    state = transition(state, action);
    warning = "";
    feedback = messages[action.type] || "";
    isError = false;
    if (mission(state).repo.pending)
      feedback =
        "These editors changed the same passage. Compatible edits are kept; resolve the overlap below.";
    if (action.type === "start") screen = "desk";
    if (action.type === "chapter" || action.type === "restart") {
      tab = "editor";
      screen = "desk";
    }
    if (action.type === "restore") tab = "editor";
    if (action.type === "complete") screen = "ending";
    if (action.type === "resolve") tab = "editor";
    if (action.type === "publish" && objectives(state).every(Boolean)) {
      state = transition(state, { type: "complete" });
      screen = "ending";
    }
    save();
    render(
      ["start", "chapter", "complete", "publish", "restart"].includes(
        action.type,
      )
        ? "desk"
        : undefined,
    );
    announce(
      feedback ||
        (action.type === "complete"
          ? "Chapter completed."
          : "Progress updated."),
    );
    if (["chapter", "complete", "start", "publish"].includes(action.type))
      document.querySelector("#desk")?.scrollIntoView({ block: "start" });
  } catch (error) {
    feedback = error.message;
    isError = true;
    render();
    announce(feedback);
    document.querySelector("#feedback")?.scrollIntoView({ block: "nearest" });
  }
}
app.addEventListener("click", (event) => {
  if (!(event.target instanceof HTMLElement)) return;
  const el = event.target.closest("button[data-action]");
  if (!(el instanceof HTMLButtonElement)) return;
  const type = el.dataset.action;
  if (type === "reset") {
    if (
      window.confirm(
        "Reset the entire campaign? This removes this game’s local progress, including saved manuscript edits. Other site data is untouched.",
      )
    ) {
      state = newCampaign();
      screen = "welcome";
      tab = "editor";
      feedback = "";
      warning = "";
      save();
      render();
      announce("Campaign reset.");
    }
    return;
  }
  if (
    type === "restart" &&
    !window.confirm(
      "Restart this chapter? Its manuscript edits will be replaced by the opening scenario. Other chapters stay saved.",
    )
  )
    return;
  if (type === "tab") {
    tab = el.dataset.tab;
    render();
    return;
  }
  if (type === "github" || type === "desk") {
    screen = type;
    render("desk");
    document.querySelector("#desk")?.scrollIntoView();
    return;
  }
  if (type === "next") {
    dispatch({ type: "chapter", chapter: Math.min(4, state.chapter + 1) });
    return;
  }
  dispatch({
    type,
    id: el.dataset.id,
    name: el.dataset.name,
    source: el.dataset.source,
    chapter: Number(el.dataset.chapter),
  });
});
app.addEventListener("submit", (event) => {
  const form = event.target;
  if (
    !(form instanceof HTMLFormElement) ||
    !(event instanceof SubmitEvent) ||
    !(event.submitter instanceof HTMLButtonElement) ||
    !form.dataset.form
  )
    return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const type = form.dataset.form;
  dispatch(
    type === "resolve"
      ? { type, resolutions: data, message: data.message }
      : type === "review"
        ? { type, comment: data.comment, decision: event.submitter.value }
        : { type, ...data },
  );
});
app.addEventListener("change", (event) => {
  if (
    event.target instanceof HTMLSelectElement &&
    event.target.id === "document-select"
  )
    dispatch({ type: "select", doc: event.target.value });
});
app.addEventListener("input", (event) => {
  const el = event.target,
    m = mission(state);
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement))
    return;
  if (el.id === "manuscript") {
    try {
      state = transition(state, {
        type: "edit",
        doc: m.selectedDoc,
        text: el.value,
      });
    } catch (error) {
      announce(error.message);
      return;
    }
    const pill = app.querySelector(".document-heading .pill");
    if (pill) {
      pill.textContent = dirty(mission(state).repo)
        ? "Unsaved revision"
        : "Draft recorded";
      pill.classList.toggle("changed", dirty(mission(state).repo));
    }
  } else if (el.id === "revision-note") m.noteDraft = el.value;
  else if (el.id === "branch-name") m.branchDraft = el.value;
  else if (el.id === "review-comment") m.reviewDraft = el.value;
  else if (el.id === "resolution-note") m.resolutionNote = el.value;
  else if (el.id.startsWith("resolve-")) m.resolutionDrafts[el.name] = el.value;
  save();
});
render();
