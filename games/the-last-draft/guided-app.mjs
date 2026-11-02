import {
  KEY,
  FILE,
  ORIGINAL,
  steps,
  fresh,
  load,
  advance,
} from "./guided-state.mjs";
import { snapshot, tip } from "./git-engine.mjs";
import { historyGraph } from "./history-graph.mjs";
import { esc, comparison } from "./view-helpers.mjs";
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw new Error();
    },
    setItem() {
      throw new Error();
    },
  };
}
let { state, warning } = load(storage);
let failure = "";
const oldSave = (() => {
  try {
    return (
      storage.getItem("the-last-draft-v1") ||
      storage.getItem("the-last-draft-practical-v1")
    );
  } catch {
    return false;
  }
})();
document
  .querySelectorAll('link[rel="stylesheet"]')
  .forEach((el) => el.remove());
for (const href of ["../../styles.css", "./guided.css"]) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}
document.body.className = "guided";
document.title = "The Last Draft — Git from zero";
document.body.innerHTML = `<a class="skip-link" href="#desk">Skip to your document</a><header class="nav"><nav class="nav-inner" aria-label="Main navigation"><a class="nav-brand" href="../../"><img src="../../images/git.png" width="22" height="22" alt="">Git from zero</a><ul class="nav-links"><li><a href="../../#git-vs-github">Guide</a></li><li><a href="./" aria-current="page">Learning game</a></li></ul></nav></header><main id="desk" tabindex="-1"></main><footer class="guided-footer">The Lantern · A local simulation. No account needed; no real repositories change.</footer>`;
const app = document.querySelector("main");
const button = (label, action, primary = false) =>
  `<button type="button" data-action="${action}" class="${primary ? "btn" : "secondary"}">${esc(label)}</button>`;
