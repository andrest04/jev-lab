// One worked example: state -> questions -> typed answers -> a decision made in code.

import { h, mount, rich, codeBlock } from "./dom.mjs";
import { runRequest } from "./api.mjs";
import { store } from "./store.mjs";
import { runBanner, errorBanner, instruments, decisionPanel, policyControls } from "./results.mjs";
import { EXTRAS } from "./extras.mjs";
import { t, getLang } from "./i18n-state.mjs";
import { DEFAULT_POLICY, exampleCopy } from "/lib/examples.mjs";
import { buildRequest, validateRequest } from "/lib/questions.mjs";
import { expandSample } from "/lib/fixtures.mjs";
import { toCurl } from "/lib/codegen.mjs";
import { pluralKey } from "/lib/i18n.mjs";

const pretty = (value) => JSON.stringify(value, null, 2);

/**
 * @param {any} example
 * @param {{ mode: "live" | "demo" }} status
 */
export function ExampleView(example, status) {
  const live = status.mode === "live";
  const policy = { ...DEFAULT_POLICY, ...store.get("jev-policy", {}) };
  const extras = EXTRAS[example.id] ?? {};

  let preset = example.presets[0];
  let run = null;
  let error = null;
  let busy = false;
  let lastCtx = null;

  // --- DOM skeleton -------------------------------------------------------

  const stateInput = h("textarea", { id: "state-input", class: "field", rows: 9, spellcheck: "false", "aria-describedby": "state-note" });
  const stateNote = h("p", { id: "state-note", class: "panel-note", "aria-live": "polite" });
  const presetsBox = h("div", { class: "chips", role: "group", "aria-label": t("example.presets.aria") });
  const questionsBox = h("div", { class: "qlist" });
  const requestBox = h("div", { class: "panel" });
  const runButton = h("button", { class: "btn btn-primary", type: "button" });
  const resultBox = h("div", { class: "panel", "aria-live": "polite" });
  const decisionHost = h("div");
  const policyEl = policyControls(policy, () => {
    store.set("jev-policy", { act: policy.act, escalate: policy.escalate });
    if (run) {
      renderResults();
      renderDecision();
    }
  });
  // The policy sliders stay mounted while the decision above them is redrawn, so
  // dragging one is never interrupted.
  policyEl.hidden = !example.usesPolicy;
  const decisionBox = h("section", { class: "panel" }, h("div", { class: "panel-h" }, h("h2", { class: "h-section" }, t("example.decision.title"))), decisionHost, policyEl);

  // --- State handling -------------------------------------------------------

  function parseState() {
    try {
      const value = JSON.parse(stateInput.value);
      if (value === null || typeof value !== "object") throw new Error(t("example.state.mustBeObject"));
      return { ok: true, value };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : t("example.state.invalidJson") };
    }
  }

  const isUnchanged = (value) => JSON.stringify(value) === JSON.stringify(preset.state);

  function buildFor(value) {
    const questions = example.questions(value);
    return { questions, request: buildRequest({ state: value, questions }) };
  }

  function refreshInputs() {
    const parsed = parseState();
    let requestNode;
    let canRun = false;

    if (!parsed.ok) {
      stateNote.textContent = t("example.state.notValidYet", { error: parsed.error });
      requestNode = h("p", { class: "panel-note" }, t("example.state.fixToSeeRequest"));
      mount(questionsBox, questionSummary(example.questions(preset.state)));
    } else {
      let built = null;
      try {
        built = buildFor(parsed.value);
      } catch {
        stateNote.textContent = t("example.state.shapeError");
      }
      if (built) {
        const unchanged = isUnchanged(parsed.value);
        canRun = live || unchanged;
        stateNote.textContent = live
          ? unchanged
            ? t("example.state.note.live.unchanged")
            : t("example.state.note.live.edited")
          : unchanged
            ? t("example.state.note.demo.unchanged")
            : t("example.state.note.demo.edited");
        mount(questionsBox, questionSummary(built.questions));
        requestNode = requestPanel(built.request);
      } else {
        requestNode = h("p", { class: "panel-note" }, t("example.request.none"));
      }
    }
    mount(requestBox, requestNode);
    runButton.disabled = busy || !canRun;
  }

  function questionSummary(questions) {
    const entries = Object.entries(questions);
    const item = ([id, q]) =>
      h(
        "div",
        { class: "qitem" },
        h("div", { class: "qitem-h" }, h("code", { class: "qitem-id" }, id), h("span", { class: "tag" }, q.type)),
        h("p", { class: "small" }, rich(typeof q.instructions === "string" ? q.instructions : JSON.stringify(q.instructions))),
        criteriaLine(q),
      );
    if (entries.length <= 4) return entries.map(item);
    const extra = entries.length - 2;
    return [
      ...entries.slice(0, 2).map(item),
      h("details", null, h("summary", null, t(pluralKey(getLang(), "example.questions.more", extra), { n: extra })), entries.slice(2).map(item)),
    ];
  }

  function criteriaLine(q) {
    if (q.type === "choice") {
      return h("div", { class: "qcrit" }, Object.entries(q.criteria).map(([name, desc]) => h("span", null, h("code", null, name), desc ? ` ${desc.toLowerCase()}` : "")));
    }
    if (q.type === "score") {
      return h("div", { class: "qcrit" }, q.criteria.map((text, i) => h("span", null, h("code", null, i), ` ${text}`)));
    }
    return null;
  }

  function requestPanel(request) {
    return h(
      "details",
      null,
      h("summary", null, t("example.request.seeExact")),
      h("div", { class: "panel", style: { marginTop: "10px" } }, h("p", { class: "label" }, t("example.request.jsonBody")), codeBlock(pretty(request)), h("p", { class: "label" }, t("example.request.curl")), codeBlock(toCurl(request))),
    );
  }

  // --- Running ----------------------------------------------------------------

  async function execute() {
    const parsed = parseState();
    if (!parsed.ok) {
      error = new Error(t("example.state.notValidError", { error: parsed.error }));
      run = null;
      return renderResults();
    }
    let built;
    try {
      built = buildFor(parsed.value);
    } catch {
      error = new Error(t("example.state.shapeError"));
      run = null;
      return renderResults();
    }
    const check = validateRequest(built.request);
    if (!check.ok) {
      error = Object.assign(new Error(t("example.request.invalid")), { errors: check.errors });
      run = null;
      return renderResults();
    }

    busy = true;
    error = null;
    runButton.disabled = true;
    runButton.textContent = t("example.run.running");
    try {
      run = live
        ? await runRequest(built.request)
        : { mode: "sample", response: expandSample(built.questions, preset.sample), latencyMs: 0 };
      lastCtx = { questions: built.questions, state: parsed.value };
    } catch (e) {
      error = e;
      run = null;
    } finally {
      busy = false;
      runButton.textContent = live ? t("example.run.live") : t("example.run.sample");
    }
    refreshInputs();
    renderResults();
  }

  // --- Rendering ----------------------------------------------------------------

  function renderResults() {
    if (error) {
      mount(resultBox, errorBanner(error));
    } else if (!run) {
      mount(
        resultBox,
        h("div", { class: "empty" }, live ? t("example.empty.live") : t("example.empty.demo")),
      );
    } else {
      const ctx = { questions: lastCtx.questions, state: lastCtx.state, answers: run.response.answers, policy };
      mount(resultBox, runBanner(run), extras.answers ? extras.answers(ctx) : instruments(ctx));
    }
    renderDecision();
  }

  function renderDecision() {
    if (!run || error) {
      decisionBox.hidden = true;
      return;
    }
    decisionBox.hidden = false;
    const answers = run.response.answers;
    const ctx = { example, answers, state: lastCtx.state, policy };
    mount(decisionHost, extras.decision ? extras.decision(ctx) : decisionPanel(ctx));
  }

  function selectPreset(next) {
    preset = next;
    stateInput.value = pretty(preset.state);
    run = null;
    error = null;
    renderPresets();
    refreshInputs();
    if (!live) execute();
    else renderResults();
  }

  function renderPresets() {
    mount(
      presetsBox,
      example.presets.map((p) => h("button", { class: "chip-btn", type: "button", "aria-pressed": String(p.id === preset.id), onClick: () => selectPreset(p) }, exampleCopy(example.id, `preset.${p.id}`, t))),
    );
  }

  stateInput.addEventListener("input", refreshInputs);
  runButton.addEventListener("click", execute);
  runButton.textContent = live ? t("example.run.live") : t("example.run.sample");

  // --- Page ---------------------------------------------------------------------

  const root = h(
    "div",
    { class: "page" },
    h(
      "header",
      { class: "ex-head" },
      h("nav", { class: "crumbs eyebrow", "aria-label": t("example.crumb.aria") }, h("a", { href: "#/" }, t("nav.examples")), "/", example.pattern),
      h("h1", { class: "ex-title" }, exampleCopy(example.id, "title", t)),
      h("div", { class: "ex-meta" }, example.primitives.map((p) => h("span", { class: "tag" }, p))),
      h("p", { class: "lesson" }, exampleCopy(example.id, "lesson", t)),
    ),
    h(
      "div",
      { class: "workspace" },
      h(
        "div",
        { class: "col" },
        h(
          "section",
          { class: "panel" },
          h("div", { class: "panel-h" }, h("h2", { class: "h-section" }, t("example.section.state")), h("span", { class: "panel-note" }, t("example.section.stateNote"))),
          presetsBox,
          h("label", { class: "label", for: "state-input" }, t("example.section.stateLabel")),
          stateInput,
          stateNote,
        ),
        h("section", { class: "panel" }, h("div", { class: "panel-h" }, h("h2", { class: "h-section" }, t("example.section.questions")), h("span", { class: "panel-note" }, t("example.section.questionsNote"))), questionsBox, requestBox),
      ),
      h(
        "div",
        { class: "col" },
        h("section", { class: "panel" }, h("div", { class: "panel-h" }, h("h2", { class: "h-section" }, t("example.section.answers")), runButton), resultBox),
        decisionBox,
        h("section", { class: "panel" }, h("div", { class: "panel-h" }, h("h2", { class: "h-section" }, t("example.section.code")), h("span", { class: "panel-note" }, t("example.section.codeNote"))), codeBlock(example.logic)),
      ),
    ),
  );

  renderPresets();
  stateInput.value = pretty(preset.state);
  decisionBox.hidden = true;
  refreshInputs();
  renderResults();
  if (!live) execute();

  return root;
}
