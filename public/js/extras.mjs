// Example-specific interactions that go beyond the generic result view.

import { h } from "./dom.mjs";
import { PHISH_DEFAULTS, phishVerdict, rankLines } from "/lib/examples.mjs";
import { renderAnswer, tierChip } from "./viz.mjs";

const fixed = (n, d = 2) => Number(n).toFixed(d);

/**
 * Phish check: the model answered once. Weights and threshold are code, so moving
 * them recomputes the verdict for free. A counter makes that visible.
 */
export function phishDecision({ answers }) {
  const signals = Object.fromEntries(Object.entries(answers).map(([id, a]) => [id, a.noul]));
  const weights = { ...PHISH_DEFAULTS.weights };
  let threshold = PHISH_DEFAULTS.threshold;
  let changes = 0;

  const verdictBox = h("div", { class: "decision-head" });
  const composite = h("div", { class: "composite" });
  const counter = h("p", { class: "panel-note", "aria-live": "polite" });
  const facts = h("dl", { class: "kv" });

  function render() {
    const { value, verdict } = phishVerdict(signals, weights, threshold);
    const label = { phishing: "Likely phishing: quarantine", suspicious: "Suspicious: warn the reader", safe: "Looks legitimate: deliver" }[verdict];
    const tone = verdict === "suspicious" ? "confirm" : "act";
    verdictBox.replaceChildren(tierChip(tone), h("h3", { class: "decision-title" }, label));
    composite.replaceChildren(
      h("span", { class: "label" }, `Composite score ${fixed(value)} vs threshold ${fixed(threshold)}`),
      h(
        "div",
        { class: "scale", role: "img", "aria-label": `Composite ${fixed(value)}` },
        h("div", { class: "fill", style: { width: `${value * 100}%` } }),
        h("div", { class: "mark", style: { left: `${threshold * 100}%` } }),
        h("span", { class: "tick tick-0", style: { left: "0" } }, "0"),
        h("span", { class: "tick tick-1", style: { left: "100%" } }, "1"),
      ),
    );
    counter.textContent = `Model calls: 1. Policy changes since: ${changes}. Every change was free.`;
    facts.replaceChildren(
      ...Object.entries(signals).flatMap(([id, p]) => [
        h("dt", null, id),
        h("dd", null, `${fixed(p)} × weight ${fixed(weights[id])} = ${fixed(p * weights[id])}`),
      ]),
    );
  }

  const slider = (id, label, get, set, max = 1) => {
    const out = h("output", null, fixed(get()));
    const input = h("input", { id: `phish-${id}`, type: "range", min: 0, max, step: 0.05, value: get() });
    input.addEventListener("input", () => {
      set(Number(input.value));
      out.textContent = fixed(get());
      changes += 1;
      render();
    });
    return h("label", { class: "policy-row", for: `phish-${id}` }, h("span", null, label), input, out);
  };

  render();
  return h(
    "section",
    { class: "decision", "aria-label": "What your code decides" },
    verdictBox,
    composite,
    facts,
    h(
      "div",
      { class: "policy" },
      h("p", { class: "label" }, "Your policy: weights and threshold"),
      Object.keys(weights).map((id) => slider(id, id, () => weights[id], (v) => (weights[id] = v))),
      slider("threshold", "threshold", () => threshold, (v) => (threshold = v)),
      counter,
    ),
  );
}

/** Semantic find: a ranked list, with the raw answers one click away. */
export function findAnswers({ answers, questions, state, policy }) {
  const ranked = rankLines(answers);
  const list = h(
    "div",
    { class: "ranked" },
    ranked.map((item, i) =>
      h(
        "div",
        { class: `rank-row${i === 0 ? " is-top" : ""}` },
        h("span", { class: "rank-id" }, item.id),
        h("div", null, h("span", { class: "rank-text" }, state.lines[item.id]), h("div", { class: "rank-bar" }, h("i", { style: { width: `${(item.score / 3) * 100}%` } }))),
        h("span", { class: "rank-score" }, fixed(item.score)),
      ),
    ),
  );
  const raw = h(
    "details",
    null,
    h("summary", null, `Show the ${ranked.length} raw score answers`),
    h("div", { class: "instruments" }, Object.entries(answers).map(([id, answer]) => renderAnswer({ id, question: questions[id], answer, policy }))),
  );
  return h("div", { class: "panel" }, list, raw);
}

export const EXTRAS = {
  "phish-check": { decision: phishDecision },
  "semantic-find": { answers: findAnswers },
};
