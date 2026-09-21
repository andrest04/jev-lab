// Example-specific interactions that go beyond the generic result view.

import { h } from "./dom.mjs";
import { t } from "./i18n-state.mjs";
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
    // These labels duplicate PHISH.decide in lib/examples.mjs; T4 may deduplicate them.
    const label = t(`extras.phish.verdict.${verdict}`);
    const tone = verdict === "suspicious" ? "confirm" : "act";
    verdictBox.replaceChildren(tierChip(tone), h("h3", { class: "decision-title" }, label));
    composite.replaceChildren(
      h("span", { class: "label" }, t("extras.phish.composite", { value: fixed(value), threshold: fixed(threshold) })),
      h(
        "div",
        { class: "scale", role: "img", "aria-label": t("extras.phish.compositeAria", { value: fixed(value) }) },
        h("div", { class: "fill", style: { width: `${value * 100}%` } }),
        h("div", { class: "mark", style: { left: `${threshold * 100}%` } }),
        h("span", { class: "tick tick-0", style: { left: "0" } }, "0"),
        h("span", { class: "tick tick-1", style: { left: "100%" } }, "1"),
      ),
    );
    counter.textContent = t("extras.phish.counter", { changes });
    facts.replaceChildren(
      ...Object.entries(signals).flatMap(([id, p]) => [
        h("dt", null, id),
        h("dd", null, t("extras.phish.fact", { p: fixed(p), weight: fixed(weights[id]), product: fixed(p * weights[id]) })),
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
    { class: "decision", "aria-label": t("results.decision.aria") },
    verdictBox,
    composite,
    facts,
    h(
      "div",
      { class: "policy" },
      h("p", { class: "label" }, t("extras.phish.policy")),
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
    h("summary", null, t("extras.find.raw", { n: ranked.length })),
    h("div", { class: "instruments" }, Object.entries(answers).map(([id, answer]) => renderAnswer({ id, question: questions[id], answer, policy }))),
  );
  return h("div", { class: "panel" }, list, raw);
}

export const EXTRAS = {
  "phish-check": { decision: phishDecision },
  "semantic-find": { answers: findAnswers },
};
