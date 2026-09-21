import { h } from "./dom.mjs";
import { t } from "./i18n-state.mjs";
import { renderAnswer } from "./viz.mjs";
import { EXAMPLES, DEFAULT_POLICY, getExample, exampleCopy } from "/lib/examples.mjs";
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
      h("h1", { class: "h-display" }, t("home.hero.title")),
      h("p", { class: "lede" }, t("home.hero.lede")),
      h("div", { class: "hero-cta" }, h("a", { class: "btn btn-primary", href: "#/examples/ticket-desk" }, t("home.hero.ctaTicketDesk")), h("a", { class: "btn", href: "#/playground" }, t("home.hero.ctaPlayground"))),
    ),

    h(
      "section",
      { "aria-label": t("home.answerTypes.aria") },
      h("div", { class: "strip" }, pick("churn"), pick("team"), pick("frustration")),
      h("p", { class: "panel-note", style: { marginTop: "8px" } }, t("home.answerTypes.note")),
    ),

    h(
      "section",
      { class: "panel" },
      h("div", { class: "panel-h" }, h("h2", { class: "h-section" }, t("home.examples.title")), h("span", { class: "panel-note" }, live ? t("home.examples.note.live") : t("home.examples.note.demo"))),
      h(
        "div",
        { class: "exlist" },
        EXAMPLES.map((e) =>
          h(
            "a",
            { class: "exrow", href: `#/examples/${e.id}` },
            h("span", { class: "exrow-title" }, exampleCopy(e.id, "title", t)),
            h("span", { class: "exrow-tag" }, exampleCopy(e.id, "tagline", t)),
            h("span", { class: "exrow-meta" }, h("span", { class: "tag" }, e.pattern), e.primitives.map((p) => h("span", { class: "tag" }, p))),
          ),
        ),
      ),
    ),

    h(
      "section",
      { class: "steps" },
      h("div", null, h("h3", null, t("home.steps.read.title")), h("p", { class: "muted" }, t("home.steps.read.text"))),
      h("div", null, h("h3", null, t("home.steps.run.title")), h("p", { class: "muted" }, live ? t("home.steps.run.text.live") : t("home.steps.run.text.demo"))),
      h("div", null, h("h3", null, t("home.steps.policy.title")), h("p", { class: "muted" }, t("home.steps.policy.text"))),
    ),
  );
}
