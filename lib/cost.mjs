// Pricing and limits from https://docs.typesafe.ai/models.md (read 2026-09-20).
// Rates change; treat these as display estimates, not billing.

export const PRICING = Object.freeze({ usdPerBillionInputTokens: 42 });
export const CONTEXT_TOKENS = 64_000;
export const RATE_LIMITS = Object.freeze({ requestsPerMinute: 1200, tokensPerSecond: 250_000 });

/**
 * Output tokens are free, so only input tokens count.
 * @param {{ input_tokens?: number } | undefined} usage
 */
export function costUsd(usage) {
  return ((usage?.input_tokens ?? 0) * PRICING.usdPerBillionInputTokens) / 1e9;
}

/** @param {number} usd */
export function formatUsd(usd) {
  if (usd === 0) return "$0";
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  const fixed = usd.toFixed(6).replace(/0+$/, "");
  return fixed === "0." ? "<$0.000001" : `$${fixed}`;
}

/** Rough estimate: about four characters per token. Real usage comes from the response. */
export function estimateTokens(text) {
  return Math.ceil(String(text).length / 4);
}

/** @param {{ state?: unknown, questions?: unknown }} request */
export function estimateRequestTokens(request) {
  return (
    estimateTokens(JSON.stringify(request.state ?? "")) +
    estimateTokens(JSON.stringify(request.questions ?? {}))
  );
}

/** @param {number} tokens */
export function fitsContext(tokens) {
  return tokens <= CONTEXT_TOKENS;
}
