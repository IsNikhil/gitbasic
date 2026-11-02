# The Last Draft: guided invitation

Both `./` and `practical.html` now open the same saved beginner experience. Serve the repository with a static HTTP server; no build, account or backend is required. Relative links work under a project prefix.

The page imports the guide's actual `styles.css` for system typography, neutral light/dark surfaces, blue links, navigation, spacing tokens, pill buttons, card radius and shadows. `guided.css` contains only scoped game layout additions. The longer exercises also use site tokens rather than the previous cream/green/serif theme. The homepage, guide script and shared stylesheet are unchanged by this rework.

## Learning sequence

The opening shows one short invitation, one writing problem and one primary action. The learner selects the file contents (stages), then records a checkpoint (commits). Only then do history and an editable document appear. They rewrite, save the working file, compare, restore, create an alternative branch, make independent edits and merge them. GitHub appears when Mara needs a shared copy. Create/connect/push/fetch/integrate remain separate operations. Review follows sharing: the learner proposes, responds to feedback with a new file and commit, pushes, obtains current approval and checks, merges online, then pulls locally.

Every primary action runs an existing `git-engine.mjs` operation and checks the resulting state before advancing. The engine itself is unchanged. Typing persists an unfinished editor buffer; Save document updates the working file, staging copies selected contents into the index, committing records the index, and pushing uploads commits. The local repository is already initialized when the guided story begins. Button-generated commit messages describe each task.

Hints escalate within one small area. History is optional after the first commit; the ancestry diagram appears only after branches are introduced. Command practice and the sandbox are linked under recovery options after the first collaboration task and at the end. Existing players can resume earlier saves from the same options immediately:

- `./?practice=story`: retained five-chapter editorial campaign.
- `practical.html?practice=commands`: retained eleven-chapter command campaign and sandbox.

Those are separate exercises with their existing saves and progression. Guided progress does not silently overwrite or unlock their campaigns. Conflicts, reset/reflog, stash, rebase, forks and other advanced work remain there.

## Recovery and storage

`the-last-draft-guided-v1` keeps the repository, current task, unfinished text, hint and one undo snapshot. Undo last action restores the previous task and repository, including an experiment replaced by restore. Reset unsaved text returns to the current working file. Restart requires confirmation and touches only guided progress. Invalid actions leave the repository and typed text unchanged. Invalid saves produce a warning and a fresh invitation. Storage failures allow play in the current tab with a warning. Saves are device-local; simultaneous tabs are not synchronized.

## Verification

With the repository's development dependencies installed:

```sh
npm test
npm run check
npm run typecheck
npm run lint
npm run format
node scripts/test-game-browsers.mjs
```

For an existing Chrome installation set `CHROMIUM_PATH` to its executable. The browser runner includes the new guided walkthrough, the preserved story suite at its explicit practice route, and the command campaign suite. `tests/browser.mjs` and the other pre-existing staged setup files were left intact; the new runner is the entry point for all redesigned routes.

The guided suite performs all 37 state-changing actions at desktop and mobile sizes, with axe audits, unchanged-click rejection, three hints, text persistence, undo, cancel/confirm restart, corrupt/blocked storage, prefix hosting and navigation. It checks 320px and 768px layouts as well as 390px and 1440px, and dark/reduced-motion mode. Engine/campaign tests cover conflict resolution and stale approvals as well as the guided state changes. Screenshots are in ignored `test-results/redesign/`.

Visual review compared the homepage, repository and commit sections with the game at desktop/mobile sizes. The opening has one document and its first action visible at 390px. The guide's pre-existing accessibility findings are reported separately; the redesigned game audits require zero violations.

These are automated checks and a browser walkthrough, not validation with novice students. The structured guided tasks deliberately constrain which lines to edit. The existing conservative merge simulator, local-only persistence and absence of real GitHub networking remain limitations. Instructor observation with actual beginners is still needed to assess learning and pacing.
