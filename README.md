# Git from zero

A static beginner guide to Git and GitHub, with **The Last Draft**, a writing game at `games/the-last-draft/`.

## Run locally

Serve this directory over HTTP; the site has no production build step:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/` for the guide or `http://localhost:8000/games/the-last-draft/` for the game. Relative links also work under a project prefix such as `/gitbasic/`.

## The Last Draft

The default game opens with one invitation at a student publication. The learner selects its contents for the next recorded version, creates a commit, changes the ending, compares it with the recorded version, and restores it. Later tasks introduce an alternate branch, a compatible merge, a shared GitHub copy, and a reviewed proposal. The screen shows only the action needed for the current writing problem. Each action changes the simulated repository and advancement checks that state.

Typing keeps an unfinished editor buffer. **Save document** changes the working file; **Select this document** stages its current contents; **Create checkpoint** commits the staged contents; **Push** sends commits to the simulated shared copy. These are separate operations. History appears after the first commit, branch ancestry after branching, and the shared copy when Mara needs to collaborate. Three levels of contextual hints and optional progress/recovery controls are available. Advanced exercises remain at `?practice=story` and `practical.html?practice=commands` after onboarding; existing saves for those exercises remain separate.

The guided simulation saves under `the-last-draft-guided-v1` in local browser storage. It retains unfinished text, the current task, the simulated repository and one undo snapshot. Restart requires confirmation and clears only guided progress. Invalid actions keep the previous state and allow another attempt. Corrupt saves and unavailable storage are explained in the page. Clearing browser data removes progress, and simultaneous tabs are not synchronized.

The older five-chapter editorial campaign and eleven-assignment command campaign are retained as optional practice. Their existing simulation engines and storage keys remain separate. No real repository or GitHub account is changed.

## Development checks

Node.js 22 or newer is recommended. Install development dependencies with `npm ci`, then run:

```sh
npm test
npm run check
npm run typecheck
npm run lint
npm run format
npm run test:browser
```

The browser script uses Playwright Chromium. Install it with `npx playwright install chromium`, or set `CHROMIUM_PATH` to an existing compatible Chrome executable. The browser tests play the guided flow and both retained campaigns at desktop and mobile sizes, exercise navigation and recovery, and capture screenshots in ignored `test-results/redesign/`.

The game uses the guide's shared typography, color, spacing, card and navigation tokens; game additions are scoped to its own routes. The homepage's existing activities and styles are unaffected. Browser walkthroughs and automated accessibility checks are not genuine novice-user validation. The guide has pre-existing contrast and inline-link accessibility findings; the game audits require zero violations. The simulator's merge behavior is deliberately conservative, and its GitHub copy is local to the browser.
