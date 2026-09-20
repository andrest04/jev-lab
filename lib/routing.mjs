// Code-side decisions built on top of Jev's typed answers.
// Jev supplies the judgments; these helpers keep policy explicit and in code.

/** @typedef {{ act: number, escalate: number }} Thresholds */

/** @type {Thresholds} */
const DEFAULT_THRESHOLDS = { act: 0.8, escalate: 0.5 };

// Example policies for the demo, not values from the docs. Tune them on real data.
/** @type {Record<string, Thresholds>} */
const RISK_THRESHOLDS = {
  read: { act: 0.6, escalate: 0.5 },
  write: { act: 0.8, escalate: 0.5 },
  destructive: { act: 0.9, escalate: 0.7 },
};

/**
 * Three-tier routing on a Choice or Score confidence.
 * @param {number} confidence
 * @param {Thresholds} [thresholds]
 * @returns {"act" | "confirm" | "escalate"}
 */
export function confidenceTier(confidence, thresholds = DEFAULT_THRESHOLDS) {
  if (confidence >= thresholds.act) return "act";
  if (confidence >= thresholds.escalate) return "confirm";
  return "escalate";
}

/**
 * Stricter thresholds for riskier actions. Unknown risk fails closed.
 * @param {string} risk
 * @returns {Thresholds}
 */
export function thresholdsForRisk(risk) {
  return RISK_THRESHOLDS[risk] ?? RISK_THRESHOLDS.destructive;
}

/**
 * A Noul near 0.5 means yes and no are about equally likely. It is not "medium".
 * @param {number} probability
 * @param {[number, number]} [band]
 * @returns {"yes" | "no" | "uncertain"}
 */
export function noulVerdict(probability, band = [0.4, 0.6]) {
  if (probability < band[0]) return "no";
  if (probability > band[1]) return "yes";
  return "uncertain";
}

/**
 * Weighted sum of independent signals, normalized by the total weight.
 * Changing weights never needs a new model call.
 * @param {Record<string, number>} signals
 * @param {Record<string, number>} weights
 * @returns {number}
 */
export function compositeScore(signals, weights) {
  let sum = 0;
  let total = 0;
  for (const [id, weight] of Object.entries(weights)) {
    if (!(id in signals)) throw new Error(`compositeScore: missing signal "${id}"`);
    sum += weight * signals[id];
    total += weight;
  }
  return total === 0 ? 0 : sum / total;
}

/**
 * Sort descending by a numeric key. Stable, and does not mutate the input.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => number} key
 * @returns {T[]}
 */
export function rankBy(items, key) {
  return [...items].sort((a, b) => key(b) - key(a));
}
