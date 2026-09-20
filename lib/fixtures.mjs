// Hand-written sample answers, expanded into the shape of a real API response.
// They exist so the examples are explorable without an API key. They are illustrations
// written by the author of this lab, NOT Jev output, and the UI labels them that way.

import { concentration } from "./confidence.mjs";

export const SAMPLE_MODEL = "sample";

/**
 * Compact sample forms:
 *   noul   -> number in 0..1
 *   choice -> { option: weight } (normalized; omitted options get 0)
 *   score  -> number (fractional level position) or an explicit probability list
 *
 * @param {Record<string, import("./questions.mjs").Question>} questions
 * @param {Record<string, unknown>} sample
 */
export function expandSample(questions, sample) {
  const answers = {};
  for (const [id, q] of Object.entries(questions)) {
    if (!(id in sample)) throw new Error(`expandSample: no sample for question "${id}"`);
    const value = sample[id];
    if (q.type === "noul") answers[id] = { type: "noul", noul: /** @type {number} */ (value) };
    else if (q.type === "choice") answers[id] = choiceAnswer(q, /** @type {any} */ (value));
    else answers[id] = scoreAnswer(q, value);
  }
  return {
    model: SAMPLE_MODEL,
    answers,
    usage: { input_tokens: 0, output_tokens: Object.keys(answers).length },
  };
}

const normalize = (weights) => {
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
};

function choiceAnswer(q, weights) {
  const names = Object.keys(q.criteria);
  const probs = normalize(names.map((name) => weights[name] ?? 0));
  return {
    type: "choice",
    choice: names[probs.indexOf(Math.max(...probs))],
    probabilities: Object.fromEntries(names.map((name, i) => [name, probs[i]])),
    confidence: concentration(probs),
  };
}

function scoreAnswer(q, value) {
  const levels = q.criteria;
  const probs = Array.isArray(value) ? normalize(value) : levelDistribution(value, levels.length);
  return {
    type: "score",
    score: probs.reduce((sum, p, i) => sum + p * i, 0),
    legend: Object.fromEntries(levels.map((text, i) => [String(i), text])),
    probabilities: Object.fromEntries(probs.map((p, i) => [String(i), p])),
    confidence: concentration(probs),
  };
}

function levelDistribution(position, count) {
  const probs = new Array(count).fill(0);
  const lo = Math.max(0, Math.min(count - 1, Math.floor(position)));
  const frac = position - lo;
  if (frac > 1e-9 && lo + 1 < count) {
    probs[lo] = 1 - frac;
    probs[lo + 1] = frac;
    return probs;
  }
  probs[lo] = 0.9;
  if (lo > 0 && lo < count - 1) {
    probs[lo - 1] = 0.05;
    probs[lo + 1] = 0.05;
  } else if (lo === 0) {
    probs[1] = 0.1;
  } else {
    probs[count - 2] = 0.1;
  }
  return probs;
}
