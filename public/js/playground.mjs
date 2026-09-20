// Free-form playground: write state, build typed questions, run, inspect the request.

import { h, mount, codeBlock } from "./dom.mjs";
import { runRequest } from "./api.mjs";
import { store } from "./store.mjs";
import { runBanner, errorBanner, instruments, policyControls } from "./results.mjs";
import { EXAMPLES, DEFAULT_POLICY } from "/lib/examples.mjs";
import { buildRequest, validateRequest, LIMITS, MODELS } from "/lib/questions.mjs";
import { toCurl, toFetch, toPython } from "/lib/codegen.mjs";
import { CONTEXT_TOKENS, PRICING, costUsd, estimateRequestTokens, formatUsd } from "/lib/cost.mjs";

let uid = 0;
const nextKey = () => `q${++uid}`;

const DEFAULT_DRAFT = () => ({
  state: "I was charged twice for March and support hasn't replied in 4 days. Please refund the duplicate today.",
  model: "jev-latest",
  questions: [
    {
      key: nextKey(),
      id: "team",
      type: "choice",
      instructions: "Which team should handle this message?",
      options: [
        { name: "billing", desc: "Charges, invoices, refunds" },
        { name: "technical", desc: "Bugs, outages, errors" },
        { name: "account", desc: "Login, passwords, permissions" },
        { name: "other", desc: "None of the above" },
      ],
      levels: ["", ""],
      trueText: "",
      falseText: "",
    },
    {
      key: nextKey(),
      id: "frustration",
      type: "score",
      instructions: "How frustrated is the customer who wrote this message?",
      options: [],
      levels: ["Calm and neutral", "Mildly annoyed", "Clearly frustrated", "Furious"],
      trueText: "",
      falseText: "",
    },
    {
      key: nextKey(),
      id: "refund",
      type: "noul",
      instructions: "Does the message ask for money back?",
      options: [],
      levels: ["", ""],
      trueText: "",
      falseText: "",
    },
  ],
});

// --- Draft <-> request ---------------------------------------------------------

function parseStateValue(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return text;
    }
  }
  return text;
}

function toQuestion(q) {
  const base = { type: q.type, instructions: q.instructions };
  if (q.type === "choice") {
    const criteria = {};
    for (const o of q.options) if (o.name.trim()) criteria[o.name.trim()] = o.desc.trim() || null;
    return { ...base, criteria };
  }
  if (q.type === "score") return { ...base, criteria: q.levels.map((l) => l.trim()).filter(Boolean) };
  const criteria = {};
  if (q.trueText.trim()) criteria.true = q.trueText.trim();
  if (q.falseText.trim()) criteria.false = q.falseText.trim();
  return Object.keys(criteria).length ? { ...base, criteria } : base;
}

function toRequest(draft) {
  const questions = {};
  const problems = [];
  draft.questions.forEach((q, i) => {
    const id = q.id.trim();
    if (!id) problems.push({ path: `questions[${i}]`, message: "Give every question an id, so your code can find its answer." });
    else if (id in questions) problems.push({ path: `questions.${id}`, message: "Question ids must be unique." });
    else questions[id] = toQuestion(q);
  });
  return { request: buildRequest({ state: parseStateValue(draft.state), model: draft.model, questions }), problems };
}

function fromQuestion(id, q) {
  return {
    key: nextKey(),
    id,
    type: q.type,
    instructions: typeof q.instructions === "string" ? q.instructions : JSON.stringify(q.instructions),
    options: q.type === "choice" ? Object.entries(q.criteria).map(([name, desc]) => ({ name, desc: desc ?? "" })) : [],
    levels: q.type === "score" ? [...q.criteria] : ["", ""],
    trueText: q.criteria?.true ?? "",
    falseText: q.criteria?.false ?? "",
  };
}

function fromExample(example) {
  const preset = example.presets[0];
  const questions = example.questions(preset.state);
  return {
    state: JSON.stringify(preset.state, null, 2),
    model: "jev-latest",
    questions: Object.entries(questions).map(([id, q]) => fromQuestion(id, q)),
  };
}

// --- View ------------------------------------------------------------------------

