import {
  emptyRepo,
  seedRepo,
  execute,
  editFile,
  github,
  tip,
  snapshot,
  clean,
  ancestors,
} from "./git-engine.mjs";
const clone = (x) => structuredClone(x);
export const SAVE_KEY = "the-last-draft-practical-v1";
export const chapters = [
  {
    title: "A desk full of finals",
    topic: "Why version control exists",
    time: "Monday · Your first morning",
    brief:
      "Welcome to The Lantern. Mara has three attachments called FINAL. Which one can we trust? Give the invitation a warmer ending, save a named snapshot, then inspect the original. No terminal needed yet.",
    lesson:
      "Git is a local history of a project. A repository holds files and their recorded history. A commit is a named snapshot you deliberately save, not an automatic backup of every keystroke. GitHub hosts repositories online and adds collaboration tools; you can use Git without it. Teams share a history instead of emailing competing FINAL files.",
    tasks: [
      "Change welcome.md and save a new snapshot with the visual controls.",
      "Inspect the original snapshot and see that it is preserved.",
    ],
    hint: "Select welcome.md, change the last sentence, choose Stage this file, then Name & save snapshot. In History, select the oldest commit.",
    takeaway:
      "You kept the old words and made space for new ones. That is version control.",
  },
  {
    title: "Your first real snapshot",
    topic: "Working tree → index → commit",
    time: "Monday · At the copy desk",
    brief:
      "Start a repository for the new issue. Commit only welcome.md first. The editor wants README.md in its own second commit, with a clear message. Inspect the differences before saving.",
    lesson:
      "The working tree is the text on your desk. The index (staging area) is the set of changes selected for the next commit. git add copies the current file into that area. git commit records the index, even if you have edited again since staging. git status reports the three states; git diff compares working text with the index, and --staged compares the index with HEAD.",
    tasks: [
      "Initialize Git and inspect a diff.",
      "Create a first commit containing only welcome.md.",
      "Commit README.md separately and inspect the log.",
    ],
    hint: 'git init → git diff → git add welcome.md → git commit -m "Introduce the reading" → git add README.md → git commit -m "Document the publication" → git log',
    takeaway:
      "A useful commit tells one coherent story. You decide what belongs in it.",
  },
  {
    title: "Find the missing invitation",
    topic: "Hashes, HEAD & recovery",
    time: "Tuesday · A troubling revision",
    brief:
      "Someone replaced the welcoming sentence with “Invitation removed.” Inspect the history, restore welcome.md from the first revision, then commit its return without erasing the mistake.",
    lesson:
      "HEAD means your current position, usually the tip of the active branch. A commit hash identifies a snapshot. Real Git hashes commit data; this game uses deterministic seven-character IDs. git show reveals a revision’s change. git restore --source=<hash> <file> copies historical text into the working tree; it does not move HEAD. Without --source, restore copies from the index. --staged unstages a change while preserving the working text.",
    tasks: [
      "Inspect the original revision with History or git show.",
      "Restore and commit the original welcoming text, preserving the mistaken revision.",
    ],
    hint: 'git log → git show 0000001 → git restore --source=0000001 welcome.md → git add welcome.md → git commit -m "Restore our welcome"',
    takeaway:
      "History is a source you can consult, not a trail you have to erase.",
  },
  {
    title: "Two desks, one publication",
    topic: "Branches & merging",
    time: "Tuesday · Parallel assignments",
    brief:
      "Create a feature branch and improve welcome.md there. On main, update README.md independently. Merge the feature into main. Both edits must survive.",
    lesson:
      "A branch is a movable reference to a commit, not a copied folder. New commits advance only the active branch. git branch lists or creates references; git switch changes branches. git checkout is an older command that can also switch branches or visit snapshots. A fast-forward moves a reference along existing history. When histories diverge, a merge commit connects both parents.",
    tasks: [
      "Create a feature branch with a changed invitation.",
      "Commit an independent README change on main.",
      "Merge into main with both histories and both edits preserved.",
    ],
    hint: "git switch -c feature/welcome. Edit, stage and commit welcome.md. git switch main. Edit, stage and commit README.md. git merge feature/welcome.",
    takeaway:
      "Separate work can share a common beginning and meet again without losing either author’s contribution.",
  },
  {
    title: "Send it to the other desk",
    topic: "GitHub, origin & remote tracking",
    time: "Wednesday · Across campus",
    brief:
      "Create the GitHub repository in the GitHub panel, connect origin, commit a local improvement, and push it. Receive Mara’s update, fetch it, then merge origin/main into your copy.",
    lesson:
      "origin is a conventional nickname for the repository you cloned or connected. It is not a special server. git push publishes commits; git fetch downloads remote history and updates origin/main without touching your working tree. git pull fetches and integrates changes. git push -u establishes a tracking relationship. A clone downloads an existing repository and its history; it does not create a fork.",
    tasks: [
      "Connect origin and publish a new local commit with tracking.",
      "Receive and fetch Mara’s remote commit.",
      "Integrate the remote update; local and remote main agree.",
    ],
    hint: "Create GitHub repository; git remote add origin lantern. Change README.md and commit. git push -u origin main. Receive Mara’s update; git fetch origin; git merge origin/main.",
    takeaway:
      "Local and remote are separate copies. Fetch lets you look before you integrate.",
  },
  {
    title: "A conversation before publication",
    topic: "Pull requests & review",
    time: "Wednesday · The review queue",
    brief:
      "Prepare a feature branch announcing Saturday. Push it and open a pull request. Ask Mara to review; add the requested accessibility note to README.md, push again, and reply. Obtain approval, pass checks, merge online, then synchronize main locally.",
    lesson:
      "A pull request proposes merging a branch; it is not a Git command. Reviewers can comment, request changes, or approve. A contributor may submit work without permission to push to a project. A collaborator has assigned repository access. Here you may push feature branches, Mara reviews, and protected main requires approval and checks. New pushed revisions make old approvals and checks stale.",
    tasks: [
      "Publish a feature branch and open a pull request.",
      "Address Mara’s requested change in a new revision and reply.",
      "Get approval and checks, merge, and pull the resulting main.",
    ],
    hint: "git switch -c feature/reading. Set welcome.md to announce Saturday, commit and push -u origin feature/reading. Use the GitHub review controls. After merging: git switch main; git pull origin main.",
    takeaway:
      "Review is a conversation tied to a concrete revision, not a permanent permission slip.",
  },
  {
    title: "Two perfectly reasonable edits",
    topic: "Conflict resolution",
    time: "Thursday · The venue calls",
    brief:
      "You wrote Sunday; Mara confirmed Saturday. Merge the venue branch into main. Inspect both versions, resolve the invitation to Saturday while retaining “Everyone belongs here.”, stage it and commit the resolution.",
    lesson:
      "A conflict means Git cannot choose between competing edits. <<<<<<< HEAD begins your version, ======= separates it from the incoming version, and >>>>>>> ends the incoming version. Edit the final text, remove all markers, verify the result, stage it, then commit. git merge --abort returns to the pre-merge state. A resolved merge preserves two parent histories.",
    tasks: [
      "Trigger a conflict by merging venue into main.",
      "Commit a marker-free Saturday invitation preserving the welcoming sentence and both parents.",
    ],
    hint: 'git merge venue. In Files, read the “Your version” and “Incoming version” cards. Edit the text, remove markers, git add welcome.md, then git commit -m "Reconcile the reading date".',
    takeaway:
      "A conflict is an editorial decision. The computer keeps both sides until you decide.",
  },
  {
    title: "A mistake is not the ending",
    topic: "Undo & reflog recovery",
    time: "Thursday · Credit where it is due",
    brief:
      "A bad commit removed contributor credit. Revert that revision safely. Then practice moving back one commit with a soft reset and recover the revert commit using its hash from the reflog. Finish with the credit restored and a clean desk.",
    lesson:
      "restore replaces file content. reset moves the current branch: --soft keeps staged and working text; --mixed resets the index but keeps working text; --hard discards tracked working changes. revert adds an inverse commit, making it safer for shared history. reflog records local reference movements and can help recover commits after a reset. It cannot recover text that was never committed or stashed. Avoid rebasing or resetting commits teammates already use.",
    tasks: [
      "Revert the credit-removal commit; preserve the earlier history.",
      "Use reset and inspect reflog, then recover the revert as HEAD with a clean working tree.",
    ],
    hint: "git revert 0000002. Note the new hash. git reset --soft HEAD~1. git reflog. git reset --soft 0000003.",
    takeaway:
      "Choose the smallest undo that fixes the problem. Shared history deserves a new correction.",
  },
  {
    title: "The editor’s toolkit",
    topic: "Stash, patches, rebase & release",
    time: "Friday · A little more fluency",
    brief:
      "Shelve a README edit with stash and bring it back. Commit it on a private feature branch. On main, add editorial.md with a production checklist, then return to your feature branch. Rebase that private branch onto the updated main, cherry-pick the prepared copydesk correction, ignore scratch.tmp, tag your work, and briefly inspect a detached snapshot. Return to your feature branch and clean up copydesk.",
    lesson:
      "stash shelves unfinished text. cherry-pick applies one commit’s patch on your current branch. rebase replays private commits on a new base, giving them new IDs; merge preserves existing ancestry. Interactive rebase uses a todo list: pick keeps, reword changes a message, squash combines, and drop removes a commit. Plan these operations before sharing. Tags name fixed release revisions. .gitignore excludes matching untracked files; it does not untrack committed files. Detached HEAD visits a commit without a branch; create a branch before leaving valuable new work.",
    tasks: [
      "Stash and restore an edit, then commit on a private feature branch.",
      "Rebase private work, cherry-pick the copydesk correction and delete that branch.",
      "Commit .gitignore excluding scratch.tmp, tag HEAD, inspect detached HEAD, then return cleanly to the feature branch.",
    ],
    hint: "Edit README.md; git stash; git switch -c feature/toolkit; git stash pop; stage and commit. Switch to main, add and commit editorial.md, then switch back. git rebase main; git cherry-pick copydesk; git branch -D copydesk. Create .gitignore containing scratch.tmp and create scratch.tmp; git add .; commit; git tag issue-1; git checkout HEAD~1; git switch feature/toolkit.",
    takeaway:
      "Advanced tools solve specific problems. Protect shared history and make recovery points before rewriting private work.",
  },
  {
    title: "A larger editorial community",
    topic: "Open source & GitHub practice",
    time: "Friday · Beyond our campus",
    brief:
      "Fork the publication and open an issue describing an accessibility improvement. Connect upstream, receive Mara’s update, and synchronize it. Add a CODEOWNERS file identifying the editorial reviewer and improve the README contribution instructions, then publish your branch.",
    lesson:
      "A fork is a separate GitHub repository; a clone is a local copy. origin usually names your fork and upstream the source project. Your fork and the upstream publication have independent branches. Fetch upstream to discover Mara’s work, then merge it locally and push to your own fork. Issues organize work; discuss scope before a large contribution. CODEOWNERS maps files to reviewers. Branch protection can require their reviews and checks. GitHub Actions runs workflows for CI (continuous integration); our simulated checks inspect the published files. Keep pull requests focused, explain why, credit collaborators, and reply respectfully.",
    tasks: [
      "Fork and open a descriptive issue.",
      "Connect upstream and integrate its new Saturday announcement.",
      "Publish a feature branch with CODEOWNERS and useful README contribution instructions.",
    ],
    hint: "Use Fork and Open issue in GitHub. git remote add upstream lantern. Receive Mara’s update; git fetch upstream; git merge upstream/main. git switch -c feature/contributing. Create CODEOWNERS with “* @mara”; improve README.md; stage, commit, push.",
    takeaway:
      "Open source includes access, expectations and communication—not just uploading files.",
  },
  {
    title: "The Saturday edition",
    topic: "Your final collaborative project",
    time: "Saturday · Publication day",
    brief:
      "Clone The Lantern, inspect its history, open an issue and create an issue-related feature branch. Improve both files, initially announcing Sunday. Push and open a request. Address Mara’s feedback, then receive her competing Saturday update. Fetch, merge and resolve the conflict. Push, pass checks, get approval, merge the request and verify local main matches the publication.",
    lesson:
      "This final assignment combines the full workflow. There is no single mandatory command sequence: the result must contain your reviewed contribution, Mara’s update, a genuine resolved merge, and synchronized clean local and remote main. The venue is available Saturday. The README must include an accessibility note. Main is protected; publish through a reviewed branch.",
    tasks: [
      "Clone, inspect history, open an issue and publish changes to both documents on a feature branch.",
      "Respond to review in a new commit, integrate Mara’s competing change, and resolve the conflict.",
      "Pass checks and fresh approval, merge, then synchronize a clean main with the final Saturday edition.",
    ],
    hint: "Clone lantern; git log; open an issue; git switch -c issue-1/reading. Edit both documents, commit, push -u origin issue-1/reading, open PR, request review. Add an accessibility note, commit, push and reply. Receive Mara’s update; git fetch; git merge origin/main. Resolve to Saturday, stage, commit, push; checks, approval, merge; git switch main; git pull origin main; git status.",
    takeaway:
      "You have taken a publication from a local draft through collaboration, conflict, review, checks and release.",
  },
];
function command(r, c) {
  const result = execute(r, c);
  if (!result.ok) throw new Error(result.output);
  return result.repo;
}
function commitEdit(r, path, text, message) {
  r = editFile(r, path, text);
  r = command(r, `git add ${path}`);
  return command(r, `git commit -m "${message}"`);
}
export function seedChapter(n) {
  let r = n === 1 || n === 10 ? emptyRepo() : seedRepo();
  if (n === 2)
    r = commitEdit(
      r,
      "welcome.md",
      "# The Lantern\nReading night: Friday\nInvitation removed.",
      "Remove the invitation by mistake",
    );
  if (n === 5 || n === 9) {
    r.remotes.origin = "lantern";
    r.server = { branches: clone(r.branches), commits: clone(r.commits) };
    r.tracking["origin/main"] = tip(r);
    r.upstream.main = "origin/main";
    r.protected = true;
  }
  if (n === 6) {
    r = command(r, "git switch -c venue");
    r = commitEdit(
      r,
      "welcome.md",
      r.working["welcome.md"].replace("Friday", "Saturday"),
      "Mara confirms Saturday",
    );
    r = command(r, "git switch main");
    r = commitEdit(
      r,
      "welcome.md",
      r.working["welcome.md"].replace("Friday", "Sunday"),
      "Suggest a Sunday reading",
    );
  }
  if (n === 7)
    r = commitEdit(
      r,
      "README.md",
      "# The Lantern\nA student publication.\nContributors: anonymous.",
      "Remove contributor credit by mistake",
    );
  if (n === 8) {
    r = command(r, "git switch -c copydesk");
    r = commitEdit(
      r,
      "welcome.md",
      r.working["welcome.md"].replace("Friday", "Saturday"),
      "Confirm the venue date",
    );
    r = command(r, "git switch main");
  }
  if (n === 10) {
    r = github(r, "create");
    r.protected = true;
  }
  r.events = [];
  r.observed = {};
  r.inspected = [];
  return r;
}
export function objectives(n, r) {
  const head = snapshot(r),
    all = Object.values(r.commits),
    original = r.commits["0000001"]?.files;
  const has = (x) => r.events.includes(x),
    merged = r.prs.find((p) => p.status === "merged");
  const synced =
    !!r.server.branches.main &&
    r.current === "main" &&
    tip(r) === r.server.branches.main &&
    clean(r);
  const reviewed = r.prs.some(
    (p) =>
      p.requested && p.responded && p.approved && p.approved !== p.requested,
  );
  const changedBoth = all.some(
    (c) =>
      c.parents.length &&
      c.files["welcome.md"] !== original?.["welcome.md"] &&
      c.files["README.md"] !== original?.["README.md"],
  );
  const prPublished = r.prs.length > 0;
  const saturday = head["welcome.md"]?.includes("Saturday");
  switch (n) {
    case 0:
      return [
        all.length > 1 && head["welcome.md"] !== original?.["welcome.md"],
        r.inspected.includes("0000001"),
      ];
    case 1:
      return [
        r.initialized && r.observed.diff === true,
        all.some(
          (c) =>
            !c.parents.length &&
            Object.keys(c.files).length === 1 &&
            c.files["welcome.md"],
        ),
        all.length >= 2 &&
          !!head["README.md"] &&
          clean(r) &&
          r.observed.log === true,
      ];
    case 2:
      return [
        r.inspected.includes("0000001"),
        has("restore") &&
          head["welcome.md"] === original?.["welcome.md"] &&
          ancestors(r, tip(r)).includes("0000002") &&
          all.length >= 3 &&
          clean(r),
      ];
    case 3: {
      const features = Object.entries(r.branches).filter(([b]) => b !== "main");
      return [
        features.some(
          ([, id]) =>
            snapshot(r, id)["welcome.md"] !== original?.["welcome.md"],
        ),
        all.some((c) => c.files["README.md"] !== original?.["README.md"]),
        r.current === "main" &&
          r.commits[tip(r)]?.parents.length === 2 &&
          head["welcome.md"] !== original?.["welcome.md"] &&
          head["README.md"] !== original?.["README.md"] &&
          clean(r),
      ];
    }
    case 4:
      return [
        has("push") && r.upstream.main === "origin/main",
        has("collaborator") && has("fetch"),
        synced && saturday,
      ];
    case 5:
      return [prPublished, reviewed, !!merged && synced && saturday];
    case 6:
      return [
        has("conflict"),
        has("resolved") &&
          r.commits[tip(r)]?.parents.length === 2 &&
          saturday &&
          head["welcome.md"]?.includes("Everyone belongs here.") &&
          clean(r),
      ];
    case 7:
      return [
        has("revert") && all.some((c) => c.message.startsWith("revert:")),
        has("reset") &&
          r.observed.reflog === true &&
          r.commits[tip(r)]?.message.startsWith("revert:") &&
          head["README.md"] === original?.["README.md"] &&
          clean(r),
      ];
    case 8:
      return [
        has("stash") &&
          has("stash-pop") &&
          head["README.md"] !== original?.["README.md"],
        has("rebase") &&
          has("cherry-pick") &&
          has("cleanup") &&
          !Object.hasOwn(r.branches, "copydesk") &&
          saturday,
        head[".gitignore"]?.split("\n").includes("scratch.tmp") &&
          !Object.hasOwn(head, "scratch.tmp") &&
          Object.hasOwn(r.working, "scratch.tmp") &&
          Object.values(r.tags).includes(tip(r)) &&
          has("detached") &&
          r.current !== "main" &&
          !!r.current,
      ];
    case 9:
      return [
        r.forked && r.issues.length > 0,
        !!r.remotes.upstream && has("fetch") && saturday,
        !!r.current &&
          r.current !== "main" &&
          r.server.branches[r.current] === tip(r) &&
          head.CODEOWNERS?.includes("@mara") &&
          head["README.md"]?.length > original?.["README.md"].length &&
          clean(r),
      ];
    case 10:
      return [
        has("clone") &&
          r.observed.log === true &&
          r.issues.length > 0 &&
          changedBoth &&
          prPublished,
        reviewed &&
          has("collaborator") &&
          has("resolved") &&
          all.some((c) => c.parents.length === 2),
        !!merged &&
          synced &&
          saturday &&
          /accessib/i.test(head["README.md"] || ""),
      ];
    default:
      return [];
  }
}
export function newProgress() {
  return {
    version: 1,
    chapter: 0,
    completed: [],
    missions: { 0: seedChapter(0) },
    sandbox: seedRepo(),
    mode: "campaign",
    started: false,
    logs: {},
    selected: "welcome.md",
  };
}
export function complete(progress) {
  const p = clone(progress),
    n = p.chapter;
  if (!objectives(n, p.missions[n]).every(Boolean))
    throw new Error(
      "Finish the repository objectives before completing this assignment.",
    );
  if (!p.completed.includes(n)) p.completed.push(n);
  if (n < 10 && !p.missions[n + 1]) p.missions[n + 1] = seedChapter(n + 1);
  return p;
}
function validRepo(r) {
  if (
    !r ||
    typeof r !== "object" ||
    typeof r.initialized !== "boolean" ||
    !Number.isInteger(r.sequence) ||
    r.sequence < 0 ||
    r.sequence > 100000
  )
    return false;
  const files = (f) =>
    f &&
    typeof f === "object" &&
    !Array.isArray(f) &&
    Object.keys(f).length <= 150 &&
    Object.entries(f).every(
      ([k, v]) =>
        /^[\w./-]+$/.test(k) &&
        !["__proto__", "constructor", "prototype"].includes(k) &&
        typeof v === "string" &&
        v.length <= 20000,
    );
  if (!files(r.working) || !files(r.index)) return false;
  if (!r.commits || !r.server?.commits || !r.branches || !r.server.branches)
    return false;
  const commits = {
    ...r.commits,
    ...r.server.commits,
    ...r.upstreamServer?.commits,
  };
  if (Object.keys(commits).some((id) => parseInt(id, 16) > r.sequence))
    return false;
  if (r.forked && (!r.upstreamServer?.branches || !r.upstreamServer?.commits))
    return false;
  if (Object.keys(commits).length > 3000) return false;
  for (const [id, c] of Object.entries(commits))
    if (
      !/^[0-9a-f]{7}$/.test(id) ||
      c.id !== id ||
      !files(c.files) ||
      typeof c.message !== "string" ||
      !Array.isArray(c.parents) ||
      c.parents.length > 2 ||
      !c.parents.every((p) => commits[p] && parseInt(p, 16) < parseInt(id, 16))
    )
      return false;
  const refs = (x) =>
    x &&
    typeof x === "object" &&
    !Array.isArray(x) &&
    Object.entries(x).every(
      ([k, v]) =>
        !["__proto__", "constructor", "prototype"].includes(k) &&
        (!v || !!commits[v]),
    );
  if (
    !refs(r.branches) ||
    (r.forked && !refs(r.upstreamServer.branches)) ||
    !Object.values({ ...r.branches, ...r.tracking, ...r.tags }).every(
      (id) => id === null || !!r.commits[id],
    ) ||
    !refs(r.server.branches) ||
    !refs(r.tracking) ||
    !refs(r.tags)
  )
    return false;
  if (
    r.current !== null
      ? !Object.hasOwn(r.branches, r.current)
      : !commits[r.detached]
  )
    return false;
  if (
    !r.remotes ||
    !r.upstream ||
    !r.observed ||
    !Array.isArray(r.events) ||
    !r.events.every((x) => typeof x === "string") ||
    !Array.isArray(r.inspected) ||
    !r.inspected.every((x) => !!commits[x])
  )
    return false;
  if (
    !Array.isArray(r.reflog) ||
    !r.reflog.every((x) => commits[x.after] && typeof x.reason === "string")
  )
    return false;
  if (
    !Array.isArray(r.stash) ||
    !r.stash.every((x) => files(x.base) && files(x.working))
  )
    return false;
  if (
    !Array.isArray(r.issues) ||
    !r.issues.every(
      (i) => typeof i.title === "string" && typeof i.closed === "boolean",
    )
  )
    return false;
  if (
    !Array.isArray(r.prs) ||
    !r.prs.every(
      (p) =>
        typeof p.branch === "string" &&
        r.server.branches[p.branch] &&
        ["open", "changes requested", "approved", "merged"].includes(
          p.status,
        ) &&
        Array.isArray(p.comments) &&
        p.comments.every((c) => typeof c === "string") &&
        [p.approved, p.checked, p.requested].every(
          (id) => id === null || !!commits[id],
        ) &&
        typeof p.responded === "boolean",
    )
  )
    return false;
  if (
    r.pending &&
    (!commits[r.pending.ours] ||
      !commits[r.pending.theirs] ||
      !files(r.pending.original) ||
      !r.pending.conflicts ||
      !Object.values(r.pending.conflicts).every((c) =>
        ["base", "ours", "theirs"].every((k) => typeof c[k] === "string"),
      ))
  )
    return false;
  return true;
}
export function validProgress(p) {
  try {
    return (
      p?.version === 1 &&
      Number.isInteger(p.chapter) &&
      p.chapter >= 0 &&
      p.chapter < 11 &&
      Array.isArray(p.completed) &&
      p.completed.every((n, i) => n === i) &&
      p.completed.length <= 11 &&
      p.chapter <= p.completed.length &&
      ["campaign", "sandbox"].includes(p.mode) &&
      typeof p.started === "boolean" &&
      typeof p.selected === "string" &&
      p.logs &&
      Object.values(p.logs).every(
        (log) =>
          Array.isArray(log) &&
          log.length <= 80 &&
          log.every(
            (l) =>
              typeof l.input === "string" &&
              typeof l.output === "string" &&
              typeof l.ok === "boolean",
          ),
      ) &&
      p.missions &&
      p.missions[p.chapter] &&
      Object.keys(p.missions).every(
        (n) => /^\d+$/.test(n) && Number(n) <= Math.min(10, p.completed.length),
      ) &&
      Object.values(p.missions).every(validRepo) &&
      validRepo(p.sandbox)
    );
  } catch {
    return false;
  }
}
export function loadProgress(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { state: newProgress(), warning: "" };
    const p = JSON.parse(raw);
    if (!validProgress(p)) throw new Error("Invalid save");
    return { state: p, warning: "" };
  } catch {
    return {
      state: newProgress(),
      warning:
        "The saved campaign could not be read or is incompatible. A fresh desk is ready; the original story-mode save is unaffected.",
    };
  }
}
export function persist(storage, p) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
export const glossary = {
  Repository: "A project’s files plus its recorded history and references.",
  Git: "Version control software that records and combines local project history.",
  GitHub: "A hosting and collaboration service for Git repositories.",
  Commit:
    "An immutable snapshot with a message and links to its parent commits.",
  Hash: "An identifier derived from commit data in real Git. This simulator uses short sequential hexadecimal IDs.",
  HEAD: "Your current position: usually the active branch, sometimes a detached commit.",
  "Working tree": "The files you are currently editing.",
  Index: "The staging area: the snapshot selected for the next commit.",
  Branch: "A movable name pointing to a commit.",
  Remote:
    "A named connection to another repository; origin and upstream are conventions.",
  "Tracking branch":
    "A local record such as origin/main showing a remote branch at the last fetch or push.",
  "Upstream branch":
    "The remote branch associated with a local branch for synchronization.",
  Fork: "A separate hosted repository based on another project.",
  Clone: "A local copy of a repository and its history.",
  "Pull request":
    "A proposal and discussion about integrating a branch on GitHub.",
  Conflict:
    "Overlapping edits that require a human choice before a merge can finish.",
  Reflog:
    "A local record of reference movements, useful for recovering committed work.",
  CI: "Continuous integration: automated checks run on proposed revisions.",
  CODEOWNERS:
    "A repository file mapping paths to responsible reviewers; protection rules can require their approval.",
};
export const reference = [
  ["git init", "Start version control in this workspace."],
  ["git status", "Inspect staged and unstaged changes."],
  [
    "git add welcome.md",
    "Stage one file’s current contents. Use . for all nonignored changes.",
  ],
  ['git commit -m "Explain the change"', "Record the staged snapshot."],
  [
    "git log --oneline --all --graph",
    "Inspect snapshots and their parent links.",
  ],
  [
    "git diff",
    "Compare working files with the index; --staged compares index with HEAD.",
  ],
  [
    "git show HEAD",
    "Inspect a snapshot’s changes. HEAD~1 means its first parent.",
  ],
  [
    "git restore --source=0000001 welcome.md",
    "Copy a file from history. Without --source, restore from index.",
  ],
  [
    "git restore --staged welcome.md",
    "Unstage a file without deleting your working text.",
  ],
  ["git branch feature/reading", "Create a reference without switching."],
  ["git switch -c feature/reading", "Create and switch to a branch."],
  ["git switch main", "Switch to an existing branch with a clean desk."],
  ["git checkout HEAD~1", "Visit an earlier commit in detached HEAD."],
  [
    "git merge feature/reading",
    "Integrate another branch. --abort cancels a paused merge.",
  ],
  [
    "git remote add origin lantern",
    "Connect a simulated remote. git remote -v lists connections.",
  ],
  [
    "git clone lantern",
    "Download the hosted publication into an empty mission.",
  ],
  [
    "git push -u origin feature/reading",
    "Publish commits and set the upstream branch.",
  ],
  ["git fetch origin", "Update local knowledge without changing your files."],
  ["git pull origin main", "Fetch and merge the named remote branch."],
  [
    "git reset --soft HEAD~1",
    "Move the branch back, preserving index and working text. --mixed unstages; --hard discards tracked edits.",
  ],
  ["git revert 0000002", "Apply an inverse patch as a new commit."],
  ["git reflog", "Find earlier commit positions after reset or rebase."],
  [
    "git stash",
    "Shelve edits. list shows the shelf; pop restores them unstaged.",
  ],
  [
    "git cherry-pick copydesk",
    "Apply the patch at a branch tip or commit hash.",
  ],
  [
    "git rebase main",
    "Replay private linear commits on main. Shared commits are protected here.",
  ],
  ["git tag issue-1", "Pin a release name to the current commit."],
  [
    "git branch -d feature/reading",
    "Delete a merged branch; -D explicitly discards an unmerged reference.",
  ],
];
