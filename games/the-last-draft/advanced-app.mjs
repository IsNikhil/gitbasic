import {
  execute,
  editFile,
  github,
  changes,
  snapshot,
  tip,
} from "./git-engine.mjs";
import {
  chapters,
  reference,
  glossary,
  loadProgress,
  persist,
  newProgress,
  seedChapter,
  complete,
  objectives,
} from "./git-campaign.mjs";
import { esc, comparison } from "./view-helpers.mjs";
import { historyGraph } from "./history-graph.mjs";

const app = document.querySelector("#app");
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw new Error("Storage unavailable");
    },
    setItem() {
      throw new Error("Storage unavailable");
    },
  };
}
const loaded = loadProgress(storage);
let state = loaded.state,
  warning = loaded.warning,
  tab = "files",
  message = "",
  error = false,
  selectedCommit = "",
  commandIndex = 0,
  commandDraft = "";
const repo = () =>
  state.mode === "sandbox" ? state.sandbox : state.missions[state.chapter];
const key = () =>
  state.mode === "sandbox" ? "sandbox" : String(state.chapter);
const logs = () => state.logs[key()] || [];
const put = (r) => {
  if (state.mode === "sandbox") state.sandbox = r;
  else state.missions[state.chapter] = r;
};
const button = (text, action, value = "", extra = "") =>
  `<button type="button" data-action="${action}" data-value="${esc(value)}" ${extra}>${esc(text)}</button>`;
