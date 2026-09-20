import { h } from "./dom.mjs";
import { renderAnswer } from "./viz.mjs";
import { EXAMPLES, DEFAULT_POLICY, getExample } from "/lib/examples.mjs";
import { expandSample } from "/lib/fixtures.mjs";

export function HomeView(status) {
  // Three instruments drawn from one hand-written sample, so the first screen shows
  // what each answer type looks like.
  const example = getExample("ticket-desk");
  const preset = example.presets.find((p) => p.id === "threat-to-leave");
  const questions = example.questions(preset.state);
  const { answers } = expandSample(questions, preset.sample);
  const pick = (id) => renderAnswer({ id, question: questions[id], answer: answers[id], policy: DEFAULT_POLICY });

  const live = status.mode === "live";

  return h(
    "div",
    { class: "page" },
    h(
      "section",
      { class: "hero" },
      h("p", { class: "eyebrow" }, "TypeSafe · Jev"),
      h("h1", { class: "h-display" }, "Judgments you can branch on"),
      h("p", { class: "lede" }, "Jev reads text or JSON and answers typed questions with probabilities. No prose to parse, and your code stays in control. Learn it by running it."),
      h("div", { class: "hero-cta" }, h("a", { class: "btn btn-primary", href: "#/examples/ticket-desk" }, "Try the ticket desk"), h("a", { class: "btn", href: "#/playground" }, "Open the playground")),
    ),

    h(
      "section",
      { "aria-label": "The three answer types" },
      h("div", { class: "strip" }, pick("churn"), pick("team"), pick("frustration")),
      h("p", { class: "panel-note", style: { marginTop: "8px" } }, "Noul, Choice and Score, drawn from a hand-written sample answer to show the shape. Not model output."),
    ),

    h(
      "section",
      { class: "panel" },
      h("div", { class: "panel-h" }, h("h2", { class: "h-section" }, "Worked examples"), h("span", { class: "panel-note" }, live ? "Live: runs call Jev" : "No API key: presets replay hand-written samples")),
      h(
        "div",
        { class: "exlist" },
        EXAMPLES.map((e) =>
          h(
            "a",
            { class: "exrow", href: `#/examples/${e.id}` },
            h("span", { class: "exrow-title" }, e.title),
            h("span", { class: "exrow-tag" }, e.tagline),
            h("span", { class: "exrow-meta" }, h("span", { class: "tag" }, e.pattern), e.primitives.map((p) => h("span", { class: "tag" }, p))),
          ),
        ),
      ),
    ),

    h(
      "section",
      { class: "steps" },
      h("div", null, h("h3", null, "Read the questions"), h("p", { class: "muted" }, "Each example shows the exact typed questions and the JSON request they produce.")),
      h("div", null, h("h3", null, "Run it"), h("p", { class: "muted" }, live ? "Runs go to Jev through this server. The key never reaches the browser." : "Without a key, presets replay clearly labeled samples. Set TYPESAFE_API_KEY to run Jev on any input.")),
      h("div", null, h("h3", null, "Change the policy"), h("p", { class: "muted" }, "Thresholds and weights live in code. Move the sliders and the decision updates without another model call.")),
    ),
  );
}