function persist() {
  try {
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    warning = "Saving is unavailable. Keep this tab open to retain your work.";
    return false;
  }
}
function history() {
  if (!tip(state.repo)) return "";
  return `<details class="history"><summary>Recorded versions · ${Object.keys(state.repo.commits).length}</summary>${state.cursor >= 6 ? historyGraph(state.repo) : ""}<ol>${Object.values(
    state.repo.commits,
  )
    .reverse()
    .map(
      (c) =>
        `<li><details><summary>${esc(c.message)}${c.id === tip(state.repo) ? " · current" : ""}</summary><p class="small">${esc(c.id)}${c.parents.length ? ` · follows ${esc(c.parents.join(" and "))}` : " · first commit"}</p><pre>${esc(c.files[FILE])}</pre></details></li>`,
    )
    .join("")}</ol></details>`;
}
function render(focus = false) {
  const task = steps[state.cursor],
    r = state.repo;
  const checkpoint = snapshot(r)[FILE];
  const shared = r.server.commits[r.server.branches.main]?.files[FILE];
  const hints = task
    ? [
        "Look at the document and the single blue action below it.",
        task.editable
          ? "Click in the document. Change the requested line, keeping the other lines as they are."
          : task.instruction,
        task.editable
          ? task.file === "README.md"
            ? "Write, for example: Accessibility: the reading room has an accessible entrance and seating. Then choose Save document."
            : state.cursor === 10
              ? "For example, replace the first line with # An evening at The Lantern, then choose Save document."
              : "For example, end with: Bring a friend; there is a place for you. Then choose Save document."
          : `Choose “${task.label}”. ${task.explanation}`,
      ]
    : [];
  app.innerHTML = `<div class="game-heading"><p class="kicker">THE LAST DRAFT</p><h1>${task ? esc(task.title) : "Your invitation has a history."}</h1><p class="lead">${task ? esc(task.instruction) : "You recorded, recovered, branched, combined and shared real simulated versions. You also responded to review and brought the accepted work back to your desk."}</p></div>
  ${warning ? `<p class="notice" role="status">${esc(warning)}</p>` : ""}
  ${state.feedback ? `<div class="feedback" role="status"><strong>What changed</strong><p>${esc(state.feedback)}</p></div>` : ""}
  ${failure ? `<p class="notice" role="alert">${esc(failure)}</p>` : ""}
  <section class="document-card" aria-label="Writing workspace"><div class="document-label"><h2>${task?.file === "README.md" ? "Contributor information" : "The reading invitation"}</h2>${state.cursor >= 6 ? `<span>${esc(r.current)}${state.cursor >= 16 ? " · your computer" : ""}</span>` : ""}</div>
  ${task?.editable ? `<label for="draft">${task.file === "README.md" ? "Add an accessibility note for readers" : "Edit the document"}</label><textarea id="draft" rows="5" maxlength="20000" spellcheck="true">${esc(state.draft)}</textarea><p class="small">Typing is kept on this device. Save document updates the working file; recording a version is a separate action.</p>` : `<pre class="document-text">${esc(r.working[task?.file || FILE] || "")}</pre>`}
  ${task?.compare ? comparison(checkpoint || ORIGINAL, r.working[FILE], "Recorded checkpoint", "Working document") : ""}
  ${task?.branchCompare ? comparison(snapshot(r)[FILE], snapshot(r, r.branches["warm-ending"])[FILE], "Main · new title", "warm-ending · new ending") : ""}
  ${task?.shared ? `<details ${state.cursor >= 17 && state.cursor <= 19 ? "open" : ""}><summary>Shared copy · simulated GitHub</summary><pre>${esc(shared || "Empty — no commits pushed yet.")}</pre><p class="small">${shared === r.working[FILE] ? "The shared main invitation matches your working document." : "The shared main invitation differs from your working document."}</p></details>` : ""}
  ${state.cursor === 2 ? `<div class="checkpoint"><strong>✓ Original invitation recorded</strong><p>${esc(checkpoint)}</p><span class="small">Commit ${esc(tip(r))} · kept locally</span></div>` : ""}
  ${task ? `<div class="action-row">${button(task.label, "act", true)}<span class="small">${state.cursor === 0 ? "Start here. No Git knowledge needed." : state.cursor === 1 ? "Records the selected contents as a commit." : ""}</span></div>` : `<div class="action-row"><a class="btn" href="./practical.html?practice=commands">Continue with advanced practice</a></div>`}
  </section>
  <div class="support">${task ? `<div>${button(state.hint ? "More specific hint" : "Need a hint?", "hint")}${state.hint ? `<p class="hint" role="status">${esc(hints[Math.min(state.hint, 3) - 1])}</p>` : ""}</div>` : ""}<span id="save-status" class="small">${warning ? "Progress may not be saved" : "Progress kept on this device"}</span></div>
  ${history()}
  <details class="options"><summary>Progress & recovery</summary><p>Your place and unfinished writing resume in this browser. Device storage is separate from Git commits.</p><div class="action-row">${state.undo ? button("Undo last action", "undo") : ""}${task?.editable ? button("Reset unsaved text", "reset-text") : ""}${button("Restart this invitation", "restart")}</div>${state.cursor >= 20 ? `<p><a href="./?practice=story">Longer editorial story</a> · <a href="./practical.html?practice=commands">Command practice & sandbox</a></p>` : ""}${oldSave ? `<p>Your previous campaign saves are preserved: <a href="./?practice=story">resume story</a> or <a href="./practical.html?practice=commands">resume command practice</a>.</p>` : ""}</details>`;
  if (focus) {
    const el = app.querySelector("h1");
    el.setAttribute("tabindex", "-1");
    /** @type {HTMLElement} */ (el).focus();
  }
}
app.addEventListener("input", (e) => {
  if (e.target instanceof HTMLTextAreaElement && e.target.id === "draft") {
    state.draft = e.target.value;
    const ok = persist();
    document.querySelector("#save-status").textContent = ok
      ? "Unfinished text kept on this device"
      : warning;
  }
});
app.addEventListener("click", (e) => {
  if (!(e.target instanceof HTMLElement)) return;
  const action = e.target.closest("button")?.dataset.action;
  if (!action) return;
  failure = "";
  try {
    if (action === "act") state = advance(state);
    if (action === "hint") state.hint = Math.min(3, state.hint + 1);
    if (action === "undo" && state.undo) state = structuredClone(state.undo);
    if (action === "reset-text")
      state.draft = state.repo.working[steps[state.cursor]?.file || FILE] || "";
    if (action === "restart") {
      if (
        !window.confirm(
          "Restart this invitation? This clears only the guided invitation’s progress. Other practice saves remain.",
        )
      )
        return;
      state = fresh();
    }
  } catch (err) {
    failure = err.message;
  }
  persist();
  render(action !== "hint");
  if (action === "hint")
    /** @type {HTMLElement} */ (
      app.querySelector('button[data-action="hint"]')
    ).focus();
});
persist();
render();
