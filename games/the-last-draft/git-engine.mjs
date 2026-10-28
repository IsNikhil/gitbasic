import { mergeText } from "./engine.mjs";

const clone = (x) => structuredClone(x);
const own = (x, k) => Object.hasOwn(x, k);
const equal = (a, b) =>
  JSON.stringify(Object.entries(a).sort()) ===
  JSON.stringify(Object.entries(b).sort());
const requireThat = (ok, message) => {
  if (!ok) throw new Error(message);
};
const validName = (s) =>
  typeof s === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,70}$/.test(s) &&
  !s.includes("..") &&
  !s.endsWith("/") &&
  !["constructor", "prototype", "__proto__"].includes(s);
export const starterFiles = {
  "welcome.md": "# The Lantern\nReading night: Friday\nEveryone belongs here.",
  "README.md":
    "# The Lantern\nA student publication.\nContributors: Mara and you.",
};
/** A closed, deterministic simulation. Commands never leave this module. */
export function emptyRepo() {
  return {
    initialized: false,
    working: clone(starterFiles),
    index: {},
    commits: {},
    branches: { main: null },
    current: "main",
    detached: null,
    sequence: 0,
    remotes: {},
    tracking: {},
    upstream: {},
    server: { branches: {}, commits: {} },
    reflog: [],
    stash: [],
    tags: {},
    pending: null,
    prs: [],
    issues: [],
    forked: false,
    upstreamServer: null,
    protected: false,
    events: [],
    inspected: [],
    observed: {},
  };
}
export const tip = (r) => (r.current ? r.branches[r.current] : r.detached);
export const snapshot = (r, id = tip(r)) =>
  id ? r.commits[id]?.files || {} : {};
export const changes = (a, b) =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(
    (k) => a[k] !== b[k],
  );
export const clean = (r) =>
  changes(r.index, r.working).every(
    (p) => !own(r.index, p) && isIgnored(r, p),
  ) && equal(r.index, snapshot(r));
