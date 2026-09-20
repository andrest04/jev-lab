// Demo engine: a keyword heuristic that mimics the SHAPE of a Jev response so the
// interface can be explored without an API key. It is NOT Jev. It matches words, it
// does not understand language, and its answers say nothing about how Jev behaves.

import { estimateRequestTokens } from "./cost.mjs";

export const DEMO_MODEL = "demo-heuristic";

const STOP = new Set(
  "the and for with that this from are was were you your have has had not but can will its our they them then than into onto over under about please".split(
    " ",
  ),
);

// Words that describe the question rather than the subject matter.
const GENERIC = new Set(
  "does message text which what how contain contains mention mentions express expresses whether".split(
    " ",
  ),
);

// Rough cues used only to order score levels; they assume levels ascend in intensity.
const INTENSE = new Set(
  "furio angry unacc asap urgen worst terri horri cance lawsu ridic outra immed".split(" "),
);
const CALM = new Set("thank great fine works love perfe happy".split(" "));

const stem = (word) => (word.length > 5 ? word.slice(0, 5) : word);

function words(text) {
  return String(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

function flatten(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(flatten).join(" ");
  return Object.values(value).map(flatten).join(" ");
}

const stemSet = (text, drop = new Set()) =>
  new Set(words(text).filter((w) => !drop.has(w)).map(stem));

const overlap = (keywords, stateStems) => {
  let hits = 0;
  for (const k of keywords) if (stateStems.has(k)) hits += 1;
  return hits;
};

function normalize(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}

// Normalized concentration: 0 for a uniform spread, 1 for all mass on one outcome.
// For three options this equals (3 * pmax - 1) / 2, the example in the confidence docs.
// The real API computes confidence itself; this is only an approximation for the demo.
function concentration(probs) {
  const n = probs.length;
  return Math.max(0, Math.min(1, (n * Math.max(...probs) - 1) / (n - 1)));
}

function answerChoice(q, stateStems) {
  const names = Object.keys(q.criteria);
  const weights = names.map((name) => {
    const text = `${name} ${q.criteria[name] ?? ""}`;
    return overlap(stemSet(text), stateStems) + 0.15;
  });
  const probs = normalize(weights);
  const best = probs.indexOf(Math.max(...probs));
  return {
    type: "choice",
    choice: names[best],
    probabilities: Object.fromEntries(names.map((n, i) => [n, probs[i]])),
    confidence: concentration(probs),
  };
}

function answerNoul(q, stateStems) {
  const source = `${flatten(q.instructions)} ${q.criteria?.true ?? ""}`;
  const hits = overlap(stemSet(source, GENERIC), stateStems);
  return { type: "noul", noul: 0.1 + 0.8 * (1 - Math.exp(-hits / 2)) };
}

function intensityOf(stateText, stateStems) {
  const bangs = (stateText.match(/!/g) ?? []).length;
  const shouting = (stateText.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  return {
    intense: overlap(INTENSE, stateStems) + Math.min(bangs, 3) / 3 + Math.min(shouting, 3) / 3,
    calm: overlap(CALM, stateStems),
  };
}

function answerScore(q, stateText, stateStems) {
  const levels = q.criteria;
  const last = levels.length - 1;
  const { intense, calm } = intensityOf(stateText, stateStems);
  const weights = levels.map((text, i) => {
    let w = overlap(stemSet(text), stateStems) + 0.15;
    w += intense * (i / last);
    if (i === 0) w += calm;
    return w;
  });
  const probs = normalize(weights);
  return {
    type: "score",
    score: probs.reduce((sum, p, i) => sum + p * i, 0),
    legend: Object.fromEntries(levels.map((text, i) => [String(i), text])),
    probabilities: Object.fromEntries(probs.map((p, i) => [String(i), p])),
    confidence: concentration(probs),
  };
}

/**
 * @param {import("./questions.mjs").SystemOneRequest} request
 */
export function runDemo(request) {
  const stateText = flatten(request.state);
  const stateStems = stemSet(stateText);
  const answers = {};
  for (const [id, q] of Object.entries(request.questions)) {
    if (q.type === "choice") answers[id] = answerChoice(q, stateStems);
    else if (q.type === "score") answers[id] = answerScore(q, stateText, stateStems);
    else answers[id] = answerNoul(q, stateStems);
  }
  return {
    model: DEMO_MODEL,
    answers,
    usage: {
      input_tokens: estimateRequestTokens(request),
      output_tokens: Object.keys(answers).length,
    },
  };
}
