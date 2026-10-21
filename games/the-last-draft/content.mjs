export const manuscripts = {
  story: {
    title: "The Ferry at Low Water",
    author: "Elias Finch",
    kind: "Short fiction",
  },
  poem: {
    title: "Inventory of an Empty House",
    author: "June Mercer",
    kind: "Poetry",
  },
  notes: {
    title: "A Note to Our Readers",
    author: "Kit Vale",
    kind: "Editorial",
  },
};
export const endings = {
  original:
    "At dawn, Ada left the key beneath the blue cup. Across the river, a kitchen light came on. She had not been forgiven. She had been expected.",
  wrong:
    "Ada sold the ferry, bought a train ticket, and never looked across the river again. It was, she decided, an efficient ending.",
  early:
    "The ferry bell rang once. Ada stayed on the bank until the sound had nowhere left to go.",
};
export const story = (ending) =>
  `The ferry had stopped running on the day Ada learned to swim. For twenty years she had called this a coincidence.\nHer brother’s letter arrived without a stamp. Someone had carried it across the bridge and thought better of knocking. Inside was a key, a water stain, and the word Tuesday.\n${ending}`;
export const poem =
  "We counted what the house had kept.\nA cup waited on the table.\nThe window held the shape of rain.";
export const clarity =
  "We counted what the house had kept.\nAn empty cup stood on the kitchen table.\nThe window held the shape of rain.";
export const voice =
  "We counted what the house had kept.\nThe cup kept its small, white vigil on the table.\nThe window remembered rain by touch.";
export const note =
  "A Note to Our Readers\nOur autumn reading takes place on 14 November, in the library after sunset.\nBring a poem, or simply bring your attention. Both are forms of generosity.\nBy Kit Vale, community editor.";
