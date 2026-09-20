// Learn: the mental model, the three primitives, confidence, pitfalls and limits.
// Source: https://docs.typesafe.ai (read 2026-09-20). The live docs are authoritative.

import { h, mount } from "./dom.mjs";
import { renderAnswer } from "./viz.mjs";
import { concentration } from "/lib/confidence.mjs";
import { DEFAULT_POLICY } from "/lib/examples.mjs";
import { CONTEXT_TOKENS, PRICING, RATE_LIMITS } from "/lib/cost.mjs";

const DOCS = "https://docs.typesafe.ai";
const link = (path, text) => h("a", { href: `${DOCS}${path}`, target: "_blank", rel: "noreferrer noopener" }, text);

const PRIMITIVES = [
  {
    name: "Noul",
    use: "Whether a condition holds. One per label when several can be true at once.",
    returns: "A probability of yes, 0 to 1. No separate confidence.",
    watch: "0.5 means yes and no are equally likely, not “medium”.",
    path: "/primitives/noul.md",
  },
  {
    name: "Choice",
    use: "One option from a defined set, up to 255 options.",
    returns: "The chosen option, a probability for every option, and a confidence.",
    watch: "Add an “other” option when the list may be incomplete.",
    path: "/primitives/choice.md",
  },
  {
    name: "Score",
    use: "A degree along ordered levels you describe, 2 to 10 levels.",
    returns: "A position that can fall between levels, the legend, probabilities and a confidence.",
    watch: "Levels must describe concrete situations that stand on their own.",
    path: "/primitives/score.md",
  },
];

const HABITS = [
  ["Decompose", "Replace “Is this spam?” with narrow questions: does it ask for credentials, does the sender mismatch the domain, does it announce an unexpected reward."],
  ["Structure the state", "Send only what each decision needs, as named JSON fields. Point at values with backticked paths such as `ticket.message`."],
  ["Ask in parallel", "Independent questions over the same state run together in one request. Extra questions cost only extra tokens."],
  ["Route on confidence", "Act on confident answers, ask for confirmation on middling ones, send uncertain ones to a person."],
  ["Compose in code", "Weights, thresholds and side effects belong to your code. Changing a weight should never need a new model call."],
];

