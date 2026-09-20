// Normalized concentration of a probability distribution: 0 for a uniform spread,
// 1 for all mass on a single outcome. For three options it equals (3 * pmax - 1) / 2,
// the example given in https://docs.typesafe.ai/confidence.md.
//
// The real API computes confidence itself and returns it. Use this only to build demo
// and sample answers, never to overwrite a live answer's confidence.

/**
 * @param {number[]} probs
 * @returns {number}
 */
export function concentration(probs) {
  const n = probs.length;
  if (n < 2) return 1;
  const value = (n * Math.max(...probs) - 1) / (n - 1);
  return Math.max(0, Math.min(1, value));
}
