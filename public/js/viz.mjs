// Instruments: each answer type is drawn in the shape of what it means.
//   Noul   -> a 0..1 scale, with the 0.4..0.6 "torn" band hatched
//   Choice -> a probability distribution over options
//   Score  -> ordered levels with a fractional position marker

import { h, rich } from "./dom.mjs";
import { t, getLang } from "./i18n-state.mjs";
import { pluralKey } from "/lib/i18n.mjs";
import { confidenceTier, noulVerdict } from "/lib/routing.mjs";

// The tier ids (act / confirm / escalate) are data; only their label is translated, and it
// is resolved on every call so a language switch shows up the next time a view is built.
export const tierLabel = (tier) => t(`viz.tier.${tier}`);

const fixed = (n, d = 2) => Number(n).toFixed(d);
const pct = (n) => `${Math.round(n * 100)}%`;

export function tierChip(tier) {
  return h("span", { class: `chip chip-${tier}` }, tierLabel(tier));
}

export function confidenceMeter(confidence) {
  const on = Math.round(confidence * 10);
  return h(
    "span",
    { class: "conf", title: t("viz.confidence.title", { value: fixed(confidence) }) },
    h("span", { class: "meter", "aria-hidden": "true" }, Array.from({ length: 10 }, (_, i) => h("i", { class: i < on ? "on" : "" }))),
    t("viz.confidence.label", { value: fixed(confidence) }),
  );
}

function questionText(question) {
  const text = question?.instructions;
  return typeof text === "string" ? text : JSON.stringify(text);
}

function header(id, type, question) {
  return [
    h("header", { class: "inst-h" }, h("code", { class: "inst-id" }, id), h("span", { class: "tag" }, type)),
    question ? h("p", { class: "inst-q" }, rich(questionText(question))) : null,
  ];
}

/**
 * @param {{ id: string, question?: any, answer: any, policy: { act: number, escalate: number } }} ctx
 */
export function renderAnswer(ctx) {
  const { answer } = ctx;
  if (answer.type === "noul") return noulView(ctx);
  if (answer.type === "choice") return choiceView(ctx);
  if (answer.type === "score") return scoreView(ctx);
  return h("figure", { class: "inst" }, h("code", null, ctx.id), h("pre", { class: "code" }, JSON.stringify(answer, null, 2)));
}

function noulView({ id, question, answer }) {
  const p = answer.noul;
  const verdict = noulVerdict(p);
  const verdictLabel = { yes: t("viz.noul.yes"), no: t("viz.noul.no"), uncertain: t("viz.noul.torn") }[verdict];
  return h(
    "figure",
    { class: "inst inst-noul", style: { margin: "0" } },
    header(id, "noul", question),
    h(
      "div",
      { class: "readout" },
      h("span", { class: "num" }, fixed(p)),
      h("span", { class: `chip ${verdict === "uncertain" ? "chip-confirm" : "chip-plain"}` }, verdictLabel),
    ),
    h(
      "div",
      { class: "scale", role: "img", "aria-label": t("viz.noul.aria", { value: fixed(p) }) },
      h("div", { class: "band" }),
      h("div", { class: "fill", style: { width: `${p * 100}%` } }),
      h("div", { class: "mark", style: { left: `${p * 100}%` } }),
      h("span", { class: "tick tick-0", style: { left: "0" } }, t("viz.noul.tick0")),
      h("span", { class: "tick", style: { left: "50%" } }, t("viz.noul.tick05")),
      h("span", { class: "tick tick-1", style: { left: "100%" } }, t("viz.noul.tick1")),
    ),
    h("p", { class: "inst-note" }, t("viz.noul.note")),
  );
}

function choiceView({ id, question, answer, policy }) {
  const entries = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, 6);
  const hidden = entries.length - shown.length;
  const tier = confidenceTier(answer.confidence, policy);
  return h(
    "figure",
    { class: "inst inst-choice", style: { margin: "0" } },
    header(id, "choice", question),
    h(
      "div",
      { class: "readout" },
      h("span", { class: "name" }, answer.choice.replaceAll("_", " ")),
      confidenceMeter(answer.confidence),
      tierChip(tier),
    ),
    h(
      "div",
      { class: "bars" },
      shown.map(([name, p], i) =>
        h(
          "div",
          { class: `bar-row${i === 0 ? " is-top" : ""}` },
          h("span", { class: "bar-label" }, name),
          h("div", { class: "bar-track" }, h("div", { class: "bar-fill", style: { width: `${p * 100}%` } })),
          h("span", { class: "bar-pct" }, pct(p)),
        ),
      ),
      hidden > 0 ? h("p", { class: "inst-note" }, t(pluralKey(getLang(), "viz.choice.more", hidden), { n: hidden })) : null,
    ),
  );
}

function scoreView({ id, question, answer, policy }) {
  const levels = Object.keys(answer.legend).sort((a, b) => Number(a) - Number(b));
  const n = levels.length;
  const near = Math.max(0, Math.min(n - 1, Math.round(answer.score)));
  const tier = confidenceTier(answer.confidence, policy);
  return h(
    "figure",
    { class: "inst inst-score", style: { margin: "0" } },
    header(id, "score", question),
    h(
      "div",
      { class: "readout" },
      h("span", { class: "num" }, fixed(answer.score)),
      h("span", { class: "muted small" }, t("viz.score.range", { max: n - 1, legend: answer.legend[String(near)] })),
      confidenceMeter(answer.confidence),
      tierChip(tier),
    ),
    h(
      "div",
      { class: "level-track" },
      h("div", { class: "score-mark", style: { left: `${((answer.score + 0.5) / n) * 100}%` } }, h("span", null, fixed(answer.score))),
      h(
        "div",
        { class: "levels", style: { "--n": n } },
        levels.map((key) => {
          const p = answer.probabilities[key] ?? 0;
          return h(
            "div",
            { class: `level${Number(key) === near ? " is-near" : ""}` },
            h("div", { class: "level-bar" }, h("i", { style: { height: `${Math.max(p * 100, 2)}%` } })),
            h("span", { class: "level-p" }, pct(p)),
            h("span", { class: "level-text" }, answer.legend[key]),
          );
        }),
      ),
    ),
  );
}