export function ancestors(r, id) {
  const seen = new Set();
  const visit = (key) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    r.commits[key]?.parents.forEach(visit);
  };
  visit(id);
  return [...seen];
}
function resolve(r, ref = "HEAD") {
  if (ref === "HEAD") return tip(r);
  const relative = ref.match(/^(.*?)(?:~(\d*)|\^(\d*))$/);
  if (relative) {
    let id = resolve(r, relative[1]);
    if (ref.includes("^"))
      return r.commits[id]?.parents[Number(relative[3] || 1) - 1];
    for (let i = 0; i < Number(relative[2] || 1); i++)
      id = r.commits[id]?.parents[0];
    return id;
  }
  if (own(r.branches, ref)) return r.branches[ref];
  if (own(r.tracking, ref)) return r.tracking[ref];
  if (own(r.tags, ref)) return r.tags[ref];
  const found = Object.keys(r.commits).filter((id) => id.startsWith(ref));
  return found.length === 1 ? found[0] : undefined;
}
function move(r, id, reason) {
  r.reflog.unshift({ before: tip(r), after: id, reason });
  if (r.current) r.branches[r.current] = id;
  else r.detached = id;
}
function record(r, message, files = r.index, parents = tip(r) ? [tip(r)] : []) {
  requireThat(
    message?.trim(),
    'Give this snapshot a message: git commit -m "Explain the change"',
  );
  // Stable short IDs, unique within this simulation; real Git hashes commit contents.
  const id = (++r.sequence).toString(16).padStart(7, "0");
  r.commits[id] = {
    id,
    message: message.trim(),
    files: clone(files),
    parents: [...parents],
  };
  move(r, id, message);
  r.index = clone(files);
  return id;
}
export function seedRepo() {
  const r = emptyRepo();
  r.initialized = true;
  r.index = clone(r.working);
  record(r, "Welcome to the editorial desk");
  return r;
}
function requireClean(r) {
  requireThat(
    !r.pending &&
      equal(r.index, snapshot(r)) &&
      changes(r.index, r.working).every((p) => !own(r.index, p)),
    "Save or stash your changes and finish any merge before changing histories.",
  );
}
function preserveUntracked(r, files) {
  const untracked = Object.fromEntries(
    Object.entries(r.working).filter(([p]) => !own(r.index, p)),
  );
  requireThat(
    Object.keys(untracked).every(
      (p) => !own(files, p) || untracked[p] === files[p],
    ),
    "An untracked file would be overwritten. Rename, remove or commit it first.",
  );
  return { ...untracked, ...clone(files) };
}
function setTree(r, id) {
  const files = snapshot(r, id);
  r.working = preserveUntracked(r, files);
  r.index = clone(files);
}
function mergeFiles(base, ours, theirs) {
  const files = {},
    conflicts = {};
  for (const path of new Set([
    ...Object.keys(base),
    ...Object.keys(ours),
    ...Object.keys(theirs),
  ])) {
    const b = base[path],
      o = ours[path],
      t = theirs[path];
    if (o === t || t === b) {
      if (o !== undefined) files[path] = o;
    } else if (o === b) {
      if (t !== undefined) files[path] = t;
    } else {
      const result = mergeText(b ?? "", o ?? "", t ?? "");
      if (o === undefined || t === undefined || result.conflicts.length) {
        conflicts[path] = { base: b ?? "", ours: o ?? "", theirs: t ?? "" };
        files[path] =
          `<<<<<<< HEAD\n${o ?? ""}\n=======\n${t ?? ""}\n>>>>>>> incoming`;
      } else files[path] = result.text;
    }
  }
  return { files, conflicts };
}
function integrate(r, theirs, label) {
  requireClean(r);
  requireThat(
    theirs && r.commits[theirs],
    "That revision does not exist. Fetch or inspect git branch first.",
  );
  const ours = tip(r);
  if (ancestors(r, ours).includes(theirs)) return "Already up to date.";
  if (!ours || ancestors(r, theirs).includes(ours)) {
    move(r, theirs, `Fast-forward ${label}`);
    setTree(r, theirs);
    return "Fast-forward: your branch now includes the incoming history.";
  }
  const commonAncestors = ancestors(r, ours).filter((id) =>
    ancestors(r, theirs).includes(id),
  );
  const common = commonAncestors.find(
    (id) =>
      !commonAncestors.some(
        (other) => other !== id && ancestors(r, other).includes(id),
      ),
  );
  requireThat(common, "These histories have no common ancestor.");
  const originalWorking = clone(r.working);
  const result = mergeFiles(
    snapshot(r, common),
    snapshot(r, ours),
    snapshot(r, theirs),
  );
  const untracked = Object.fromEntries(
    Object.entries(r.working).filter(([p]) => !own(r.index, p)),
  );
  requireThat(
    Object.keys(untracked).every(
      (p) => !own(result.files, p) || untracked[p] === result.files[p],
    ),
    "Merge would overwrite an untracked file. Rename or commit it first.",
  );
  r.working = { ...untracked, ...clone(result.files) };
  r.index = clone(result.files);
  if (Object.keys(result.conflicts).length) {
    r.pending = {
      ours,
      theirs,
      conflicts: result.conflicts,
      original: originalWorking,
    };
    for (const path of Object.keys(result.conflicts)) {
      if (own(snapshot(r, ours), path)) r.index[path] = snapshot(r, ours)[path];
      else delete r.index[path];
    }
    r.events.push("conflict");
    return "Merge paused. Resolve the marked files, git add each resolution, then git commit. Or git merge --abort.";
  }
  record(r, `Merge ${label}`, result.files, [ours, theirs]);
  return "Merged both histories into a two-parent commit.";
}
export function editFile(repo, path, text) {
  requireThat(
    validName(path) || (path.startsWith(".") && validName(path.slice(1))),
    "Use a relative filename such as welcome.md.",
  );
  requireThat(
    typeof text === "string" && text.length <= 20000,
    "Keep files below 20,000 characters.",
  );
  const r = clone(repo);
  r.working[path] = text;
  return r;
}
/** Quotes and escapes are parsed, never evaluated. Shell operators are intentionally unsupported. */
export function tokenize(input) {
  requireThat(
    typeof input === "string" && input.length <= 2000,
    "Keep commands below 2,000 characters.",
  );
  const tokens = [];
  let word = "",
    quote = "",
    active = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === "\\" && quote !== "'") {
      requireThat(i + 1 < input.length, "Finish the escaped character.");
      word += input[++i];
      active = true;
    } else if (quote) {
      if (c === quote) quote = "";
      else word += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      active = true;
    } else if (/\s/.test(c)) {
      if (active) {
        tokens.push(word);
        word = "";
        active = false;
      }
    } else {
      requireThat(
        !/[;|&<>`]/.test(c),
        "This terminal accepts one simulated Git command at a time.",
      );
      word += c;
      active = true;
    }
  }
  requireThat(!quote, "Close the quotation mark around your message.");
  if (active) tokens.push(word);
  return tokens;
}
const diff = (a, b) =>
  changes(a, b)
    .map(
      (k) =>
        `--- ${k}\n${(a[k] || "")
          .split("\n")
          .map((l) => "- " + l)
          .join("\n")}\n+++ ${k}\n${(b[k] || "")
          .split("\n")
          .map((l) => "+ " + l)
          .join("\n")}`,
    )
    .join("\n") || "No differences.";
function fetchRemote(r, name) {
  requireThat(
    own(r.remotes, name),
    `No remote named ${name}. Use git remote add ${name} lantern.`,
  );
  const server =
    r.forked && r.remotes[name] !== "lantern-fork"
      ? r.upstreamServer
      : r.server;
  Object.assign(r.commits, clone(server.commits));
  for (const [branch, id] of Object.entries(server.branches))
    r.tracking[`${name}/${branch}`] = id;
}
function isIgnored(r, path) {
  const rules = (r.working[".gitignore"] || "")
    .split("\n")
    .filter((x) => x && !x.startsWith("#"));
  return rules.some((rule) =>
    rule.endsWith("/")
      ? path.startsWith(rule)
      : rule.startsWith("*")
        ? path.endsWith(rule.slice(1))
        : path === rule,
  );
}
function run(r, command, args) {
  const arg = args[0];
  if (command === "init") {
    requireThat(
      !args.length,
      "Use git init in this fixed publication workspace.",
    );
    r.initialized = true;
    return "Initialized a local repository. GitHub has not been created or contacted.";
  }
  if (command === "clone") {
    requireThat(
      args.length === 1 && arg === "lantern",
      "Use git clone lantern for the simulated publication.",
    );
    requireThat(
      !r.initialized,
      "A repository already exists here. Retry the mission or use the current repository.",
    );
    requireThat(
      r.server.branches.main,
      "Create the simulated GitHub repository first.",
    );
    r.initialized = true;
    r.remotes.origin = "lantern";
    fetchRemote(r, "origin");
    r.branches = { main: r.server.branches.main };
    r.current = "main";
    setTree(r, tip(r));
    r.upstream.main = "origin/main";
    r.events.push("clone");
    return "Cloned the publication locally. origin names the GitHub copy.";
  }
  requireThat(
    r.initialized,
    "Start a local repository with git init, or clone the publication with git clone lantern.",
  );
  switch (command) {
    case "status":
      requireThat(!args.length, "Use git status.");
      return `On ${r.current || "detached HEAD"}\nStaged: ${changes(snapshot(r), r.index).join(", ") || "nothing"}\nWorking changes: ${changes(r.index, r.working).join(", ") || "none"}${r.pending ? "\nUnresolved: " + Object.keys(r.pending.conflicts).join(", ") : ""}`;
    case "add": {
      requireThat(
        args.length,
        "Choose a file: git add welcome.md (or git add . for all).",
      );
      const paths =
        args.includes(".") || args.includes("-A")
          ? changes(r.index, r.working).filter(
              (p) => own(r.index, p) || !isIgnored(r, p),
            )
          : args;
      for (const p of paths) {
        requireThat(
          own(r.working, p) || own(r.index, p),
          `No file named ${p}.`,
        );
        requireThat(
          own(r.index, p) || !isIgnored(r, p),
          `${p} is ignored by .gitignore.`,
        );
        if (r.pending?.conflicts[p]) {
          requireThat(
            !/^(<<<<<<<|=======|>>>>>>>)/m.test(r.working[p] || ""),
            "Remove all conflict markers and keep the intended prose before staging.",
          );
          delete r.pending.conflicts[p];
        }
        if (own(r.working, p)) r.index[p] = r.working[p];
        else delete r.index[p];
      }
      return `Staged ${paths.length} file(s). The index holds a snapshot, so later edits need another git add.`;
    }
    case "commit": {
      requireThat(
        args.length === 2 && arg === "-m",
        'Use git commit -m "Explain why the text changed".',
      );
      requireThat(
        !r.pending || !Object.keys(r.pending.conflicts).length,
        "Resolve and stage every conflict first.",
      );
      requireThat(
        r.pending || !equal(snapshot(r), r.index),
        "Nothing staged. Editing changes the working tree; git add selects a snapshot for the commit.",
      );
      const parents = r.pending
        ? [r.pending.ours, r.pending.theirs]
        : tip(r)
          ? [tip(r)]
          : [];
      if (r.pending) r.events.push("resolved");
      const id = record(r, args[1], r.index, parents);
      r.pending = null;
      return `Created ${id}: ${args[1]}. Only the staged snapshot was committed.`;
    }
    case "log":
      requireThat(
        args.every((x) => ["--oneline", "--all", "--graph"].includes(x)),
        "Use git log, optionally --oneline --all --graph.",
      );
      r.observed.log = true;
      return (
        (args.includes("--all")
          ? Object.keys(r.commits).reverse()
          : ancestors(r, tip(r))
        )
          .map(
            (id) =>
              `${id} ${r.commits[id].message} [parents: ${r.commits[id].parents.join(", ") || "root"}]`,
          )
          .join("\n") || "No commits yet."
      );
    case "diff":
      requireThat(
        args.length <= 1 && (!arg || ["--staged", "--cached"].includes(arg)),
        "Use git diff or git diff --staged.",
      );
      r.observed.diff = true;
      return arg ? diff(snapshot(r), r.index) : diff(r.index, r.working);
    case "show": {
      requireThat(args.length <= 1, "Use git show HEAD or git show <hash>.");
      const id = resolve(r, arg);
      requireThat(r.commits[id], "Unknown revision. Inspect git log.");
      r.inspected.push(id);
      return `${id} ${r.commits[id].message}\n${diff(snapshot(r, r.commits[id].parents[0] || null), snapshot(r, id))}`;
    }
    case "branch": {
      if (!arg)
        return Object.entries(r.branches)
          .map(
            ([b, id]) =>
              `${b === r.current ? "*" : " "} ${b} ${id || "(no commit)"}`,
          )
          .join("\n");
      if (arg === "-d" || arg === "-D") {
        requireThat(
          args.length === 2 &&
            own(r.branches, args[1]) &&
            args[1] !== r.current,
          "Choose an existing branch other than the current branch.",
        );
        requireThat(
          arg === "-D" || ancestors(r, tip(r)).includes(r.branches[args[1]]),
          "Branch is not merged. Preserve it, merge it, or explicitly use -D.",
        );
        delete r.branches[args[1]];
        r.events.push("cleanup");
        return "Deleted the branch name; commits remain recoverable in the reflog.";
      }
      requireThat(
        args.length <= 2 && validName(arg) && !own(r.branches, arg),
        "Choose a new branch name using letters, numbers, hyphens or slashes.",
      );
      const id = resolve(r, args[1]);
      requireThat(
        id && r.commits[id],
        "Make a first commit or choose a valid starting revision.",
      );
      r.branches[arg] = id;
      return `Created ${arg}. Use git switch ${arg} to work there.`;
    }
    case "switch":
    case "checkout": {
      requireClean(r);
      const create = ["-c", "-b"].includes(arg),
        detach = arg === "--detach";
      requireThat(
        args.length === (create || detach ? 2 : 1),
        "Use git switch <branch>, git switch -c <new-branch>, or git checkout <hash>.",
      );
      const name = create || detach ? args[1] : arg;
      if (create) run(r, "branch", [name]);
      if (own(r.branches, name) && !detach) {
        r.current = name;
        r.detached = null;
      } else {
        requireThat(
          command === "checkout" || detach,
          "Unknown branch. Use git switch -c to create it.",
        );
        const id = resolve(r, name);
        requireThat(id && r.commits[id], "Unknown revision.");
        r.current = null;
        r.detached = id;
        r.events.push("detached");
      }
      setTree(r, tip(r));
      return `Now on ${r.current || "detached HEAD: make a branch to keep new work"}.`;
    }
    case "merge":
      requireThat(
        args.length === 1,
        "Use git merge <branch> or git merge --abort.",
      );
      if (arg === "--abort") {
        requireThat(r.pending, "No merge is in progress.");
        r.working = clone(r.pending.original);
        r.index = clone(snapshot(r));
        r.pending = null;
        return "Merge aborted; the pre-merge snapshot is restored.";
      }
      return integrate(r, resolve(r, arg), arg);
    case "restore": {
      requireThat(
        !r.pending,
        "Resolve the pending merge in the editor or abort it first.",
      );
      const staged = args.includes("--staged"),
        source = args.find((a) => a.startsWith("--source="));
      const paths = args.filter((a) => !a.startsWith("--"));
      requireThat(
        paths.length &&
          args.every(
            (a) => !a.startsWith("--") || a === "--staged" || a === source,
          ),
        "Use git restore [--staged] [--source=HEAD] <file>.",
      );
      const id = source ? resolve(r, source.slice(9)) : tip(r);
      requireThat(!source || r.commits[id], "Unknown source revision.");
      const from = source || staged ? snapshot(r, id) : r.index,
        to = staged ? r.index : r.working;
      for (const p of paths) {
        requireThat(own(from, p) || own(to, p), "Unknown file.");
        if (own(from, p)) to[p] = from[p];
        else delete to[p];
      }
      r.events.push("restore");
      return staged
        ? "Unstaged the file; working text is preserved."
        : "Restored the selected file. Uncommitted edits to it were replaced.";
    }
    case "reset": {
      requireThat(!r.pending, "Finish or abort the merge first.");
      const mode = arg?.startsWith("--") ? arg : "--mixed",
        ref = arg?.startsWith("--") ? args[1] : arg;
      requireThat(
        ["--soft", "--mixed", "--hard"].includes(mode) &&
          args.length <= (arg?.startsWith("--") ? 2 : 1),
        "Use git reset [--soft|--mixed|--hard] <revision>.",
      );
      const id = resolve(r, ref);
      requireThat(r.commits[id], "Unknown reset revision.");
      const oldIndex = clone(r.index);
      move(r, id, `reset ${mode}`);
      if (mode !== "--soft") r.index = clone(snapshot(r));
      if (mode === "--hard") {
        const untracked = Object.fromEntries(
          Object.entries(r.working).filter(([p]) => !own(oldIndex, p)),
        );
        r.working = { ...untracked, ...clone(r.index) };
      }
      r.events.push("reset");
      return `Moved HEAD to ${id}. ${mode === "--hard" ? "Working edits were discarded. Reflog can recover commits, not unsaved text." : "Working text preserved."} Avoid rewriting shared history.`;
    }
    case "reflog":
      requireThat(!args.length, "Use git reflog.");
      r.observed.reflog = true;
      return r.reflog
        .map(
          (x, i) =>
            `${x.after} HEAD@{${i}} ${x.reason} (was ${x.before || "unborn"})`,
        )
        .join("\n");
    case "revert":
    case "cherry-pick": {
      requireClean(r);
      requireThat(args.length === 1, "Choose one commit hash.");
      const id = resolve(r, arg),
        c = r.commits[id];
      requireThat(
        c && c.parents.length <= 1,
        "Choose a normal commit; merge commits need options outside this simulator.",
      );
      const parent = snapshot(r, c.parents[0] || null),
        reverse = command === "revert";
      const result = mergeFiles(
        reverse ? c.files : parent,
        snapshot(r),
        reverse ? parent : c.files,
      );
      requireThat(
        !Object.keys(result.conflicts).length,
        "This patch overlaps later edits. Inspect it with git show and reconcile the text manually; this simulator leaves the repository unchanged.",
      );
      const working = preserveUntracked(r, result.files);
      record(r, `${command}: ${c.message}`, result.files);
      r.working = working;
      r.events.push(command);
      return `${command} created a new commit; earlier snapshots are preserved.`;
    }
    case "remote": {
      if (!arg || (arg === "-v" && args.length === 1))
        return (
          Object.entries(r.remotes)
            .map(([n, url]) => `${n}\t${url} (simulated)`)
            .join("\n") || "No remotes. Git is local until you connect one."
        );
      requireThat(
        arg === "add" &&
          args.length === 3 &&
          validName(args[1]) &&
          args[2] === "lantern",
        "Use git remote add origin lantern (or upstream lantern).",
      );
      requireThat(!own(r.remotes, args[1]), "That remote already exists.");
      r.remotes[args[1]] = args[2];
      return `Connected ${args[1]} to the simulated publication.`;
    }
    case "fetch":
      requireThat(args.length <= 1, "Use git fetch origin.");
      fetchRemote(r, arg || "origin");
      r.events.push("fetch");
      return "Fetched remote references. Your branch and working files have not moved.";
    case "push": {
      const set = args.includes("-u") || args.includes("--set-upstream"),
        a = args.filter((x) => !["-u", "--set-upstream"].includes(x));
      requireThat(
        a.length <= 2 && a.every((x) => !x.startsWith("-")),
        "Use git push [-u] origin <branch>. Force push is intentionally unavailable.",
      );
      const remote = a[0] || "origin",
        branch = a[1] || r.current;
      requireThat(
        own(r.remotes, remote) && own(r.branches, branch) && r.branches[branch],
        "Choose a connected remote and a branch with commits.",
      );
      requireThat(
        !(r.protected && branch === "main"),
        "main is protected. Push a feature branch and open a pull request.",
      );
      requireThat(
        !r.forked || r.remotes[remote] === "lantern-fork",
        "You have read access to upstream. Push to your origin fork and propose a contribution.",
      );
      const old = r.server.branches[branch];
      requireThat(
        !old || ancestors(r, r.branches[branch]).includes(old),
        "Push rejected: remote has work you do not include. Fetch and merge it first.",
      );
      for (const id of ancestors(r, r.branches[branch]))
        r.server.commits[id] = clone(r.commits[id]);
      r.server.branches[branch] = r.branches[branch];
      r.tracking[`${remote}/${branch}`] = r.branches[branch];
      if (set) r.upstream[branch] = `${remote}/${branch}`;
      r.events.push("push");
      return `Published ${branch} to ${remote}. Local edits outside commits are not uploaded.`;
    }
    case "pull": {
      requireThat(args.length <= 2, "Use git pull origin main.");
      const remote = arg || "origin",
        branch = args[1] || r.current;
      requireClean(r);
      fetchRemote(r, remote);
      const output = integrate(
        r,
        r.tracking[`${remote}/${branch}`],
        `${remote}/${branch}`,
      );
      r.events.push("pull");
      return output;
    }
    case "stash": {
      requireThat(!r.pending, "Finish or abort the merge first.");
      requireThat(
        args.length <= 1 && (!arg || ["push", "pop", "list"].includes(arg)),
        "Use git stash, git stash list, or git stash pop.",
      );
      if (arg === "list")
        return (
          r.stash.map((s, i) => `stash@{${i}} on ${s.branch}`).join("\n") ||
          "No stashed changes."
        );
      if (arg === "pop") {
        requireThat(r.stash.length, "No stash to restore.");
        requireClean(r);
        const s = r.stash[0],
          result = mergeFiles(s.base, r.working, s.working);
        requireThat(
          !Object.keys(result.conflicts).length,
          "The stash conflicts with this branch. Switch back to its original branch before popping.",
        );
        r.working = result.files;
        r.stash.shift();
        r.events.push("stash-pop");
        return "Restored stashed edits to the working tree (unstaged).";
      }
      requireThat(!clean(r), "No changes to stash.");
      r.stash.unshift({
        base: clone(snapshot(r)),
        working: clone(r.working),
        branch: r.current,
      });
      setTree(r, tip(r));
      r.events.push("stash");
      return "Saved edits on the stash shelf; your working tree is clean.";
    }
    case "tag":
      if (!arg)
        return (
          Object.entries(r.tags)
            .map(([n, id]) => `${n} ${id}`)
            .join("\n") || "No tags."
        );
      requireThat(
        args.length <= 2 && validName(arg) && !own(r.tags, arg),
        "Use a new tag name: git tag issue-1 [revision].",
      );
      {
        const id = resolve(r, args[1]);
        requireThat(r.commits[id], "Tag an existing commit.");
        r.tags[arg] = id;
      }
      return `Tagged ${arg}; a tag stays on this revision as branches move.`;
    case "rebase": {
      requireClean(r);
      requireThat(
        args.length === 1 && arg !== "-i",
        "Use git rebase <branch>. Interactive rebase plans are taught in the reference; rewriting individual messages is not simulated.",
      );
      const target = resolve(r, arg);
      requireThat(
        r.commits[target] && r.current,
        "Choose a known revision and an attached branch.",
      );
      const ids = ancestors(r, tip(r))
        .filter((id) => !ancestors(r, target).includes(id))
        .reverse();
      requireThat(
        !ids.some((id) =>
          Object.values({
            ...r.server.branches,
            ...r.upstreamServer?.branches,
          }).some((t) => ancestors(r, t).includes(id)),
        ),
        "These commits have been shared. Rebase private work only; merge shared history.",
      );
      let files = clone(snapshot(r, target));
      const results = [];
      for (const id of ids) {
        const c = r.commits[id];
        requireThat(
          c.parents.length === 1,
          "This exercise supports linear private branches only.",
        );
        const result = mergeFiles(snapshot(r, c.parents[0]), files, c.files);
        requireThat(
          !Object.keys(result.conflicts).length,
          "Rebase would conflict. No changes made. Use merge for the guided conflict workshop.",
        );
        files = result.files;
        results.push({ files: clone(files), message: c.message });
      }
      const working = preserveUntracked(r, files);
      move(r, target, "rebase start");
      for (const result of results) record(r, result.message, result.files);
      r.index = clone(snapshot(r));
      r.working = working;
      r.events.push("rebase");
      return `Replayed ${results.length} private commit(s) onto ${arg}. Their old snapshots remain in reflog.`;
    }
    default:
      throw new Error(
        `Unknown command: git ${command}. Open the command reference for supported syntax.`,
      );
  }
}
export function execute(repo, input) {
  try {
    const [git, command, ...args] = tokenize(input);
    requireThat(
      git === "git" && command,
      "Start with git and a command, for example git status.",
    );
    const r = clone(repo);
    const output = run(r, command, args);
    return { repo: r, output, ok: true };
  } catch (error) {
    return { repo, output: error.message, ok: false };
  }
}

/** GitHub actions use server snapshots, never unstaged local text. */
export function github(repo, action, value = "") {
  const r = clone(repo);
  if (action === "create") {
    requireThat(
      !r.server.created && !r.server.branches.main,
      "The GitHub repository already exists.",
    );
    if (r.initialized) {
      r.server = { branches: {}, commits: {}, created: true };
    } else {
      const seed = seedRepo();
      r.server = {
        branches: clone(seed.branches),
        commits: clone(seed.commits),
        created: true,
      };
      r.sequence = Math.max(r.sequence, seed.sequence);
    }
    return r;
  }
  if (action === "fork") {
    requireThat(
      !r.forked && r.server.branches.main,
      "Fork an existing publication once it has a main branch.",
    );
    r.upstreamServer = clone(r.server);
    r.server = clone(r.server);
    r.forked = true;
    r.remotes.origin = "lantern-fork";
    r.events.push("fork");
    return r;
  }
  if (action === "issue") {
    requireThat(
      value.trim().length >= 12,
      "Describe the reader’s need in at least 12 characters.",
    );
    r.issues.push({ title: value.trim(), closed: false });
    return r;
  }
  if (action === "collaborator") {
    const server = r.forked ? r.upstreamServer : r.server;
    requireThat(server.branches.main, "Publish or clone the remote first.");
    const parent = server.branches.main,
      files = clone(server.commits[parent].files);
    files["welcome.md"] =
      "# The Lantern\nReading night: Saturday\nEveryone belongs here.";
    const id = (++r.sequence).toString(16).padStart(7, "0");
    server.commits[id] = {
      id,
      parents: [parent],
      message: "Mara confirms Saturday with the venue",
      files,
    };
    server.branches.main = id;
    r.events.push("collaborator");
    return r;
  }
  if (action === "open") {
    requireThat(
      r.current &&
        r.current !== "main" &&
        r.server.branches[r.current] === tip(r),
      "Push your feature branch before opening its pull request.",
    );
    requireThat(
      !r.prs.some((p) => p.branch === r.current && p.status !== "merged"),
      "An open request already exists for this branch.",
    );
    requireThat(
      r.server.branches.main && r.server.branches.main !== tip(r),
      "The contribution must differ from main.",
    );
    r.prs.push({
      branch: r.current,
      status: "open",
      comments: [],
      approved: null,
      checked: null,
      requested: null,
      responded: false,
    });
    return r;
  }
  const pr = r.prs.find((p) => p.branch === r.current && p.status !== "merged");
  requireThat(pr, "Open a pull request on this feature branch first.");
  const id = r.server.branches[pr.branch],
    files = r.server.commits[id].files;
  if (action === "request") {
    pr.status = "changes requested";
    pr.requested = id;
    pr.approved = null;
    pr.comments.push(
      "Mara: Please add an accessibility note to README.md, then push the revision and reply.",
    );
  } else if (action === "comment") {
    requireThat(
      value.trim().length >= 12,
      "Leave a helpful reply of at least 12 characters.",
    );
    pr.comments.push(`You: ${value.trim()}`);
    pr.responded = true;
  } else if (action === "approve") {
    requireThat(
      !pr.requested ||
        (id !== pr.requested &&
          pr.responded &&
          /accessib/i.test(files["README.md"] || "")),
      "Mara is waiting for a new pushed revision, an accessibility note in README.md, and your reply.",
    );
    pr.approved = id;
    pr.status = "approved";
    pr.comments.push(
      "Mara (CODEOWNER): Reviewed and approved this exact revision.",
    );
  } else if (action === "checks") {
    requireThat(
      files["welcome.md"]?.includes("Saturday") &&
        (files["README.md"] || "").length >= 40 &&
        !Object.values(files).some((t) =>
          /^(<<<<<<<|=======|>>>>>>>)/m.test(t),
        ),
      "Checks failed: announce Saturday, write a README of at least 40 characters, and remove conflict markers.",
    );
    pr.checked = id;
  } else if (action === "merge") {
    requireThat(
      pr.approved === id && pr.checked === id,
      "Branch protection requires approval and passing checks for the latest pushed revision.",
    );
    // The remote may contain commits not fetched locally.
    const combined = { ...r, commits: { ...r.commits, ...r.server.commits } };
    requireThat(
      ancestors(combined, id).includes(r.server.branches.main),
      "main changed. Fetch, merge origin/main into your branch, push, and request fresh review/checks.",
    );
    const mergeId = (++r.sequence).toString(16).padStart(7, "0");
    r.server.commits[mergeId] = {
      id: mergeId,
      files: clone(files),
      parents: [r.server.branches.main, id],
      message: `Merge pull request: ${pr.branch}`,
    };
    r.server.branches.main = mergeId;
    pr.status = "merged";
    r.issues.forEach((i) => {
      i.closed = true;
    });
  } else throw new Error("Unknown GitHub action.");
  return r;
}
