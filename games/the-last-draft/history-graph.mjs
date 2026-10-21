import { esc } from "./view-helpers.mjs";

/** Render real commit ancestry; branch labels below identify the current tips.
 * @param {import('./types.js').Repository} repo
 */
export function historyGraph(repo) {
  const revisions = Object.values(repo.commits);
  const lanes = new Map();
  let nextLane = 0;
  for (const tip of Object.values(repo.branches)) {
    if (lanes.has(tip)) continue;
    let id = tip;
    const lane = nextLane++;
    while (id && !lanes.has(id)) {
      lanes.set(id, lane);
      id = repo.commits[id].parents[0];
    }
  }
  for (const revision of revisions)
    if (!lanes.has(revision.id)) lanes.set(revision.id, nextLane++);
  const width = Math.max(280, revisions.length * 64),
    height = Math.max(100, nextLane * 60 + 35);
  const points = new Map(
    revisions.map((c, i) => [
      c.id,
      { x: 30 + i * 64, y: 32 + lanes.get(c.id) * 60 },
    ]),
  );
  const paths = revisions
    .flatMap((c) =>
      c.parents.map((parent) => {
        const a = points.get(parent),
          b = points.get(c.id);
        return `<path d="M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}" class="${a.y === b.y ? "same-history" : "joining-history"}"/>`;
      }),
    )
    .join("");
  const nodes = revisions
    .map((c) => {
      const p = points.get(c.id);
      return `<g><circle cx="${p.x}" cy="${p.y}" r="${c.id === repo.branches[repo.current] ? 7 : 5}"/><text x="${p.x}" y="${p.y + 22}" text-anchor="middle">${esc(c.id)}</text></g>`;
    })
    .join("");
  return `<figure class="history-graph"><div class="graph-scroll" tabindex="0" role="region" aria-label="Scrollable revision ancestry diagram"><svg viewBox="0 0 ${width} ${height}" style="min-width:${width}px" role="img" aria-label="Saved revisions from oldest on the left to newest on the right. Lines connect each revision to its parents; split paths show experiments, joined paths show merges.">${paths}${nodes}</svg></div><figcaption>One dot, one saved revision. Paths split for experiments and join when changes combine. The larger dot is your current version.</figcaption></figure>`;
}
