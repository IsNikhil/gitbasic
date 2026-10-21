import { chapters, commands } from "./content.mjs";
import { mission, objectives, reputation } from "./campaign.mjs";
import { esc, button } from "./view-helpers.mjs";
/** @param {import("./types.js").Campaign} state */
export function masthead(state) {
  return `<div class="masthead"><div class="masthead-top"><span>THE INDEPENDENT LITERARY MAGAZINE</span><span>EST. SOMETIME BEFORE THE DEADLINE</span></div><div class="masthead-title"><h1>THE LAST DRAFT<span class="title-period">.</span></h1><p>Every story has a history.</p></div><div class="masthead-bottom"><span>Fiction. Poetry. Second chances.</span><span>${state.started ? `${state.completed.length} / 5 chapters filed · ${reputation(state)} editorial reputation` : "An editorial adventure in five chapters"}</span></div></div>`;
}
/** @param {import("./types.js").Campaign} state */
export function welcome(state) {
  return `<section class="welcome" id="desk" tabindex="-1"><div><span class="eyebrow">Your first day. Their last chance.</span><h2>A magazine on the brink.<br>A desk with your name on it.</h2><p>The ending is missing. Two editors are at war over a sentence. The next issue goes to print on Friday.</p><p>Join a tiny literary magazine and bring order to its beautiful mess. Recover lost writing, explore different endings, and help a story find its way into print.</p><div class="actions">${button(state.started ? "Resume the story" : "Take your seat", "start", "", "primary large")}</div><p class="fine-print">No coding. No account. About 30–45 minutes, at your own pace.<br>Progress saves in this browser. You can leave between sentences.</p></div><aside class="welcome-letter" aria-label="Welcome letter from Mara"><span class="paper-clip" aria-hidden="true"></span><span class="eyebrow">A note on your desk</span><p>“We don’t need another final_final manuscript.</p><p>We need someone who can remember how we got here.”</p><span class="signature">Mara Bell</span><small>Editor-in-chief, The Last Draft</small><div class="stamp">NEW EDITOR<br>WELCOME ABOARD</div></aside></section><div class="welcome-skills"><span>01 &nbsp; Recover</span><span>02 &nbsp; Experiment</span><span>03 &nbsp; Reconcile</span><span>04 &nbsp; Collaborate</span><span>05 &nbsp; Publish</span></div>`;
}
/** @param {import("./types.js").Campaign} state */
export function chapterNavigation(state) {
  return `<nav class="chapters" aria-label="Campaign chapters">${chapters.map((c, i) => button(`<span class="chapter-number">${state.completed.includes(i) ? "✓" : String(i + 1).padStart(2, "0")}</span><span>${c.title}<small>${i > state.unlocked ? "Locked · finish the previous chapter" : c.skill}</small></span>`, "chapter", `data-chapter="${i}" ${i > state.unlocked ? "disabled" : ""} ${i === state.chapter ? 'aria-current="step"' : ""}`)).join("")}</nav>`;
}
/** @param {import("./types.js").Campaign} state */
export function missionPanel(state) {
  const c = chapters[state.chapter],
    m = mission(state),
    done = objectives(state),
    complete = done.every(Boolean);
  return `<aside class="mission-panel"><div class="issue-label">THE EDITOR’S DESK <span>0${state.chapter + 1}</span></div><span class="eyebrow">${c.time}</span><h2>${c.title}</h2><p class="small">${c.skill}</p><div class="objectives"><h3>Your assignment</h3><ol>${c.objectives.map((o, i) => `<li class="${done[i] ? "done" : ""}"><span aria-label="${done[i] ? "Completed" : "Not yet completed"}">${done[i] ? "✓" : "○"}</span>${o}</li>`).join("")}</ol></div><div class="progress-track" role="progressbar" aria-label="Mission objectives" aria-valuemin="0" aria-valuemax="${done.length}" aria-valuenow="${done.filter(Boolean).length}"><span style="width:${(done.filter(Boolean).length / done.length) * 100}%"></span></div><small>${done.filter(Boolean).length} of ${done.length} objectives complete</small>
    ${complete ? `<div class="mission-ready"><h3>The desk is in order.</h3>${button(state.completed.includes(state.chapter) ? "Read chapter conclusion" : "Finish this chapter", "complete", "", "primary")}</div>` : ""}
    <div class="hint-box">${button(m.hint === 0 ? "A nudge, please" : m.hint === 3 ? "All hints revealed" : "A little more help", "hint", m.hint === 3 ? "disabled" : "")}${
      m.hint
        ? `<ol>${c.hints
            .slice(0, m.hint)
            .map(
              (h, i) =>
                `<li><strong>${["An idea", "Where to look", "A way forward"][i]}</strong><p>${esc(h)}</p></li>`,
            )
            .join("")}</ol>`
        : "<small>Three levels of help. No penalty for asking.</small>"
    }</div>${button("Restart this chapter", "restart", "", "text-button")}</aside>`;
}
/** @param {import("./types.js").Campaign} state */
export function messagePanel(state) {
  const c = chapters[state.chapter],
    m = mission(state);
  return `<section class="message-card"><div class="message-author"><span class="avatar">${c.initials}</span><div><strong>${c.sender}</strong><small>${c.role}</small></div><span class="message-label">${m.read ? "READ" : "NEW MESSAGE"}</span></div><h3>${c.subject}</h3><p>${c.message}</p><p class="reply">${c.reply}</p>${!m.read ? button("Read & begin assignment", "read", "", "primary") : ""}</section>`;
}
/** @param {import("./types.js").Campaign} state */
export function learningPanel(state) {
  const m = mission(state),
    e = m.evidence;
  const learned = [
    e.savedRecovery,
    e.experiment,
    e.resolved,
    e.approved,
    e.reverted,
  ][state.chapter];
  const max = Math.max(state.unlocked, ...state.completed, 0);
  return `<section class="learning-panel"><div><span class="eyebrow">From your desk to the real world</span><h2>${learned ? chapters[state.chapter].skill : "Learn by doing"}</h2><p>${learned ? chapters[state.chapter].lesson : "Solve the editorial problem first. The version-control idea behind your work will appear here as you make progress."}</p></div><div class="mode-switch">${button(state.gitMode ? "Git Mode · on" : "Story Mode · show Git terms", "mode", `${!state.completed.includes(0) && state.unlocked === 0 ? "disabled" : ""} aria-pressed="${state.gitMode}"`)}${!state.completed.includes(0) && state.unlocked === 0 ? "<small>Unlocks after Chapter 1.</small>" : ""}</div>${
    state.gitMode
      ? `<div class="command-guide"><p>Reference only. No commands are executed. More commands unlock as the story progresses.</p>${commands
          .filter(([, level]) => level <= max)
          .map(
            ([cmd, , explanation]) =>
              `<details><summary><code>${esc(cmd)}</code></summary><p>${esc(explanation)}</p></details>`,
          )
          .join(
            "",
          )}<p><a href="https://git-scm.com/docs" target="_blank" rel="noopener">Official Git reference ↗</a></p></div>`
      : ""
  }</section>`;
}
/** @param {import("./types.js").Campaign} state */
export function ending(state) {
  const final = state.chapter === 4,
    c = chapters[state.chapter];
  return `<section class="chapter-ending" id="desk" tabindex="-1"><span class="eyebrow">${final ? "Issue № 01 · Published" : `Chapter ${state.chapter + 1} · Filed`}</span><h2>${final ? "The presses are running." : "A little less chaos."}</h2><p class="ending-prose">${c.conclusion}</p><div class="lesson-note"><h3>${c.skill}</h3><p>${c.lesson}</p></div>${
    final
      ? `<div class="issue-preview"><span class="eyebrow">The published issue · revision ${mission(state).repo.publication.revision}</span><h3>The Last Draft / Autumn</h3>${Object.entries(
          mission(state).repo.publication.docs,
        )
          .map(
            ([doc, text]) =>
              `<details><summary>${{ story: "The Ferry at Low Water", poem: "Inventory of an Empty House", notes: "A Note to Our Readers" }[doc]}</summary><p class="published-text">${esc(text)}</p></details>`,
          )
          .join(
            "",
          )}</div><div class="skills-summary"><h3>Your editorial toolkit</h3><ul>${chapters.map((c) => `<li>✓ ${c.skill}</li>`).join("")}</ul><p>${reputation(state)} reputation · A trusted pair of editorial eyes.</p></div>`
      : ""
  }<div class="actions">${final ? button("Take It to GitHub ↗", "github", "", "primary") : button(`Continue to Chapter ${state.chapter + 2} →`, "next", "", "primary")}${button("Return to the editorial desk", "desk")}</div></section>`;
}
export function githubModule() {
  return `<section class="github-module" id="desk" tabindex="-1"><span class="eyebrow">Optional fieldwork · beyond the simulation</span><h2>Take It to GitHub</h2><p class="lead">Give a poem a history of its own.</p><p>This exercise takes place on the real GitHub website and requires your own account. The game never signs you in, asks for a token, uploads your writing, or checks this exercise. Use a short piece you wrote and are comfortable sharing.</p><div class="lesson-note"><h3>Two tools, different jobs</h3><p><strong>Git</strong> records file snapshots and history, usually on your computer. <strong>GitHub</strong> hosts repositories online and provides pull requests, discussion and review. You can use Git without GitHub. GitHub’s browser editor can create commits without installing Git locally.</p></div><ol class="fieldwork"><li><h3>Create a manuscript collection</h3><p>On GitHub, create a new repository called <code>small-poem-workshop</code>. Choose its visibility deliberately: public writing can be read by anyone. Add a README describing the workshop.</p></li><li><h3>Add a poem</h3><p>Create <code>poem.md</code> and write six lines. The .md extension means Markdown, a plain-text format. Commit with a message such as “Add the first six-line river poem”. Git can track text, images, and binary files, but plain text gives writers readable line comparisons. Word documents can be versioned, but their changes are harder to compare. Unsaved editor text is not a commit; local untracked files are not included until added.</p></li><li><h3>Explore another ending</h3><p>Create a branch called <code>another-ending</code> from main. Edit the last two lines on that branch. Commit with a reason for the change. Switch back to main and confirm the original poem remains there.</p></li><li><h3>Look at the evidence</h3><p>Open the file’s history to inspect both saved revisions on the appropriate branch. Compare the branches. What changed? Does the new ending change what the earlier lines mean?</p></li><li><h3>Invite an editorial conversation</h3><p>Open a pull request from <code>another-ending</code> into <code>main</code>. Describe the intended effect. Ask a classmate with repository access to compare the lines and leave a useful review. Authors cannot approve their own pull requests. If working alone, write a self-review comment; do not label it an independent approval.</p></li><li><h3>Revise, review, combine</h3><p>If your reader requests changes, edit and commit on the same branch. The pull request updates. Ask them to inspect the new revision, then approve. Merge when the workshop agrees. Review requirements depend on repository settings. Return to main and inspect the combined poem and history.</p></li><li><h3>Reflect</h3><p>Which revision would you recover if you changed your mind? Why is a review request different from a merge? Where does a local commit live before it is pushed? Try the same process with an essay introduction, an annotated bibliography, or a magazine’s style guide.</p></li></ol><p class="source-links">Continue with the <a href="https://docs.github.com/en/get-started/using-github/hello-world" target="_blank" rel="noopener">official GitHub Hello World exercise ↗</a> and <a href="https://git-scm.com/docs/git-add" target="_blank" rel="noopener">Git’s staging reference ↗</a>.</p>${button("Back to the magazine", "desk", "", "primary")}</section>`;
}
