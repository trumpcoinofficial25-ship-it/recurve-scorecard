import { RULESET, compareQualificationScorecards, validateScorecard } from "./scorecard-core.mjs";
import { createResultState } from "./result-state.mjs";

const form = document.querySelector("#scorecard-form");
const results = document.querySelector("#results");
const exampleButton = document.querySelector("#load-example");
const clearButton = document.querySelector("#clear-form");
const resultState = createResultState();

const EXAMPLE_A = [
  "X 10 10 9 9 8",
  "X X 10 9 8 8",
  "10 10 9 9 8 7",
  "X 10 9 9 8 8",
  "10 10 10 9 9 9",
  "X 10 9 8 8 7",
  "10 10 9 9 9 8",
  "X X 10 10 9 8",
  "10 9 9 8 8 7",
  "X 10 10 9 9 8",
  "10 10 9 8 8 8",
  "X 10 9 9 8 M",
].join("\n");

const EXAMPLE_B = [
  "X 10 10 9 9 8",
  "X 10 10 9 8 8",
  "X 10 9 9 8 8",
  "10 10 10 9 9 8",
  "X 10 10 9 9 9",
  "10 10 9 8 8 7",
  "X 10 9 9 9 8",
  "X 10 10 10 9 8",
  "10 9 9 8 8 7",
  "X 10 10 9 9 8",
  "10 10 9 8 8 8",
  "X 10 9 9 8 M",
].join("\n");

function readCard(id) {
  return validateScorecard({
    text: document.querySelector(`#arrows-${id}`).value,
    declaredTotal: document.querySelector(`#declared-total-${id}`).value,
    declaredTens: document.querySelector(`#declared-tens-${id}`).value,
    declaredXs: document.querySelector(`#declared-xs-${id}`).value,
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderErrors(card) {
  if (card.errors.length === 0) return "";
  return `<ul class="error-list">${card.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`;
}

function renderEndRows(card) {
  if (card.ends.length === 0) return '<p class="muted">No non-empty ends entered.</p>';
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>End</th><th>Arrows</th><th>End total</th><th>Running</th></tr></thead>
        <tbody>
          ${card.ends
            .map(
              (end) => `<tr class="${end.errors.length ? "row-error" : ""}">
                <td>${end.end}</td>
                <td>${escapeHtml(end.tokens.join(" "))}</td>
                <td>${end.score}</td>
                <td>${end.runningTotal}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function renderCard(label, card) {
  const declarationNote = card.declarationsComplete
    ? "All three declared fields were checked."
    : `Not checked because blank: ${card.missingDeclarations.join(", ") || "none"}.`;
  const statusLabel = card.valid ? (card.declarationsComplete ? "VERIFIED" : "ARROWS PASS") : "CHECK";
  return `
    <section class="result-card">
      <div class="result-heading">
        <h3>Scorecard ${label}</h3>
        <span class="status ${card.valid ? "pass" : "fail"}">${statusLabel}</span>
      </div>
      <div class="metrics">
        <div><span>Total</span><strong>${card.total}</strong></div>
        <div><span>Arrows</span><strong>${card.arrowCount}/${RULESET.arrowCount}</strong></div>
        <div><span>10s incl. X</span><strong>${card.tensIncludingXs}</strong></div>
        <div><span>Xs</span><strong>${card.xs}</strong></div>
        <div><span>Misses</span><strong>${card.misses}</strong></div>
      </div>
      ${renderErrors(card)}
      <p class="declaration-note">${escapeHtml(declarationNote)}</p>
      ${renderEndRows(card)}
    </section>`;
}

function renderComparison(comparison) {
  const label = comparison.winner ? `Scorecard ${comparison.winner}` : comparison.status.replaceAll("_", " ");
  return `
    <section class="comparison ${comparison.status.toLowerCase()}">
      <p class="eyebrow">Comparison</p>
      <h3>${escapeHtml(label)}</h3>
      <p>${escapeHtml(comparison.reason)}</p>
    </section>`;
}

function invalidateRenderedResults() {
  resultState.markInputChanged();
  results.replaceChildren();
  results.hidden = true;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const left = readCard("a");
  const right = readCard("b");
  const context = document.querySelector("#tie-context").value;
  const comparison = compareQualificationScorecards(left, right, context);

  resultState.markSubmitted();
  results.innerHTML = `${renderComparison(comparison)}${renderCard("A", left)}${renderCard("B", right)}`;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
});

form.addEventListener("input", invalidateRenderedResults);
form.addEventListener("change", invalidateRenderedResults);

exampleButton.addEventListener("click", () => {
  document.querySelector("#arrows-a").value = EXAMPLE_A;
  document.querySelector("#arrows-b").value = EXAMPLE_B;
  ["a", "b"].forEach((id) => {
    document.querySelector(`#declared-total-${id}`).value = "";
    document.querySelector(`#declared-tens-${id}`).value = "";
    document.querySelector(`#declared-xs-${id}`).value = "";
  });
  document.querySelector("#tie-context").value = "ordinary";
  invalidateRenderedResults();
});

clearButton.addEventListener("click", () => {
  form.reset();
  resultState.reset();
  results.replaceChildren();
  results.hidden = true;
});
