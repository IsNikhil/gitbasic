import {
  emptyRepo,
  execute,
  editFile,
  github,
  snapshot,
  tip,
  clean,
} from "./git-engine.mjs";
import { validProgress, newProgress } from "./git-campaign.mjs";
export const KEY = "the-last-draft-guided-v1";
export const FILE = "welcome.md";
export const ORIGINAL =
  "# The Lantern\nReading night: Friday\nEveryone belongs here.";
const command = (text) => (s) => {
  const result = execute(s.repo, text);
  if (!result.ok) throw new Error(result.output);
  s.repo = result.repo;
};
const remote = (action) => (s) => {
  s.repo = github(s.repo, action);
};
const saved = (s) => snapshot(s.repo)[FILE];
const stage = command(`git add ${FILE}`);
const commit = (name) => command(`git commit -m "${name}"`);
const edited = (s) => s.repo.working[FILE] !== saved(s);
const recordReady = (s) =>
  s.repo.index[FILE] !== saved(s) &&
  s.repo.index[FILE] === s.repo.working[FILE];
const edit = (s) => {
  if (!s.draft.trim() || s.draft === s.repo.working[FILE])
    throw new Error(
      "Change a few words in the document first. Your recorded version is safe.",
    );
  s.repo = editFile(s.repo, FILE, s.draft);
};
function step(
  mission,
  title,
  instruction,
  label,
  action,
  check,
  explanation,
  extra = {},
) {
  return {
    mission,
    title,
    instruction,
    label,
    action,
    check,
    explanation,
    editable: false,
    compare: false,
    branchCompare: false,
    shared: false,
    file: FILE,
    ...extra,
  };
}
export const steps = [
  step(
    0,
    "Keep this version before experimenting",
    "Mara, your editor at The Lantern, wants a different ending for this invitation. First, select the current document to keep.",
    "Select this document",
    stage,
    (s) => s.repo.index[FILE] === ORIGINAL,
    "Selected. Git calls this staging: choosing the file contents for the next recorded version.",
  ),
  step(
    0,
    "Record the selected version",
    "The invitation is selected. Record it before changing the ending.",
    "Create checkpoint",
    commit("Keep the original invitation"),
    (s) => saved(s) === ORIGINAL && !!tip(s.repo),
    "Your original invitation is now in history. This recorded version is a commit. It stays here when you edit the document.",
  ),
  step(
    1,
    "Try a different ending",
    "Mara asks for a warmer invitation. Rewrite the last sentence in your own words, then save the document.",
    "Save document",
    edit,
    edited,
    "Your document changed. Saving updates the file; it does not stage it or create a commit.",
    { editable: true },
  ),
  step(
    1,
    "See what changed",
    "Compare your new words with the checkpoint before deciding which ending to keep.",
    "Compare with checkpoint",
    command("git diff"),
    (s) => edited(s) && s.repo.observed.diff,
    "The checkpoint still holds the original words. You can bring them back without guessing.",
    { compare: true },
  ),
  step(
    1,
    "Bring the original ending back",
    "Mara prefers the first invitation. Restore it from your checkpoint. This replaces the uncommitted experiment shown below.",
    "Restore original document",
    command("git restore --source=0000001 welcome.md"),
    (s) => s.repo.working[FILE] === ORIGINAL && saved(s) === ORIGINAL,
    "The original is back in your working file. Restoring copied recorded text; it did not erase history. Your experiment is available in Undo last action.",
    { compare: true },
  ),
  step(
    2,
    "Give an alternative its own space",
    "You want to try another ending while keeping the main invitation ready. Create an alternative draft called warm-ending.",
    "Create alternative draft",
    command("git switch -c warm-ending"),
    (s) =>
      s.repo.current === "warm-ending" && s.repo.branches.main === tip(s.repo),
    "You are on warm-ending, a branch. It starts at the same commit as main; new commits here will leave main unchanged.",
  ),
  step(
    2,
    "Write on your alternative",
    "Change only the last sentence. Keep the title and reading date so we can combine a separate title edit later.",
    "Save document",
    edit,
    (s) =>
      edited(s) &&
      s.repo.working[FILE].split("\n").slice(0, 2).join("\n") ===
        ORIGINAL.split("\n").slice(0, 2).join("\n") &&
      s.repo.working[FILE].split("\n").length === 3,
    "Your alternative is saved as a file. Select these words before recording them.",
    { editable: true },
  ),
  step(
    2,
    "Select your new ending",
    "Choose this version of the invitation for the next checkpoint.",
    "Select this document",
    stage,
    recordReady,
    "The staging area now holds your new ending.",
  ),
  step(
    2,
    "Record the alternative",
    "Keep the ending on warm-ending so you can return to it.",
    "Create checkpoint",
    commit("Write a warmer ending"),
    (s) =>
      clean(s.repo) &&
      saved(s) !== ORIGINAL &&
      s.repo.branches.main !== tip(s.repo),
    "The new commit belongs to warm-ending. Main still points to the original invitation.",
  ),
  step(
    3,
    "Return to the main invitation",
    "The title also needs a change. Return to main to work on that independently.",
    "Switch to main",
    command("git switch main"),
    (s) => s.repo.current === "main" && saved(s) === ORIGINAL,
    "The original ending is visible again. Switching branches changes the working files to match that branch.",
  ),
  step(
    3,
    "Give the invitation a new title",
    "Change only the first line. Leave the date and ending as they are.",
    "Save document",
    edit,
    (s) =>
      edited(s) &&
      s.repo.working[FILE].split("\n").slice(1).join("\n") ===
        ORIGINAL.split("\n").slice(1).join("\n"),
    "The title changed on main. Your alternative ending remains on its own branch.",
    { editable: true },
  ),
  step(
    3,
    "Select the title change",
    "Prepare this title for its own checkpoint.",
    "Select this document",
    stage,
    recordReady,
    "Only the current main version is selected.",
  ),
  step(
    3,
    "Record the title",
    "Keep the title change before combining the two versions.",
    "Create checkpoint",
    commit("Improve the invitation title"),
    (s) => clean(s.repo) && saved(s).split("\n")[0] !== ORIGINAL.split("\n")[0],
    "Main now has its own new commit. Both versions share the original checkpoint.",
  ),
  step(
    3,
    "Bring the two edits together",
    "Combine the alternative ending with the title you just recorded. The edits affect different lines.",
    "Combine warm-ending into main",
    command("git merge warm-ending"),
    (s) =>
      clean(s.repo) &&
      s.repo.commits[tip(s.repo)].parents.length === 2 &&
      saved(s).split("\n")[2] ===
        snapshot(s.repo, s.repo.branches["warm-ending"])[FILE].split("\n")[2],
    "Both edits survived. Git calls this a merge. Its new commit connects the two histories.",
    { branchCompare: true },
  ),
  step(
    4,
    "Let Mara read your work",
    "Mara is across campus and needs a shared copy. Create a simulated GitHub repository: an online home for recorded versions.",
    "Create shared GitHub copy",
    remote("create"),
    (s) => s.repo.server.created,
    "The shared repository is empty. Creating it has not uploaded your local commits.",
  ),
  step(
    4,
    "Connect your local work",
    "Give your local project a connection to that shared repository. Its conventional nickname is origin.",
    "Connect to shared copy",
    command("git remote add origin lantern"),
    (s) => !!s.repo.remotes.origin,
    "The connection is ready. Your commits are still only local.",
  ),
  step(
    4,
    "Send the recorded invitation",
    "Upload your commits so Mara can read them. Uncommitted edits are not uploaded.",
    "Push recorded versions",
    command("git push -u origin main"),
    (s) => s.repo.server.branches.main === tip(s.repo),
    "Your recorded invitation is now on the simulated GitHub server. Push shares commits; saving and committing alone do not.",
    { shared: true },
  ),
  step(
    4,
    "Mara confirms a new date",
    "Mara has checked with the venue. Receive her update on the shared copy.",
    "Receive Mara’s update",
    remote("collaborator"),
    (s) => s.repo.server.branches.main !== tip(s.repo),
    "Mara recorded Saturday on GitHub. Your local document has not changed yet.",
    { shared: true },
  ),
  step(
    4,
    "Look at Mara’s update",
    "Download the shared history before deciding how it fits with your work.",
    "Fetch shared history",
    command("git fetch origin"),
    (s) => s.repo.tracking["origin/main"] === s.repo.server.branches.main,
    "Fetch downloaded the history. It has not changed your working document.",
    { shared: true },
  ),
  step(
    4,
    "Bring Saturday to your desk",
    "Compare the shared invitation below, then bring that recorded version into main. Mara’s revision also restores the original title and ending.",
    "Integrate shared version",
    command("git merge origin/main"),
    (s) =>
      clean(s.repo) &&
      saved(s).includes("Saturday") &&
      tip(s.repo) === s.repo.server.branches.main,
    "Your desk now matches the shared copy. Inspecting before integrating helps you notice every change.",
    { shared: true },
  ),
  step(
    5,
    "Propose a change for review",
    "Before changing the shared invitation again, prepare a separate proposal. Mara will review it first.",
    "Create review branch",
    command("git switch -c invitation-review"),
    (s) => s.repo.current === "invitation-review",
    "A separate branch lets you propose work without immediately changing the shared main version.",
  ),
  step(
    5,
    "Make your proposal",
    "Improve the ending again. Keep the Saturday date and title. This time, Mara will see the proposal before it is combined.",
    "Save document",
    edit,
    (s) =>
      edited(s) &&
      s.repo.working[FILE].split("\n").slice(0, 2).join("\n") ===
        saved(s).split("\n").slice(0, 2).join("\n") &&
      s.repo.working[FILE].split("\n").length === 3,
    "Your proposal is in the working file. Record it before sharing.",
    { editable: true },
  ),
  step(
    5,
    "Select the proposal",
    "Select the invitation for a new recorded version.",
    "Select this document",
    stage,
    recordReady,
    "The proposal is staged.",
  ),
  step(
    5,
    "Record the proposal",
    "Create a commit that Mara can review.",
    "Create checkpoint",
    commit("Propose a welcoming invitation"),
    (s) => clean(s.repo) && tip(s.repo) !== s.repo.branches.main,
    "Your proposal is recorded locally. It has not reached Mara yet.",
  ),
  step(
    5,
    "Share the proposal branch",
    "Push this branch while leaving shared main alone.",
    "Push proposal",
    command("git push -u origin invitation-review"),
    (s) => s.repo.server.branches["invitation-review"] === tip(s.repo),
    "The proposal is on GitHub as a separate branch.",
    { shared: true },
  ),
  step(
    5,
    "Invite a review",
    "Open a pull request: a proposal to combine your branch with main, with space for a conversation.",
    "Open pull request",
    remote("open"),
    (s) => s.repo.prs.length === 1,
    "Your pull request is open. Opening one does not merge the proposal.",
    { shared: true },
  ),
  step(
    5,
    "Hear from your editor",
    "Ask Mara to read the proposal. Her feedback will help you decide what to do next.",
    "Request Mara’s review",
    remote("request"),
    (s) => s.repo.prs[0]?.status === "changes requested",
    "Mara: Please add an accessibility note to README.md, then push the revision and reply. You can continue this conversation in the review practice below.",
    { shared: true },
  ),
  step(
    5,
    "Respond with useful information",
    "Mara needs an accessibility note for readers. Add a sentence explaining accessible attendance to the contributor information.",
    "Save document",
    (s) => {
      if (!/accessib/i.test(s.draft) || s.draft.trim().length < 40)
        throw new Error(
          "Add an accessibility note of at least one full sentence. Include the word accessible or accessibility so the publication check can find it.",
        );
      s.repo = editFile(s.repo, "README.md", s.draft);
    },
    (s) => /accessib/i.test(s.repo.working["README.md"]),
    "The contributor information is saved. Select it to include this response in a new commit.",
    { editable: true, file: "README.md" },
  ),
  step(
    5,
    "Select your response",
    "Choose the contributor information for the next commit.",
    "Select this document",
    command("git add README.md"),
    (s) => s.repo.index["README.md"] === s.repo.working["README.md"],
    "Your accessibility note is staged.",
    { file: "README.md" },
  ),
  step(
    5,
    "Record your response",
    "Record the accessibility note separately from your invitation proposal.",
    "Create checkpoint",
    commit("Explain accessible attendance"),
    (s) => clean(s.repo) && /accessib/i.test(snapshot(s.repo)["README.md"]),
    "Your response is committed locally.",
    { file: "README.md" },
  ),
  step(
    5,
    "Send the revised proposal",
    "Push the new commit so Mara can read your response.",
    "Push revised proposal",
    command("git push origin invitation-review"),
    (s) => s.repo.server.branches["invitation-review"] === tip(s.repo),
    "The pull request now includes your new commit. Review must apply to this latest version.",
    { file: "README.md" },
  ),
  step(
    5,
    "Reply to Mara",
    "Let Mara know the accessibility information is now in the proposal.",
    "Reply: I added accessibility information",
    (s) => {
      s.repo = github(
        s.repo,
        "comment",
        "I added accessibility information for our readers in README.md.",
      );
    },
    (s) => s.repo.prs[0].responded,
    "Your reply is part of the review conversation.",
  ),
  step(
    5,
    "Ask Mara to review the revision",
    "The changed document and reply are both shared. Ask Mara to approve this version.",
    "Request approval",
    remote("approve"),
    (s) => s.repo.prs[0].approved === tip(s.repo),
    "Mara approved this exact revision. Another pushed change would need a fresh approval.",
  ),
  step(
    5,
    "Check the publication details",
    "The magazine checks the Saturday date, contributor information and unresolved edit markers before publishing.",
    "Run publication checks",
    remote("checks"),
    (s) => s.repo.prs[0].checked === tip(s.repo),
    "The publication checks passed. These checks and approval are this magazine’s policy, not universal GitHub requirements.",
  ),
  step(
    5,
    "Accept the reviewed proposal",
    "The latest version is approved and checked. Combine it with main on the shared copy.",
    "Merge reviewed proposal",
    remote("merge"),
    (s) => s.repo.prs[0].status === "merged",
    "Your reviewed invitation is now on shared main. Your computer still needs that update.",
    { shared: true },
  ),
  step(
    5,
    "Return to local main",
    "Switch back to your main branch before bringing down the accepted work.",
    "Switch to main",
    command("git switch main"),
    (s) => s.repo.current === "main",
    "You are on local main. The accepted proposal is still on the shared copy.",
    { shared: true },
  ),
  step(
    5,
    "Bring the accepted work home",
    "Download and integrate the accepted proposal into local main.",
    "Pull accepted version",
    command("git pull origin main"),
    (s) =>
      clean(s.repo) &&
      tip(s.repo) === s.repo.server.branches.main &&
      /accessib/i.test(snapshot(s.repo)["README.md"]),
    "Your computer and shared main agree. The original, alternative and reviewed versions all remain in history.",
    { shared: true },
  ),
];
export function fresh() {
  const repo = emptyRepo();
  repo.initialized = true;
  repo.working = { [FILE]: ORIGINAL };
  return {
    version: 1,
    cursor: 0,
    repo,
    draft: ORIGINAL,
    feedback: "",
    hint: 0,
    undo: null,
  };
}
export function valid(s) {
  try {
    const p = newProgress();
    p.missions[0] = s.repo;
    return (
      s.version === 1 &&
      Number.isInteger(s.cursor) &&
      s.cursor >= 0 &&
      s.cursor <= steps.length &&
      typeof s.draft === "string" &&
      s.draft.length <= 20000 &&
      typeof s.feedback === "string" &&
      Number.isInteger(s.hint) &&
      s.hint >= 0 &&
      s.hint <= 3 &&
      validProgress(p) &&
      (!s.undo || (s.undo.undo === null && valid(s.undo)))
    );
  } catch {
    return false;
  }
}
export function advance(state) {
  const s = structuredClone(state),
    task = steps[s.cursor];
  if (!task) throw new Error("This invitation is ready for review practice.");
  task.action(s);
  if (!task.check(s))
    throw new Error(
      task.editable
        ? "Keep the other lines as requested, and change the sentence or title in this task. Your text is still here to revise."
        : "The document does not yet satisfy this task. Undo or restart this task to try again.",
    );
  s.undo = { ...structuredClone(state), undo: null };
  s.cursor++;
  s.draft = s.repo.working[steps[s.cursor]?.file || FILE] || "";
  s.feedback = task.explanation;
  s.hint = 0;
  return s;
}
export function load(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { state: fresh(), warning: "" };
    const state = JSON.parse(raw);
    if (!valid(state)) throw new Error("Invalid progress");
    return { state, warning: "" };
  } catch {
    return {
      state: fresh(),
      warning:
        "Saved progress could not be read. A fresh invitation is ready. Your other practice saves are untouched.",
    };
  }
}