const PITFALLS = [
  ["Reads literally", "Jev does not infer intent. If answers look wrong, the instructions probably omit a detail.", "State the exact condition."],
  ["Arithmetic and counting", "It cannot reliably count, add or judge numeric closeness.", "Compute in code and pass meaning, such as a color name instead of hex."],
  ["Dates", "Dates behave like text, so comparisons and durations go wrong.", "Extract day, month and year as choices, then do the math in code."],
  ["Indirection", "Multi-hop reasoning and double negatives lower accuracy.", "Name the relevant field directly and phrase the question positively."],
  ["Context bloat", "Large inputs full of irrelevant detail distract it.", "Filter the state in code before sending it."],
  ["Hostile text", "State is not treated as adversarial: injected instructions can sway an answer.", "Use explicit criteria, test with hostile inputs, and add a guardrail question."],
  ["Contradictory criteria", "If instructions and criteria disagree, quality drops.", "Keep phrasing aligned. Never map “true” to “no”."],
  ["Writing text", "It generates text poorly and slowly.", "Use bounded choices or extraction, and let a generative model write prose."],
];

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
    explorerMath.textContent = `three options: (3 × ${p.toFixed(2)} − 1) / 2 = ${confidence.toFixed(2)}`;
  }
  probSlider.addEventListener("input", renderExplorer);
  renderExplorer();

  return h(
    "div",
    { class: "page learn" },
    h(
      "header",
      { class: "ex-head" },
      h("p", { class: "eyebrow" }, "Learn"),
      h("h1", { class: "ex-title" }, "How Jev works"),
      h("p", { class: "lede" }, "Jev is TypeSafe's first System One model. It reads state and answers typed questions with probabilities. It does not write prose, so there is nothing to parse."),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, "The loop"),
      h(
        "div",
        { class: "flow" },
        h("div", null, h("h3", null, "You send"), h("p", { class: "small muted" }, "State (text or JSON) and a map of typed questions.")),
        h("div", { class: "arrow", "aria-hidden": "true" }, "→"),
        h("div", null, h("h3", null, "Jev returns"), h("p", { class: "small muted" }, "A typed answer per question: probabilities, plus confidence for choices and scores.")),
        h("div", { class: "arrow", "aria-hidden": "true" }, "→"),
        h("div", null, h("h3", null, "Code decides"), h("p", { class: "small muted" }, "Thresholds, weights, routing and side effects stay in ordinary code.")),
      ),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, "Three primitives"),
      h(
        "div",
        { class: "table-scroll" },
        h(
          "table",
          null,
          h("thead", null, h("tr", null, ["Primitive", "Use it for", "It returns", "Watch out"].map((t) => h("th", { scope: "col" }, t)))),
          h(
            "tbody",
            null,
            PRIMITIVES.map((p) => h("tr", null, h("th", { scope: "row", style: { textTransform: "none", letterSpacing: "0", fontFamily: "var(--display)", fontSize: "20px", color: "var(--ink)", borderBottom: "1px solid var(--line)" } }, link(p.path, p.name)), h("td", null, p.use), h("td", null, p.returns), h("td", null, p.watch))),
          ),
        ),
      ),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, "Confidence, hands on"),
      h("div", { class: "prose" }, h("p", null, "For choices and scores, confidence summarizes how concentrated the probabilities are: all on one option is confident, spread out is uncertain. Drag the slider and watch the tier change. The tier thresholds are yours, not the model's.")),
      h(
        "div",
        { class: "explorer" },
        h("label", { class: "label", for: "explorer-p" }, "Probability of the top option"),
        h("div", { class: "policy-row", style: { gridTemplateColumns: "minmax(0, 1fr) 44px" } }, probSlider, probOut),
        explorerViz,
        explorerMath,
        h("p", { class: "panel-note" }, "The formula shown is the docs' three-option example. The API returns its own confidence: use that, and never recompute it."),
      ),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, "Five habits"),
      h("div", { class: "pitfalls" }, HABITS.map(([title, text]) => h("div", { class: "pitfall" }, h("h3", null, title), h("p", null, text)))),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, "Where Jev is jagged (1.13)"),
      h("p", { class: "muted" }, "Known limits, each with the design that works around it. Test on your own data."),
      h("div", { class: "pitfalls" }, PITFALLS.map(([title, problem, fix]) => h("div", { class: "pitfall" }, h("h3", null, title), h("p", null, problem, " ", h("span", { class: "fix" }, `Instead: ${fix}`))))),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, "Limits and price"),
      h(
        "div",
        { class: "table-scroll" },
        h(
          "table",
          null,
          h("tbody", null, [
            ["Models", "jev-latest (alias) or jev-1.13.0 (pinned)"],
            ["Context", `${CONTEXT_TOKENS.toLocaleString()} tokens per request`],
            ["Price", `$${PRICING.usdPerBillionInputTokens} per billion input tokens. Output tokens are free. A 1,000 token request is about $0.000042.`],
            ["Rate limits", `${RATE_LIMITS.requestsPerMinute.toLocaleString()} requests per minute, ${RATE_LIMITS.tokensPerSecond.toLocaleString()} tokens per second. They adjust with demand.`],
            ["Input", "Text only: strings, JSON objects or arrays. Best in English."],
            ["Shape limits", "Choice: up to 255 options. Score: 2 to 10 levels."],
            ["Errors", "401 bad key, 422 malformed, 429 rate limited, 529 overloaded. Back off and retry on 429 and 529."],
          ].map(([k, v]) => h("tr", null, h("th", { scope: "row", style: { textTransform: "none", letterSpacing: "0", fontFamily: "var(--body)", fontSize: "14px", color: "var(--ink)", borderBottom: "1px solid var(--line)", width: "140px" } }, k), h("td", null, v)))),
        ),
      ),
    ),

    h(
      "section",
      null,
      h("h2", { class: "h-section" }, "Ship it safely"),
      h(
        "div",
        { class: "prose" },
        h("p", null, "Typed output guarantees the interface, not the truth. Keep the API key on a server, evaluate thresholds on your own data and the cost of being wrong, and treat cookbook numbers as examples to check, not rules."),
        h("p", null, "Read more: ", link("/concepts/how-to-build-with-system-one.md", "how to build with TypeSafe"), ", ", link("/confidence.md", "confidence"), ", ", link("/model-jaggedness/jev-1.13.md", "Jev 1.13 jaggedness"), " and the ", link("/llms.txt", "docs index"), "."),
      ),
    ),

    h("p", { class: "foot" }, "Summarized from docs.typesafe.ai on 2026-09-20. The live docs are the source of truth. Jev Lab is a learning tool, not an official TypeSafe product."),
  );
}
