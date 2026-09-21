// Learn: the mental model, the three primitives, confidence, pitfalls and limits.
// Source: https://docs.typesafe.ai (read 2026-09-20). The live docs are authoritative.

import { h, mount } from "./dom.mjs";
import { renderAnswer } from "./viz.mjs";
import { t, getLang } from "./i18n-state.mjs";
import { fillParts } from "/lib/i18n.mjs";
import { concentration } from "/lib/confidence.mjs";
import { DEFAULT_POLICY } from "/lib/examples.mjs";
import { CONTEXT_TOKENS, PRICING, RATE_LIMITS, costUsd, formatUsd } from "/lib/cost.mjs";

const DOCS = "https://docs.typesafe.ai";
const link = (path, text) => h("a", { href: `${DOCS}${path}`, target: "_blank", rel: "noreferrer noopener" }, text);

// Display text lives in the dictionaries (learn.*). These lists only hold ids, data and
// docs paths, and are resolved into text inside LearnView so a language switch applies.
const PRIMITIVES = [
  { id: "noul", name: "Noul", path: "/primitives/noul.md" },
  { id: "choice", name: "Choice", path: "/primitives/choice.md" },
  { id: "score", name: "Score", path: "/primitives/score.md" },
];

const HABIT_IDS = ["decompose", "structure", "parallel", "route", "compose"];

const PITFALL_IDS = ["literal", "arithmetic", "dates", "indirection", "bloat", "hostile", "contradictory", "writing"];

// Numbers follow the UI language: 64,000 in English, 64.000 in Spanish.
const num = (n) => n.toLocaleString(getLang());

export function LearnView() {
  const probSlider = h("input", { id: "explorer-p", type: "range", min: 0.34, max: 0.99, step: 0.01, value: 0.7 });
  const probOut = h("output", { for: "explorer-p" });
  const explorerViz = h("div");
  const explorerMath = h("p", { class: "mono small", "aria-live": "polite" });

  function renderExplorer() {
    const p = Number(probSlider.value);
    const rest = (1 - p) / 2;
    const probs = [p, rest, rest];
    const confidence = concentration(probs);
    probOut.textContent = p.toFixed(2);
    mount(
      explorerViz,
      renderAnswer({
        id: "example",
        question: { instructions: "Which team should handle this?" },
        answer: { type: "choice", choice: "billing", probabilities: { billing: p, technical: rest, other: rest }, confidence },
        policy: DEFAULT_POLICY,
      }),
    );
    explorerMath.textContent = t("learn.confidence.math", { p: p.toFixed(2), confidence: confidence.toFixed(2) });
  }
  probSlider.addEventListener("input", renderExplorer);
  renderExplorer();

  return h(
    "div",
    { class: "page learn" },
    h(
      "header",
      { class: "ex-head" },
      h("p", { class: "eyebrow" }, t("learn.eyebrow")),
      h("h1", { class: "ex-title" }, t("learn.title")),
      h("p", { class: "lede" }, t("learn.lede")),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, t("learn.loop.title")),
      h(
        "div",
        { class: "flow" },
        h("div", null, h("h3", null, t("learn.loop.send.title")), h("p", { class: "small muted" }, t("learn.loop.send.text"))),
        h("div", { class: "arrow", "aria-hidden": "true" }, "→"),
        h("div", null, h("h3", null, t("learn.loop.returns.title")), h("p", { class: "small muted" }, t("learn.loop.returns.text"))),
        h("div", { class: "arrow", "aria-hidden": "true" }, "→"),
        h("div", null, h("h3", null, t("learn.loop.decide.title")), h("p", { class: "small muted" }, t("learn.loop.decide.text"))),
      ),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, t("learn.primitives.title")),
      h(
        "div",
        { class: "table-scroll" },
        h(
          "table",
          null,
          h("thead", null, h("tr", null, ["name", "use", "returns", "watch"].map((col) => h("th", { scope: "col" }, t(`learn.primitives.col.${col}`))))),
          h(
            "tbody",
            null,
            PRIMITIVES.map((p) => h("tr", null, h("th", { scope: "row", style: { textTransform: "none", letterSpacing: "0", fontFamily: "var(--display)", fontSize: "20px", color: "var(--ink)", borderBottom: "1px solid var(--line)" } }, link(p.path, p.name)), h("td", null, t(`learn.primitives.${p.id}.use`)), h("td", null, t(`learn.primitives.${p.id}.returns`)), h("td", null, t(`learn.primitives.${p.id}.watch`)))),
          ),
        ),
      ),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, t("learn.confidence.title")),
      h("div", { class: "prose" }, h("p", null, t("learn.confidence.intro"))),
      h(
        "div",
        { class: "explorer" },
        h("label", { class: "label", for: "explorer-p" }, t("learn.confidence.sliderLabel")),
        h("div", { class: "policy-row", style: { gridTemplateColumns: "minmax(0, 1fr) 44px" } }, probSlider, probOut),
        explorerViz,
        explorerMath,
        h("p", { class: "panel-note" }, t("learn.confidence.note")),
      ),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, t("learn.habits.title")),
      h("div", { class: "pitfalls" }, HABIT_IDS.map((id) => h("div", { class: "pitfall" }, h("h3", null, t(`learn.habits.${id}.title`)), h("p", null, t(`learn.habits.${id}.text`))))),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, t("learn.pitfalls.title")),
      h("p", { class: "muted" }, t("learn.pitfalls.intro")),
      h("div", { class: "pitfalls" }, PITFALL_IDS.map((id) => h("div", { class: "pitfall" }, h("h3", null, t(`learn.pitfalls.${id}.title`)), h("p", null, t(`learn.pitfalls.${id}.problem`), " ", h("span", { class: "fix" }, t("learn.pitfalls.instead", { fix: t(`learn.pitfalls.${id}.fix`) })))))),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, t("learn.limits.title")),
      h(
        "div",
        { class: "table-scroll" },
        h(
          "table",
          null,
          h("tbody", null, [
            ["models", {}],
            ["context", { tokens: num(CONTEXT_TOKENS) }],
            [
              "price",
              {
                price: `$${PRICING.usdPerBillionInputTokens}`,
                sampleTokens: num(1000),
                sampleCost: formatUsd(costUsd({ input_tokens: 1000 })),
              },
            ],
            ["rate", { requests: num(RATE_LIMITS.requestsPerMinute), tokens: num(RATE_LIMITS.tokensPerSecond) }],
            ["input", {}],
            ["shape", {}],
            ["errors", {}],
          ].map(([key, params]) => h("tr", null, h("th", { scope: "row", style: { textTransform: "none", letterSpacing: "0", fontFamily: "var(--body)", fontSize: "14px", color: "var(--ink)", borderBottom: "1px solid var(--line)", width: "140px" } }, t(`learn.limits.${key}.label`)), h("td", null, t(`learn.limits.${key}.value`, params))))),
        ),
      ),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, t("learn.ship.title")),
      h(
        "div",
        { class: "prose" },
        h("p", null, t("learn.ship.guarantee")),
        h(
          "p",
          null,
          fillParts(t("learn.ship.more"), {
            build: link("/concepts/how-to-build-with-system-one.md", t("learn.ship.link.build")),
            confidence: link("/confidence.md", t("learn.ship.link.confidence")),
            jaggedness: link("/model-jaggedness/jev-1.13.md", t("learn.ship.link.jaggedness")),
            docs: link("/llms.txt", t("learn.ship.link.docs")),
          }),
        ),
      ),
    ),

    h("p", { class: "foot" }, t("learn.foot")),
  );
}