function save() {
  const ok = persist(storage, state);
  const el = document.querySelector("#save-status");
  if (el)
    el.textContent = ok
      ? "● Saved on this device"
      : "Saving unavailable · keep this tab open";
  if (!ok)
    warning =
      "Browser storage is unavailable or full. You can keep playing in this tab, but changes will not survive closing it.";
}
function report(text, failed = false) {
  message = text;
  error = failed;
  const el = document.querySelector("#announcement");
  el.textContent = "";
  setTimeout(() => {
    el.textContent = text;
  }, 10);
}
function run(input) {
  const result = execute(repo(), input);
  put(result.repo);
  state.logs[key()] = [
    ...logs(),
    { input, output: result.output, ok: result.ok },
  ].slice(-80);
  report(result.output, !result.ok);
  commandIndex = logs().length;
  save();
  render("command");
}
function header() {
  return `<div class="masthead"><div class="masthead-top"><span>A STUDENT PUBLICATION · EST. THIS MORNING</span><span>LEARN BY MAKING SOMETHING TOGETHER</span></div><div class="masthead-title"><h1>The Last Draft<span>.</span></h1><p>Every story has a history.</p></div><div class="masthead-bottom"><span>The practical campaign</span><span>Eleven assignments. One shared publication.</span></div></div>`;
}
function welcome() {
  return `<section class="welcome" id="desk" tabindex="-1"><div><span class="eyebrow">YOUR FIRST DAY AT THE LANTERN</span><h2>You know how to write.<br>Let’s learn how to work together.</h2><p>Someone changed the reading date. Someone else lost the last paragraph. And every attachment is called “FINAL.”</p><p>Take a seat at our student publication. Save drafts, try alternate versions and work with an editor—then learn the real Git commands behind it all.</p><div class="actions">${button("Take your seat", "start", "", 'class="primary large"')}</div><p class="editor-help">No coding, terminal experience, account or installation needed. Start with visual controls. Learn at your own pace; your progress saves here.</p></div><aside class="welcome-letter"><span class="eyebrow">A NOTE FROM YOUR EDITOR</span><h3>Dear new contributor,</h3><p>We don’t need perfect first drafts. We need a way to make better ones without losing each other’s work.</p><p>I’ll leave you an assignment at each desk. You can experiment, ask for a hint, or start the assignment again. Nothing here changes a real repository.</p><p class="signature">— Mara, editor of The Lantern</p><hr><p>Begin with snapshots. Finish by publishing a reviewed contribution, resolving a disagreement and passing our publication checks.</p></aside></section><div class="welcome-skills"><span>01 · Preserve your words</span><span>02 · Work in parallel</span><span>03 · Publish together</span></div>`;
}
function filesView(r) {
  const paths = [
    ...new Set([
      ...Object.keys(r.working),
      ...Object.keys(r.index),
      ...Object.keys(snapshot(r)),
    ]),
  ];
  if (!paths.includes(state.selected))
    state.selected = paths[0] || "welcome.md";
  const path = state.selected,
    conflict = r.pending?.conflicts[path];
  return `<div class="file-layout"><aside class="file-list" aria-label="Repository files">${paths.map((p) => button(`${p}${r.working[p] !== r.index[p] ? " · edited" : r.index[p] !== snapshot(r)[p] ? " · staged" : ""}`, "file", p, `aria-pressed="${p === path}"`)).join("")}<form id="new-file"><label for="filename">New file name</label><input id="filename" name="filename" placeholder=".gitignore" maxlength="70" required><button>Add file</button></form></aside><section class="editor-pane"><div class="document-heading"><h2>${esc(path)}</h2><span class="pill ${r.working[path] !== r.index[path] ? "changed" : ""}">${r.working[path] !== r.index[path] ? "Working changes" : r.index[path] !== snapshot(r)[path] ? "Staged snapshot" : "Matches snapshot"}</span></div>${conflict ? `<div class="urgent-note"><strong>Two versions need your decision.</strong><p>Read both proposals, then write the final text below. Remove all marker lines and stage the result.</p></div>${comparison(conflict.ours, conflict.theirs, "Your version (HEAD)", "Incoming version")}<details><summary>Common ancestor</summary><pre>${esc(conflict.base)}</pre></details>` : ""}<label for="file-editor">Working text · ${esc(path)}</label><textarea id="file-editor" class="manuscript" spellcheck="false" maxlength="20000">${esc(r.working[path] || "")}</textarea><p class="editor-help">Typing changes your working tree. Staging selects a snapshot; committing records it. Your typed text saves locally as you work.</p><div class="actions">${button("Stage this file", "stage", path)}${button("Unstage this file", "unstage", path)}${button("Delete file", "delete", path)}</div><form id="commit-form" class="save-form"><label for="commit-message">Name this snapshot · commit message</label><div class="form-line"><input id="commit-message" name="message" placeholder="Explain what changed and why" required maxlength="160"><button class="primary">Name & save snapshot</button></div></form><details><summary>Compare staged text with working text</summary>${comparison(r.index[path] || "", r.working[path] || "", "Staged for the next commit", "Working text")}</details></section></div>`;
}
function graphView(r) {
  const adapted = {
    ...r,
    current: r.current || "HEAD",
    branches: { ...r.branches, ...(!r.current ? { HEAD: r.detached } : {}) },
  };
  const selected = r.commits[selectedCommit] || r.commits[tip(r)];
  return `<h2>History is a map.</h2><p>Paths connect actual parent snapshots. Branch labels mark the tips. Select a revision to read the text it preserved.</p>${Object.keys(r.commits).length ? historyGraph(adapted) : '<p class="empty-state">Your first commit will start the map.</p>'}<div class="ref-list">${Object.entries(
    { ...r.branches, ...r.tracking, ...r.tags },
  )
    .map(
      ([b, id]) =>
        `<span class="pill">${esc(b)} → ${esc(id || "no commit")}${b === r.current ? " · HEAD" : ""}</span>`,
    )
    .join(
      "",
    )}</div><div class="history-columns"><ol class="revision-list">${Object.values(
    r.commits,
  )
    .reverse()
    .map(
      (c) =>
        `<li class="${selected?.id === c.id ? "selected" : ""}">${button(`${c.id} · ${c.message}`, "inspect", c.id)}<small>Parents: ${esc(c.parents.join(", ") || "none · first snapshot")}</small></li>`,
    )
    .join("")}</ol><section>${
    selected
      ? `<h3>${esc(selected.id)} · ${esc(selected.message)}</h3><p>Snapshot of ${Object.keys(selected.files).length} file(s). Selecting this view does not move HEAD.</p>${Object.entries(
          selected.files,
        )
          .map(
            ([p, t]) =>
              `<details open><summary>${esc(p)}</summary><pre>${esc(t)}</pre></details>`,
          )
          .join("")}`
      : ""
  }</section></div>`;
}
function githubView(r) {
  const pr =
    r.prs.find((p) => p.branch === r.current && p.status !== "merged") ||
    r.prs.at(-1);
  const remoteTip = pr ? r.server.branches[pr.branch] : null;
  const base = r.server.commits[r.server.branches.main]?.files || {},
    proposed = r.server.commits[remoteTip]?.files || {};
  return `<div class="github-top"><span class="eyebrow">GITHUB · SIMULATED</span><h2>lantern / student-publication</h2><p>Remote snapshots live here. Unsaved and unpushed local work is not visible to your editor.</p><div class="actions">${button("Create GitHub repository", "github", "create", r.server.created || r.server.branches.main ? "disabled" : "")}${button(r.forked ? "Fork created" : "Fork publication", "github", "fork", r.forked ? "disabled" : "")}${button("Receive Mara’s update", "github", "collaborator", !r.server.branches.main || r.events.includes("collaborator") ? "disabled" : "")}</div></div><div class="remote-comparison"><section><h3>Your computer · local</h3>${Object.entries(
    r.branches,
  )
    .map(
      ([b, id]) => `<p><code>${esc(b)}</code> → ${esc(id || "no commits")}</p>`,
    )
    .join(
      "",
    )}<p>Remotes: ${esc(Object.keys(r.remotes).join(", ") || "not connected")}</p></section><section><h3>GitHub · ${r.forked ? "your fork" : "remote"}</h3>${r.forked ? `<p>Upstream main → ${esc(r.upstreamServer.branches.main)} · read access</p>` : ""}${
    Object.entries(r.server.branches)
      .map(([b, id]) => `<p><code>${esc(b)}</code> → ${esc(id)}</p>`)
      .join("") || "<p>No repository created yet.</p>"
  }<p>${r.protected ? "Protected main · approval + CI required" : "Practice repository · direct pushes allowed"}</p></section></div><details><summary>Remote main files</summary>${Object.entries(
    base,
  )
    .map(([p, t]) => `<h3>${esc(p)}</h3><pre>${esc(t)}</pre>`)
    .join(
      "",
    )}</details><div class="github-sections"><section><h3>Issues · plan the contribution</h3><p>Describe a reader’s need before changing files. This small publication links its open issues to the next accepted contribution.</p><form id="issue-form"><label for="issue">Issue description</label><input id="issue" name="issue" minlength="12" maxlength="200" required placeholder="Make the reading invitation accessible"><button>Open issue</button></form><ul>${r.issues.map((i, n) => `<li>#${n + 1} ${esc(i.title)} · ${i.closed ? "closed" : "open"}</li>`).join("")}</ul></section><section><h3>Pull requests · propose and discuss</h3>${button("Open pull request", "github", "open")}<p>Push a feature branch first. Your collaborator role allows proposing changes; Mara supplies the independent review.</p></section></div>${pr ? `<section class="review-card"><span class="eyebrow">PULL REQUEST · ${esc(pr.status)}</span><h3>${esc(pr.branch)} → main</h3><div class="ref-list"><span class="pill">Review: ${pr.approved === remoteTip ? "current" : "needed or stale"}</span><span class="pill">CI: ${pr.checked === remoteTip ? "passing" : "needed or stale"}</span></div><details><summary>Inspect published changes</summary>${[...new Set([...Object.keys(base), ...Object.keys(proposed)])].map((p) => `<h3>${esc(p)}</h3>${comparison(base[p] || "", proposed[p] || "", "Published main", "Proposed branch")}`).join("")}</details><ol class="conversation">${pr.comments.map((c) => `<li>${esc(c)}</li>`).join("") || "<li>No discussion yet. Request Mara’s review.</li>"}</ol><div class="actions">${button("Request Mara’s review", "github", "request")}${button("Ask Mara to approve", "github", "approve")}${button("Run publication checks", "github", "checks")}${button("Merge approved request", "github", "merge", "")}</div><form id="comment-form"><label for="comment">Reply to the reviewer</label><textarea id="comment" name="comment" rows="2" minlength="12" maxlength="500" required placeholder="Explain how your revision addresses the feedback"></textarea><button>Post reply</button></form><p class="editor-help">Checks inspect the pushed revision: Saturday announcement, README of at least 40 characters, and no conflict markers. Merging also requires current approval and inclusion of remote main.</p></section>` : ""}`;
}
function referenceView() {
  return `<h2>A reference, not a memory test.</h2><p>Use these reminders freely. Replace example branch names and hashes with the ones on your desk. One command per line; commands only affect the simulation.</p><div class="command-reference">${reference.map(([c, t]) => `<section><code>${esc(c)}</code><p>${esc(t)}</p>${button("Copy to terminal", "prefill", c)}</section>`).join("")}</div><h2>Words you’ll encounter</h2><dl class="glossary">${Object.entries(
    glossary,
  )
    .map(([term, meaning]) => `<dt>${esc(term)}</dt><dd>${esc(meaning)}</dd>`)
    .join(
      "",
    )}</dl><details><summary>Simulation boundaries and the next step</summary><p>This static game uses a publication server and an independent fork, a fixed local workspace, short sequential commit IDs and conservative line-based merging. Forks have independent remote references; cross-repository pull requests are outside this exercise. Ignore rules support exact paths, directory prefixes and suffix patterns. Stash pop restores unstaged text. Rebase supports private linear histories; conflicting rebase, revert, cherry-pick and stash patches are rejected without mutation. Interactive rebase is explained rather than executed. Authentication, filesystem permissions, binary files, hooks, arbitrary shell commands, full Git options and actual Actions execution are outside this simulation.</p><p>Real Git may preserve nonoverlapping edits when switching branches; here switching requires a clean desk. Local browser saves have no cross-device or simultaneous-tab synchronization. When you are ready, use the original story mode’s “Take It to GitHub” exercise or the beginner guide to work in a real practice repository.</p></details>`;
}
function render(focus = "") {
  const active = document.activeElement,
    activeId = active instanceof HTMLElement ? active.id : "";
  const action = active instanceof HTMLElement ? active.dataset.action : "",
    value = active instanceof HTMLElement ? active.dataset.value : "";
  app.innerHTML = header();
  if (!state.started) {
    app.innerHTML += welcome();
    return;
  }
  const r = repo(),
    c = chapters[state.chapter],
    done = objectives(state.chapter, r),
    sandbox = state.mode === "sandbox";
  const working = changes(r.index, r.working),
    staged = changes(snapshot(r), r.index);
  app.innerHTML += `${warning ? `<p class="storage-warning">${esc(warning)}</p>` : ""}<div class="toolbar"><span id="save-status">● Saved on this device</span><div>${button(sandbox ? "Return to campaign" : "Open sandbox", "mode")}${button("Restart campaign", "restart")}</div></div><div class="practical-layout"><aside class="campaign-sidebar"><h2 class="eyebrow">YOUR EDITORIAL JOURNEY</h2><nav aria-label="Campaign chapters" class="campaign-map">${chapters.map((ch, n) => button(`${String(n + 1).padStart(2, "0")} ${ch.title}${state.completed.includes(n) ? " ✓" : ""}`, "chapter", String(n), `${n > state.completed.length ? "disabled" : ""} aria-current="${!sandbox && n === state.chapter ? "step" : "false"}"`)).join("")}</nav><section class="achievement-card"><h3>${state.completed.length}/11 assignments complete</h3><progress max="11" value="${state.completed.length}" aria-label="Campaign progress"></progress><p>${state.completed.length === 0 ? "Your first achievement is one snapshot away." : state.completed.map((n) => `<span class="achievement">✦ ${["Archivist", "Snapshot maker", "History reader", "Branch builder", "Remote correspondent", "Thoughtful reviewer", "Conflict mediator", "Recovery editor", "Toolkit keeper", "Community contributor", "Publication editor"][n]}</span>`).join("")}</p></section></aside><div class="practice-main" id="desk" tabindex="-1"><section class="assignment"><div class="assignment-meta"><span class="eyebrow">${sandbox ? "FREE PLAY · YOUR OWN DESK" : `ASSIGNMENT ${String(state.chapter + 1).padStart(2, "0")} / 11 · ${esc(c.time)}`}</span><span class="pill">${esc(r.current || "detached HEAD")}</span></div><h2>${sandbox ? "Make room for an experiment." : esc(c.title)}</h2><p class="assignment-topic">${sandbox ? "Every command is available. Your campaign is safely kept at its own desk." : esc(c.topic)}</p><p>${sandbox ? "Try a branch, write an alternate ending, or see what happens when you forget to stage. Reset this sandbox whenever you like." : esc(c.brief)}</p>${!sandbox ? `<ol class="task-list">${c.tasks.map((t, i) => `<li class="${done[i] ? "done" : ""}"><span aria-hidden="true">${done[i] ? "✓" : "○"}</span><span>${esc(t)}${done[i] ? '<span class="sr-only"> Complete</span>' : ""}</span></li>`).join("")}</ol><details><summary>Read the concept · ${esc(c.topic)}</summary><p>${esc(c.lesson)}</p></details><details><summary>A nudge from Mara</summary><p>${esc(c.hint)}</p></details>` : ""}<div class="actions">${!sandbox ? button(state.completed.includes(state.chapter) ? "Assignment completed ✓" : "Finish assignment", "complete", "", `class="primary" ${done.every(Boolean) ? "" : "disabled"}`) : ""}${button(sandbox ? "Reset sandbox" : "Retry assignment", "retry")}${!sandbox && state.completed.includes(state.chapter) && state.chapter < 10 ? button("Continue to next assignment →", "next", "", 'class="primary"') : ""}</div>${!sandbox && state.completed.includes(state.chapter) ? `<div class="success-note"><strong>${state.chapter === 10 ? "The Saturday edition is published." : "Assignment complete."}</strong><p>${esc(c.takeaway)}</p>${state.chapter === 10 ? "<p>You have earned Publication editor. Replay any assignment, experiment in the sandbox, or return to the beginner guide to continue in real GitHub.</p>" : ""}</div>` : ""}</section><section class="state-flow" aria-label="How your text moves through Git"><div><strong>01 · Working tree</strong><span>${working.length} changed file(s)</span><small>${esc(working.join(", ") || "Your current text")}</small></div><span aria-hidden="true">→</span><div class="${staged.length ? "active-stage" : ""}"><strong>02 · Staging area</strong><span>${staged.length} selected file(s)</span><small>${esc(staged.join(", ") || "git add selects changes")}</small></div><span aria-hidden="true">→</span><div><strong>03 · Local history</strong><span>${Object.keys(r.commits).length} snapshot(s)</span><small>HEAD → ${esc(tip(r) || "no commit")}</small></div><span aria-hidden="true">→</span><div><strong>04 · GitHub</strong><span>${Object.keys(r.server.commits).length} published snapshot(s)</span><small>git push shares commits</small></div></section><section class="workspace"><nav class="workspace-tabs" aria-label="Practical tools">${[
    ["files", "Files & staging"],
    ["history", "History & branches"],
    ["github", "GitHub & review"],
    ["reference", "Reference & glossary"],
  ]
    .map(([id, label]) =>
      button(
        label,
        "tab",
        id,
        `aria-current="${tab === id ? "page" : "false"}"`,
      ),
    )
    .join(
      "",
    )}</nav><div id="workspace-content">${{ files: filesView, history: graphView, github: githubView, reference: referenceView }[tab](r)}</div></section><section class="terminal" aria-labelledby="terminal-title"><div class="terminal-top"><h2 id="terminal-title">Your practice terminal</h2><span>Safe simulation · ${esc(r.current || "detached")}</span></div><p>Type a command and press Enter. Up / Down recalls commands. Use the reference whenever you need it.</p><div class="terminal-output" tabindex="0" role="region" aria-label="Command history">${
    logs()
      .map(
        (l) =>
          `<div class="terminal-entry ${l.ok ? "" : "command-error"}"><pre><strong>$ ${esc(l.input)}</strong>\n${esc(l.output)}</pre></div>`,
      )
      .join("") ||
    "<p>The desk is ready. Try <code>git status</code> to see where you are.</p>"
  }</div><form id="terminal-form"><label for="command">Git command</label><div class="form-line"><input id="command" name="command" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="2000" placeholder="git status"><button>Run command</button></div></form></section><div id="feedback" class="feedback ${error ? "error" : ""}" ${message ? "" : "hidden"}>${esc(message)}</div></div></div>`;
  const id = focus || activeId;
  if (id) document.getElementById(id)?.focus({ preventScroll: true });
  else if (action)
    [...app.querySelectorAll("button")]
      .find((b) => b.dataset.action === action && b.dataset.value === value)
      ?.focus({ preventScroll: true });
  const output = app.querySelector(".terminal-output");
  if (output) output.scrollTop = output.scrollHeight;
}
app.addEventListener("input", (event) => {
  const el = event.target;
  if (el instanceof HTMLTextAreaElement && el.id === "file-editor") {
    put(editFile(repo(), state.selected, el.value));
    save();
  }
});
app.addEventListener("change", (event) => {
  if (
    event.target instanceof HTMLTextAreaElement &&
    event.target.id === "file-editor"
  ) {
    save(); /* Avoid replacing a pointer target during blur; the next action updates the map. */
  }
});
app.addEventListener("keydown", (event) => {
  const e = /** @type {KeyboardEvent} */ (event);
  if (
    !(e.target instanceof HTMLInputElement) ||
    e.target.id !== "command" ||
    !["ArrowUp", "ArrowDown"].includes(e.key)
  )
    return;
  e.preventDefault();
  const entries = logs();
  if (commandIndex === entries.length) commandDraft = e.target.value;
  commandIndex = Math.max(
    0,
    Math.min(entries.length, commandIndex + (e.key === "ArrowUp" ? -1 : 1)),
  );
  e.target.value =
    commandIndex === entries.length
      ? commandDraft
      : entries[commandIndex].input;
});
app.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const data = new FormData(form);
  try {
    if (form.id === "terminal-form") {
      run(String(data.get("command")));
      return;
    }
    if (form.id === "commit-form") {
      run(`git commit -m ${JSON.stringify(String(data.get("message")))}`);
      return;
    }
    if (form.id === "new-file") {
      const path = String(data.get("filename"));
      if (Object.hasOwn(repo().working, path))
        throw new Error("That file already exists; select it from the list.");
      put(editFile(repo(), path, ""));
      state.selected = path;
    }
    if (form.id === "issue-form")
      put(github(repo(), "issue", String(data.get("issue"))));
    if (form.id === "comment-form")
      put(github(repo(), "comment", String(data.get("comment"))));
    report("Your contribution is recorded.");
    save();
    render();
  } catch (e) {
    report(e.message, true);
    render();
  }
});
app.addEventListener("click", (event) => {
  const el =
    event.target instanceof HTMLElement
      ? event.target.closest("button[data-action]")
      : null;
  if (!(el instanceof HTMLButtonElement)) return;
  const { action, value } = el.dataset;
  try {
    if (action === "start") state.started = true;
    if (action === "tab") tab = value;
    if (action === "file") state.selected = value;
    if (action === "stage" || action === "unstage") {
      run(`git ${action === "stage" ? "add" : "restore --staged"} ${value}`);
      return;
    }
    if (action === "delete") {
      if (
        !window.confirm(
          `Delete ${value} from the working tree? Committed copies remain in history.`,
        )
      )
        return;
      const r = structuredClone(repo());
      delete r.working[value];
      put(r);
      report(
        "File deleted from the working tree. Stage the deletion to record it.",
      );
    }
    if (action === "inspect") {
      selectedCommit = value;
      const result = execute(repo(), `git show ${value}`);
      put(result.repo);
    }
    if (action === "github") {
      put(github(repo(), value));
      report(
        {
          create:
            "The remote repository is ready. Connect it with git remote add origin lantern.",
          collaborator:
            "Mara published her Saturday update on remote main. Fetch to discover it locally.",
          open: "Your pull request is open. Request a review and inspect the published changes.",
          request:
            "Mara requested an accessibility note. Update README.md, commit, push, then reply.",
          approve: "Mara approved the current remote revision.",
          checks: "Publication checks passed for the current remote revision.",
          merge:
            "Contribution merged on GitHub. Switch to main and pull to synchronize your local desk.",
          fork: "Your independent fork is ready at origin. Add upstream to follow the original publication.",
        }[value] || "GitHub updated.",
      );
    }
    if (action === "prefill") {
      /** @type {HTMLInputElement} */ (
        document.querySelector("#command")
      ).value = value;
      document.getElementById("command").focus();
      return;
    }
    if (action === "chapter") {
      const n = Number(value);
      if (n > state.completed.length)
        throw new Error("Complete the preceding assignment first.");
      state.chapter = n;
      state.mode = "campaign";
      tab = "files";
      selectedCommit = "";
    }
    if (action === "next") {
      state.chapter++;
      tab = "files";
      selectedCommit = "";
      message = "";
    }
    if (action === "mode") {
      state.mode = state.mode === "sandbox" ? "campaign" : "sandbox";
      tab = "files";
      selectedCommit = "";
      message = "";
    }
    if (action === "complete") {
      state = complete(state);
      report(chapters[state.chapter].takeaway);
    }
    if (action === "retry") {
      if (
        !window.confirm(
          state.mode === "sandbox"
            ? "Reset all sandbox experiments? Campaign progress is preserved."
            : "Retry this assignment from its starting desk? Your unlocked chapters remain available.",
        )
      )
        return;
      put(seedChapter(state.mode === "sandbox" ? 0 : state.chapter));
      state.logs[key()] = [];
      selectedCommit = "";
      message = "Your desk is ready for another attempt.";
    }
    if (action === "restart") {
      if (
        !window.confirm(
          "Restart all eleven assignments and clear this practical campaign’s progress and sandbox? Original story-mode progress is unaffected.",
        )
      )
        return;
      state = newProgress();
      tab = "files";
      message = "";
      selectedCommit = "";
    }
    save();
    render(
      ["start", "chapter", "next", "mode", "retry"].includes(action)
        ? "desk"
        : "",
    );
  } catch (e) {
    report(e.message, true);
    render();
  }
});
render();
