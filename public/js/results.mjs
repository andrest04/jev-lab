// Shared result pieces: run banner, instrument list, decision panel, policy sliders.

import { h } from "./dom.mjs";
import { t } from "./i18n-state.mjs";
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
      h("strong", null, t("results.live.title", { model: run.response.model })),
      h(
        "span",
        null,
        t("results.live.detail", { ms: run.latencyMs, input: usage.input_tokens ?? "?", cost: formatUsd(costUsd(usage)) }),
      ),
    );
  }
  if (run.mode === "sample") {
    return h(
      "div",
      { class: "banner banner-sample", role: "status" },
      h("strong", null, t("results.sample.title")),
      h("span", null, t("results.sample.detail")),
    );
  }
  return h(
    "div",
    { class: "banner banner-demo", role: "status" },
    h("strong", null, t("results.demo.title")),
    h("span", null, t("results.demo.detail")),
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
  const d = example.decide(answers, { policy, state, t });
  return h(
    "section",
    { class: "decision", "aria-label": t("results.decision.aria") },
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
    h("p", { class: "label" }, t("results.policy.title")),
    h("label", { class: "policy-row", for: "policy-act" }, h("span", null, t("results.policy.act")), act, actOut),
    h("label", { class: "policy-row", for: "policy-escalate" }, h("span", null, t("results.policy.human")), esc, escOut),
    h("p", { class: "panel-note" }, t("results.policy.note")),
  );
}
