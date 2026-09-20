// Shared result pieces: run banner, instrument list, decision panel, policy sliders.

import { h } from "./dom.mjs";
import { renderAnswer, tierChip } from "./viz.mjs";
import { costUsd, formatUsd } from "/lib/cost.mjs";

const fixed = (n, d = 2) => Number(n).toFixed(d);

/** @param {{ mode: string, response: any, latencyMs: number }} run */
export function runBanner(run) {
  if (run.mode === "live") {
    const usage = run.response.usage ?? {};
    return h(
      "div",
      { class: "banner banner-live", role: "status" },
      h("strong", null, `Live answer from ${run.response.model}`),
      h(
        "span",
        null,
        `${run.latencyMs} ms · ${usage.input_tokens ?? "?"} input tokens · about ${formatUsd(costUsd(usage))} (output is free)`,
      ),
    );
  }
  if (run.mode === "sample") {
    return h(
      "div",
      { class: "banner banner-sample", role: "status" },
      h("strong", null, "Hand-written sample, not model output"),
      h("span", null, "These answers illustrate the response shape for this preset. Add TYPESAFE_API_KEY and restart the server to run Jev on any input."),
    );
  }
  return h(
    "div",
    { class: "banner banner-demo", role: "status" },
    h("strong", null, "Demo engine, not Jev"),
    h("span", null, "A keyword heuristic mimics the response shape. Its answers say nothing about how Jev behaves."),
  );
}

export function errorBanner(error) {
  const list = (error.errors ?? []).map((e) => h("li", null, h("code", null, e.path || "request"), ": ", e.message));
  return h(
    "div",
    { class: "banner banner-error", role: "alert" },
    h("strong", null, error.message),
    list.length ? h("ul", null, list) : null,
  );
}

/** @param {{ questions: Record<string, any>, answers: Record<string, any>, policy: any }} ctx */
export function instruments({ questions, answers, policy }) {
  return h(
    "div",
    { class: "instruments" },
    Object.entries(answers).map(([id, answer]) => renderAnswer({ id, question: questions[id], answer, policy })),
  );
}

/**
 * The part that is plain code: turn typed answers into a decision.
 * @param {{ example: any, answers: any, state: any, policy: any, extra?: Node | null }} ctx
 */
export function decisionPanel({ example, answers, state, policy, extra = null }) {
  const d = example.decide(answers, { policy, state });
  return h(
    "section",
    { class: "decision", "aria-label": "What your code decides" },
    h("div", { class: "decision-head" }, tierChip(d.tone), h("h3", { class: "decision-title" }, d.headline)),
    h(
      "dl",
      { class: "kv" },
      d.rows.flatMap((row) => [h("dt", null, row.label), h("dd", null, row.value)]),
    ),
    extra,
  );
}

/**
 * Two sliders that change the routing policy. Changing them never calls the model.
 * @param {{ act: number, escalate: number }} policy
 * @param {(policy: { act: number, escalate: number }) => void} onChange
 */
export function policyControls(policy, onChange) {
  const actOut = h("output", null, fixed(policy.act));
  const escOut = h("output", null, fixed(policy.escalate));
  const act = h("input", { id: "policy-act", type: "range", min: 0, max: 1, step: 0.05, value: policy.act });
  const esc = h("input", { id: "policy-escalate", type: "range", min: 0, max: 1, step: 0.05, value: policy.escalate });

  const sync = () => {
    policy.act = Number(act.value);
    policy.escalate = Math.min(Number(esc.value), policy.act);
    esc.value = policy.escalate;
    actOut.textContent = fixed(policy.act);
    escOut.textContent = fixed(policy.escalate);
    onChange(policy);
  };
  act.addEventListener("input", sync);
  esc.addEventListener("input", sync);

  return h(
    "div",
    { class: "policy" },
    h("p", { class: "label" }, "Your policy: code, not model"),
    h("label", { class: "policy-row", for: "policy-act" }, h("span", null, "Act at or above"), act, actOut),
    h("label", { class: "policy-row", for: "policy-escalate" }, h("span", null, "Human below"), esc, escOut),
    h("p", { class: "panel-note" }, "Drag the sliders: the tiers and the decision update instantly. The model is not called again."),
  );
}
