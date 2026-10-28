/** The same complete playthrough drives domain tests and real browser controls. */
export async function playChapter(n, a) {
  const run = (c) => a.run(c),
    edit = (p, t) => a.edit(p, t),
    gh = (action, value) => a.github(action, value);
  const save = async (p, t, msg) => {
    await edit(p, t);
    await run(`git add ${p}`);
    await run(`git commit -m "${msg}"`);
  };
  const welcome = (day) =>
    `# The Lantern\nReading night: ${day}\nEveryone belongs here.`;
  const readme =
    "# The Lantern\nA student publication.\nContributors: Mara and you.";
  const review = async () => {
    await gh("request");
    await save(
      "README.md",
      readme + "\nAccessibility: contact our editor for step-free access.",
      "Add an accessibility contact",
    );
    await run("git push");
    await gh(
      "comment",
      "Added an accessibility contact and explained the step-free access.",
    );
  };
  const finishReview = async () => {
    await gh("checks");
    await gh("approve");
    await gh("merge");
    await run("git switch main");
    await run("git pull origin main");
  };
  switch (n) {
    case 0:
      await save(
        "welcome.md",
        welcome("Friday") + "\nBring a friend.",
        "Make the invitation warmer",
      );
      await a.inspect("0000001");
      break;
    case 1:
      await run("git init");
      await run("git diff");
      await run("git add welcome.md");
      await run('git commit -m "Introduce our reading"');
      await run("git add README.md");
      await run('git commit -m "Document our publication"');
      await run("git log");
      break;
    case 2:
      await a.inspect("0000001");
      await run("git restore --source=0000001 welcome.md");
      await run("git add welcome.md");
      await run('git commit -m "Restore our welcome"');
      break;
    case 3:
      await run("git switch -c feature/welcome");
      await save("welcome.md", welcome("Saturday"), "Confirm Saturday");
      await run("git switch main");
      await save(
        "README.md",
        readme + "\nSubmissions are welcome.",
        "Explain how to contribute",
      );
      await run("git merge feature/welcome");
      break;
    case 4:
      await gh("create");
      await run("git remote add origin lantern");
      await save(
        "README.md",
        readme + "\nA new issue is coming.",
        "Announce the new issue",
      );
      await run("git push -u origin main");
      await gh("collaborator");
      await run("git fetch origin");
      await run("git merge origin/main");
      break;
    case 5:
      await run("git switch -c feature/reading");
      await save("welcome.md", welcome("Saturday"), "Confirm the reading date");
      await run("git push -u origin feature/reading");
      await gh("open");
      await review();
      await finishReview();
      break;
    case 6:
      await run("git merge venue");
      await save("welcome.md", welcome("Saturday"), "Reconcile the venue date");
      break;
    case 7:
      await run("git revert 0000002");
      await run("git reset --soft HEAD~1");
      await run("git reflog");
      await run("git reset --soft 0000003");
      break;
    case 8:
      await edit(
        "README.md",
        readme + "\nA private draft for our contributors.",
      );
      await run("git stash");
      await run("git switch -c feature/toolkit");
      await run("git stash pop");
      await run("git add README.md");
      await run('git commit -m "Draft contribution guidance"');
      await run("git switch main");
      await save(
        "editorial.md",
        "Proofread, check the venue, then publish.",
        "Add a production checklist",
      );
      await run("git switch feature/toolkit");
      await run("git rebase main");
      await run("git cherry-pick copydesk");
      await run("git branch -D copydesk");
      await edit(".gitignore", "scratch.tmp");
      await edit("scratch.tmp", "Private scratch notes");
      await run("git add .");
      await run('git commit -m "Ignore temporary notes"');
      await run("git tag issue-1");
      await run("git checkout HEAD~1");
      await run("git switch feature/toolkit");
      break;
    case 9:
      await gh("fork");
      await gh(
        "issue",
        "Document accessible ways to contribute to the publication",
      );
      await run("git remote add upstream lantern");
      await gh("collaborator");
      await run("git fetch upstream");
      await run("git merge upstream/main");
      await run("git switch -c feature/contributing");
      await edit("CODEOWNERS", "* @mara");
      await edit(
        "README.md",
        readme +
          "\nContributing: open an issue and explain your proposed change.",
      );
      await run("git add .");
      await run(
        'git commit -m "Document contribution etiquette and ownership"',
      );
      await run("git push -u origin feature/contributing");
      break;
    case 10:
      await run("git clone lantern");
      await run("git log");
      await gh(
        "issue",
        "Clarify the reading date and provide accessibility details",
      );
      await run("git switch -c issue-1/reading");
      await edit("welcome.md", welcome("Sunday"));
      await edit(
        "README.md",
        readme + "\nOur next reading will welcome all students.",
      );
      await run("git add .");
      await run('git commit -m "Prepare the student reading invitation"');
      await run("git push -u origin issue-1/reading");
      await gh("open");
      await review();
      await gh("collaborator");
      await run("git fetch origin");
      await run("git merge origin/main");
      await save(
        "welcome.md",
        welcome("Saturday"),
        "Reconcile the invitation with the venue",
      );
      await run("git push");
      await finishReview();
      await run("git status");
      break;
  }
}