/** @param {{ mode: "live" | "demo", models?: string[] }} status */
export function PlaygroundView(status) {
  const live = status.mode === "live";
  const models = status.models?.length ? status.models : MODELS;
  const policy = { ...DEFAULT_POLICY, ...store.get("jev-policy", {}) };

  const saved = store.get("jev-draft", null);
  let draft = saved && Array.isArray(saved.questions) && saved.questions.length ? saved : DEFAULT_DRAFT();
  draft.questions.forEach((q) => (q.key = nextKey()));

  let tab = "answers";
  let codeLang = "curl";
  let last = null; // { run, request }
  let error = null;
  let busy = false;
  let saveTimer = 0;

  const stateInput = h("textarea", { id: "pg-state", class: "field", rows: 7, spellcheck: "false", value: draft.state });
  const stateNote = h("p", { class: "panel-note", "aria-live": "polite" });
  const modelSelect = h("select", { id: "pg-model", class: "field" }, models.map((m) => h("option", { value: m, selected: m === draft.model }, m)));
  const exampleSelect = h(
    "select",
    { id: "pg-example", class: "field" },
    h("option", { value: "" }, "Start from an example…"),
    EXAMPLES.map((e) => h("option", { value: e.id }, e.title)),
  );
  const questionsHost = h("div");
  const budgetBox = h("div", { class: "budget" });
  const problemsBox = h("div", { "aria-live": "polite" });
  const runButton = h("button", { class: "btn btn-primary", type: "button" }, live ? "Run with Jev" : "Run demo engine");
  const paneHost = h("div", { class: "panel" });
  const tabsBox = h("div", { class: "tabs", role: "tablist" });
  const answersHost = h("div", { class: "panel", "aria-live": "polite" });
  const policyEl = policyControls(policy, () => {
    store.set("jev-policy", { act: policy.act, escalate: policy.escalate });
    renderAnswers();
  });

  // --- Draft persistence and derived views ---------------------------------------

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set("jev-draft", draft), 400);
  }

  function refresh() {
    persist();
    const { request, problems } = toRequest(draft);
    const check = validateRequest(request);
    const all = [...problems, ...check.errors];

    stateNote.textContent = typeof request.state === "string" ? "Sent as text." : "Sent as JSON. Reference values with backticked paths such as `ticket.message`.";

    const tokens = estimateRequestTokens(request);
    const share = Math.min(100, (tokens / CONTEXT_TOKENS) * 100);
    mount(
      budgetBox,
      h("span", null, `≈ ${tokens.toLocaleString()} input tokens (estimate) · ${share < 0.1 ? "<0.1" : share.toFixed(1)}% of the ${CONTEXT_TOKENS.toLocaleString()} token context · about ${formatUsd((tokens * PRICING.usdPerBillionInputTokens) / 1e9)}`),
      h("div", { class: "budget-bar" }, h("i", { style: { width: `${Math.max(share, 0.5)}%` } })),
    );

    mount(
      problemsBox,
      all.length ? h("div", { class: "banner banner-error" }, h("strong", null, "Fix before running"), h("ul", null, all.map((e) => h("li", null, h("code", null, e.path || "request"), ": ", e.message)))) : null,
    );
    runButton.disabled = busy || all.length > 0;
    if (tab === "request" || tab === "code") renderPane();
    return { request, problems: all };
  }

  // --- Question builder -------------------------------------------------------------

  const input = (props, onInput) => {
    const el = h("input", { class: "field", type: "text", ...props });
    el.addEventListener("input", () => onInput(el.value));
    return el;
  };

  function renderQuestions() {
    mount(
      questionsHost,
      draft.questions.map((q, index) => questionCard(q, index)),
      h("button", { class: "btn btn-small", type: "button", onClick: addQuestion }, "+ Add question"),
    );
  }

  function questionCard(q, index) {
    const typeSelect = h("select", { class: "field", id: `${q.key}-type`, "aria-label": "Type" }, ["noul", "choice", "score"].map((t) => h("option", { value: t, selected: t === q.type }, t)));
    typeSelect.addEventListener("change", () => {
      q.type = typeSelect.value;
      renderQuestions();
      refresh();
    });
    const instructions = h("textarea", { class: "field", id: `${q.key}-instr`, rows: 2, value: q.instructions });
    instructions.addEventListener("input", () => {
      q.instructions = instructions.value;
      refresh();
    });

    return h(
      "div",
      { class: "qcard" },
      h(
        "div",
        { class: "qcard-top" },
        h("div", null, h("label", { class: "label", for: `${q.key}-id` }, "Question id"), input({ id: `${q.key}-id`, value: q.id, spellcheck: "false" }, (v) => ((q.id = v), refresh()))),
        h("div", null, h("label", { class: "label", for: `${q.key}-type` }, "Type"), typeSelect),
        h("button", { class: "btn btn-small btn-quiet", type: "button", "aria-label": `Remove question ${index + 1}`, onClick: () => removeQuestion(q.key) }, "Remove"),
      ),
      h("div", null, h("label", { class: "label", for: `${q.key}-instr` }, "Instructions: the exact condition to judge"), instructions),
      criteriaEditor(q),
    );
  }

  function criteriaEditor(q) {
    if (q.type === "choice") {
      return h(
        "div",
        { class: "rows" },
        h("p", { class: "label" }, `Options (${LIMITS.minChoiceOptions} to ${LIMITS.maxChoiceOptions}), each with an optional description`),
        q.options.map((o, i) =>
          h(
            "div",
            { class: "row2" },
            input({ value: o.name, placeholder: "option", "aria-label": `Option ${i + 1} name`, spellcheck: "false" }, (v) => ((o.name = v), refresh())),
            input({ value: o.desc, placeholder: "what belongs here", "aria-label": `Option ${i + 1} description` }, (v) => ((o.desc = v), refresh())),
            h("button", { class: "btn btn-small btn-quiet", type: "button", "aria-label": `Remove option ${i + 1}`, onClick: () => ((q.options = q.options.filter((x) => x !== o)), renderQuestions(), refresh()) }, "×"),
          ),
        ),
        h("button", { class: "btn btn-small", type: "button", onClick: () => (q.options.push({ name: "", desc: "" }), renderQuestions(), refresh()) }, "+ Add option"),
      );
    }
    if (q.type === "score") {
      const move = (i, d) => {
        const j = i + d;
        if (j < 0 || j >= q.levels.length) return;
        [q.levels[i], q.levels[j]] = [q.levels[j], q.levels[i]];
        renderQuestions();
        refresh();
      };
      return h(
        "div",
        { class: "rows" },
        h("p", { class: "label" }, `Levels, lowest first (${LIMITS.minScoreLevels} to ${LIMITS.maxScoreLevels}). Describe concrete situations.`),
        q.levels.map((text, i) =>
          h(
            "div",
            { class: "row1" },
            input({ value: text, placeholder: `level ${i}`, "aria-label": `Level ${i}` }, (v) => ((q.levels[i] = v), refresh())),
            h("button", { class: "btn btn-small btn-quiet", type: "button", "aria-label": `Move level ${i} up`, onClick: () => move(i, -1) }, "↑"),
            h("button", { class: "btn btn-small btn-quiet", type: "button", "aria-label": `Move level ${i} down`, onClick: () => move(i, 1) }, "↓"),
            h("button", { class: "btn btn-small btn-quiet", type: "button", "aria-label": `Remove level ${i}`, onClick: () => ((q.levels = q.levels.filter((_, k) => k !== i)), renderQuestions(), refresh()) }, "×"),
          ),
        ),
        h("button", { class: "btn btn-small", type: "button", onClick: () => (q.levels.push(""), renderQuestions(), refresh()) }, "+ Add level"),
      );
    }
    return h(
      "details",
      null,
      h("summary", null, "Optional true/false criteria"),
      h(
        "div",
        { class: "rows", style: { marginTop: "8px" } },
        input({ value: q.trueText, placeholder: "when the answer is yes", "aria-label": "Criteria for true" }, (v) => ((q.trueText = v), refresh())),
        input({ value: q.falseText, placeholder: "when the answer is no", "aria-label": "Criteria for false" }, (v) => ((q.falseText = v), refresh())),
      ),
    );
  }

  function addQuestion() {
    draft.questions.push({ key: nextKey(), id: `q${draft.questions.length + 1}`, type: "noul", instructions: "", options: [], levels: ["", ""], trueText: "", falseText: "" });
    renderQuestions();
    refresh();
  }

  function removeQuestion(key) {
    draft.questions = draft.questions.filter((q) => q.key !== key);
    renderQuestions();
    refresh();
  }

  // --- Running --------------------------------------------------------------------

  async function execute() {
    const { request, problems } = refresh();
    if (problems.length) return;
    busy = true;
    error = null;
    runButton.disabled = true;
    runButton.textContent = "Running…";
    try {
      const run = await runRequest(request);
      last = { run, request };
    } catch (e) {
      error = e;
      last = null;
    } finally {
      busy = false;
      runButton.textContent = live ? "Run with Jev" : "Run demo engine";
    }
    refresh();
    setTab("answers");
  }

  // --- Output tabs ------------------------------------------------------------------

  const TABS = [
    ["answers", "Answers"],
    ["request", "Request"],
    ["code", "Code"],
    ["raw", "Raw response"],
  ];

  function setTab(next) {
    tab = next;
    renderTabs();
    renderPane();
  }

  function renderTabs() {
    mount(
      tabsBox,
      TABS.map(([id, label]) => h("button", { class: "tab", type: "button", role: "tab", "aria-selected": String(tab === id), onClick: () => setTab(id) }, label)),
    );
  }

  function renderAnswers() {
    if (error) return mount(answersHost, errorBanner(error));
    if (!last) {
      return mount(answersHost, h("div", { class: "empty" }, live ? "Press Run to ask Jev. Answers appear here as instruments." : "Press Run to try the demo engine. Add a TYPESAFE_API_KEY to use Jev itself."));
    }
    mount(answersHost, runBanner(last.run), instruments({ questions: last.request.questions, answers: last.run.response.answers, policy }));
  }

  function renderPane() {
    const { request } = toRequest(draft);
    if (tab === "answers") {
      renderAnswers();
      return mount(paneHost, answersHost, last ? policyEl : null);
    }
    if (tab === "request") return mount(paneHost, codeBlock(JSON.stringify(request, null, 2)));
    if (tab === "code") {
      const snippets = { curl: toCurl(request), fetch: toFetch(request), python: toPython(request) };
      const langs = h(
        "div",
        { class: "chips", role: "group", "aria-label": "Language" },
        [["curl", "curl"], ["fetch", "JavaScript (fetch)"], ["python", "Python SDK"]].map(([id, label]) => h("button", { class: "chip-btn", type: "button", "aria-pressed": String(codeLang === id), onClick: () => ((codeLang = id), renderPane()) }, label)),
      );
      return mount(paneHost, langs, codeBlock(snippets[codeLang]), h("p", { class: "panel-note" }, "The key comes from TYPESAFE_API_KEY. Keep it on a server: never call this endpoint from a browser."));
    }
    mount(paneHost, last ? codeBlock(JSON.stringify(last.run.response, null, 2)) : h("div", { class: "empty" }, "Run a request to see the raw response."));
  }

  // --- Wiring -----------------------------------------------------------------------

  stateInput.addEventListener("input", () => {
    draft.state = stateInput.value;
    refresh();
  });
  modelSelect.addEventListener("change", () => {
    draft.model = modelSelect.value;
    refresh();
  });
  exampleSelect.addEventListener("change", () => {
    const example = EXAMPLES.find((e) => e.id === exampleSelect.value);
    if (!example) return;
    draft = fromExample(example);
    stateInput.value = draft.state;
    last = null;
    error = null;
    renderQuestions();
    refresh();
    renderPane();
    exampleSelect.value = "";
  });
  runButton.addEventListener("click", execute);

  const root = h(
    "div",
    { class: "page" },
    h(
      "header",
      { class: "ex-head" },
      h("p", { class: "eyebrow" }, "Playground"),
      h("h1", { class: "ex-title" }, "Ask anything, typed"),
      h("p", { class: "lede" }, "Write the state, add typed questions, and see the request Jev receives. Every answer is a probability your code can branch on."),
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
          h("div", { class: "panel-h" }, h("h2", { class: "h-section" }, "State"), h("div", { style: { minWidth: "200px" } }, h("label", { class: "label", for: "pg-example" }, "Load"), exampleSelect)),
          h("label", { class: "label", for: "pg-state" }, "Text or JSON"),
          stateInput,
          stateNote,
        ),
        h("section", { class: "panel" }, h("div", { class: "panel-h" }, h("h2", { class: "h-section" }, "Questions"), h("span", { class: "panel-note" }, "Independent and parallel")), questionsHost),
        h("section", { class: "panel" }, h("div", { class: "panel-h" }, h("h2", { class: "h-section" }, "Model")), h("label", { class: "label", for: "pg-model" }, "Model"), modelSelect),
      ),
      h(
        "div",
        { class: "col" },
        h("section", { class: "panel" }, h("div", { class: "panel-h" }, h("h2", { class: "h-section" }, "Run"), runButton), budgetBox, problemsBox),
        h("section", { class: "panel" }, tabsBox, paneHost),
      ),
    ),
  );

  renderQuestions();
  renderTabs();
  refresh();
  renderPane();
  if (!live) execute();

  return root;
}
