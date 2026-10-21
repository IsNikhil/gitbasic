export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
export const button = (label, action, attrs = "", style = "") =>
  `<button type="button" data-action="${action}" class="${style}" ${attrs}>${label}</button>`;
export function comparison(
  before,
  after,
  left = "Current manuscript",
  right = "Proposed manuscript",
) {
  const a = before.split("\n"),
    b = after.split("\n");
  const lines = (values, other, mark) =>
    values
      .map(
        (line, i) =>
          `<p class="${line === other[i] ? "" : mark === "−" ? "removed" : "added"}"><span class="line-sign" aria-hidden="true">${line === other[i] ? "·" : mark}</span>${line !== other[i] ? `<span class="sr-only">${mark === "−" ? "Removed: " : "Added: "}</span>` : ""}${esc(line) || "&nbsp;"}</p>`,
      )
      .join("");
  return `<div class="comparison"><section><h3>${esc(left)}</h3><div class="diff-text">${lines(a, b, "−")}</div></section><section><h3>${esc(right)}</h3><div class="diff-text">${lines(b, a, "+")}</div></section></div>`;
}