export const revisedNote = note.replace(
  "Both are forms of generosity.",
  "There will be a chair for either.",
);
export const chapters = [
  {
    title: "Which Draft Is Final?",
    time: "Monday · 9:12 AM",
    skill: "History & commits",
    sender: "Mara Bell",
    role: "Editor-in-chief",
    initials: "MB",
    subject: "The ending with the blue cup",
    message:
      "Welcome to The Last Draft. Your desk is the one beneath the leak. Elias has sent three “final” endings. I want the one where Ada leaves a key beneath a blue cup: an invitation, not a tidy escape. Find it in the saved history, compare it with today’s manuscript, and bring back only this story. Leave a note future-you can understand. Future-you is overworked.",
    reply:
      "Elias Finch: “I thought efficient was a compliment. Never mind. Keep the cup.”",
    objectives: [
      "Read Mara’s message",
      "Inspect and compare the earlier ending",
      "Restore the blue-cup ending and save a descriptive revision",
    ],
    hints: [
      "An overwritten ending may still exist in an earlier saved draft.",
      "Open Revision history, then compare the revision that mentions the blue cup.",
      "Inspect “Keep the invitation beneath the blue cup”, restore it, then save with a note such as “Restore Ada’s open invitation ending”.",
    ],
    lesson:
      "You recovered a manuscript without erasing its history. A Git commit is a recorded snapshot of tracked files, with an author, message and parent revision. Git only records changes when you commit them; it does not automatically remember every keystroke.",
    conclusion:
      "Mara reads the ending twice. “Good. The reader gets to cross the river themselves.” For the first time all morning, no one attaches a file called FINAL.",
  },
  {
    title: "The Two Endings",
    time: "Tuesday · 2:40 PM",
    skill: "Branches & comparison",
    sender: "Elias Finch",
    role: "Novelist, professionally undecided",
    initials: "EF",
    subject: "A small, catastrophic possibility",
    message:
      "What if Ada arrives too late? I want to try a tragic ending. Please don’t sacrifice the blue cup to my curiosity. Make an alternate version, rewrite the last paragraph, save it, then return to main and compare them. Keep the first two paragraphs intact. I reserve the right to prefer both.",
    reply: "Mara Bell: “Experiment away. The original stays on my desk.”",
    objectives: [
      "Read Elias’s message",
      "Create and save a distinct alternate ending",
      "Return to main and compare both preserved endings",
    ],
    hints: [
      "Two endings can share a beginning without sharing a future.",
      "Use Alternate versions to create a branch, then edit and save the story.",
      "Create “after-the-river”, replace only the final paragraph, save, switch to main, then compare that branch.",
    ],
    lesson:
      "Your alternate version is a branch: a movable name pointing to a commit. Both branches share their earlier history. New commits advance only the current branch. Switching branches changes the files you see; it does not combine their endings.",
    conclusion:
      "Elias pins both endings above his desk. “Now I can be indecisive with an audit trail.” Mara declines to put that on the masthead.",
  },
  {
    title: "The Editorial War",
    time: "Wednesday · 4:05 PM",
    skill: "Merges & conflicts",
    sender: "June Mercer",
    role: "Poetry editor",
    initials: "JM",
    subject: "The cup is not a furniture inventory",
    message:
      "Owen made the cup’s location clearer. I gave it a little dignity. We edited the same line independently. First compare my “voice” version with main. Combine “copydesk” to bring in a separate editorial note, then combine “voice”. Keep the cup on the table; choose clarity, music, or a defensible blend. Preserve my window’s new line, too. A disagreement is not a corrupted file.",
    reply:
      "Owen Reed: “I support dignity. I would also like to know where the cup is.”",
    objectives: [
      "Read the brief and compare the voice version",
      "Combine the compatible copydesk changes",
      "Resolve the overlapping passage and save both histories",
    ],
    hints: [
      "Changes to different passages can coexist. Two replacements of one passage need a decision.",
      "Compare voice; combine copydesk first. Combining voice then opens a conflict editor.",
      "In the conflict editor keep a cup on the table, and keep “The window remembered rain by touch.” Save your editorial resolution.",
    ],
    lesson:
      "A merge compares two histories with their common ancestor. Compatible changes combine automatically. Overlapping edits need a human resolution. This merge commit has two parents, preserving both editors’ histories. Git does not judge literary quality.",
    conclusion:
      "June and Owen share a pencil. Neither calls it a compromise. In the margins, the house becomes a place someone might actually have lived.",
  },
  {
    title: "The Shared Magazine",
    time: "Thursday · 11:18 AM",
    skill: "Pull requests & review",
    sender: "Kit Vale",
    role: "Community editor, many browser tabs",
    initials: "KV",
    subject: "A contribution from the other coast",
    message:
      "I’ve submitted a warmer invitation for our reading. It may have inherited last year’s date. The event is 14 November; please compare my contribution with main, leave a useful comment requesting a correction, then inspect my revised submission before approving and combining it. My calendar contains three Novembers. Only one of them is useful.",
    reply:
      "Mara Bell: “The shared workspace keeps proposals separate until we accept them. Let’s keep it that way.”",
    objectives: [
      "Read the message and inspect the proposal",
      "Request a useful correction and receive a revised submission",
      "Inspect, approve and merge the corrected contribution",
    ],
    hints: [
      "A proposal is a conversation about changes; it has not changed main yet.",
      "Open Editorial review and compare Kit’s proposed invitation. Request changes before approving.",
      "Mention the reading date in a four-word-or-longer review. Request changes, receive Kit’s revision, inspect it, approve it with a comment, then combine the approved work.",
    ],
    lesson:
      "Git is the version-control tool. GitHub hosts remote repositories and adds pull requests, discussion and reviews. A pull request proposes merging one branch into another; it is not the merge itself. Our magazine requires approval of the current contribution. Real projects choose their own review rules.",
    conclusion:
      "A correct date, a warmer invitation, one shared record of the conversation. Kit sends a photograph of the ocean. No manuscript is attached.",
  },
  {
    title: "The Midnight Edition",
    time: "Friday · 11:47 PM",
    skill: "The complete editorial workflow",
    sender: "Mara Bell",
    role: "Editor-in-chief, still here",
    initials: "MB",
    subject: "Thirteen minutes. No pressure.",
    message:
      "The blue-cup ending has vanished again. Recover it on a new safety branch, save it, and bring that branch into main. June’s “voice” revision also needs combining; keep the cup on the table and the window remembering rain. Kit has one last invitation correction: the event is still 14 November. Review it properly. Then I’ll approve the exact issue we publish. Check the bylines before you ask. Deadlines do not exempt us from paying attention.",
    reply:
      "Elias Finch: “If it helps, I have decided the magazine should have a happy ending.”",
    objectives: [
      "Recover the ending on a safety branch and merge it into main",
      "Resolve June’s editorial conflict",
      "Review, correct, approve and merge Kit’s contribution",
      "Repair the late complication, obtain approval and publish",
    ],
    hints: [
      "Use the earlier chapters as a set of tools, not a fixed sequence of clicks.",
      "History recovers the ending; branches protect the experiment; review protects the contribution. The final issue must contain all three.",
      "Restore the blue-cup revision on a new branch and save, return to main and combine it. Resolve voice, finish Kit’s review, then undo the late byline removal using history. Request final approval and publish.",
    ],
    lesson:
      "A repository holds a project’s tracked files and revision history. You used commits to recover work, branches to experiment, merges to integrate, and reviews to collaborate. Revert creates a new commit that undoes a change while preserving the original record. Publication here is a snapshot of the exact approved issue.",
    conclusion:
      "At 11:59, the printer wakes. Ada crosses no river she does not choose. The cup keeps its vigil. Kit’s invitation has the right date and, finally, a byline. Mara sets a fresh stack of paper on your desk. “Next issue?” Every story has a history. This one has yours.",
  },
];
/** @type {[string, number, string][]} */
export const commands = [
  [
    "git status",
    0,
    "Inspect changed, staged and untracked files. It does not save or upload anything.",
  ],
  [
    "git add story.txt",
    0,
    "Stage the current contents of a file for the next commit. Later edits need to be staged again.",
  ],
  [
    'git commit -m "Restore the invitation ending"',
    0,
    "Record the staged snapshot locally. Our Save Draft shortcut stages all changed manuscripts and commits them together; real Git separates these steps.",
  ],
  [
    "git log",
    0,
    "Read commit history, including authors and revision messages.",
  ],
  [
    "git diff",
    0,
    "Compare unstaged changes with the staging area. git diff --staged compares staged content with the last commit; git diff main alternate compares branch tips.",
  ],
  [
    "git branch",
    1,
    "List local branch names. A branch points to a commit; creating one does not duplicate every file.",
  ],
  [
    "git switch -c alternate",
    1,
    "Create a branch at your current commit and switch to it.",
  ],
  [
    "git switch main",
    1,
    "Switch to main. Git protects changes that would be overwritten. This game requires a clean working copy for every switch.",
  ],
  [
    "git merge alternate",
    2,
    "Integrate another branch into the current one. Git may fast-forward, make a merge commit, or pause for conflicts. This game records merges with two parents for visible ancestry. After a conflict, edit, stage the resolutions, then commit.",
  ],
  [
    "git clone <repository-url>",
    3,
    "Copy a remote repository, its history and a working checkout onto your computer.",
  ],
  [
    "git fetch",
    3,
    "Download remote commits and update remote-tracking references without integrating them into your current branch.",
  ],
  [
    "git pull",
    3,
    "Fetch, then integrate the remote branch into your current branch using merge or rebase according to configuration. Conflicts are possible.",
  ],
  [
    "git push",
    3,
    "Send local commits and branch updates to a remote where you have permission. A local commit alone is not an upload.",
  ],
  [
    "git revert <commit>",
    4,
    "Apply the inverse of an earlier change in a new commit. Later work is preserved where compatible; overlaps can conflict. Reverting is different from copying an entire old file back.",
  ],
];
