import { test } from "node:test";
import assert from "node:assert/strict";
import {
  costUsd,
  formatUsd,
  estimateTokens,
  estimateRequestTokens,
  fitsContext,
  PRICING,
} from "../lib/cost.mjs";
import { buildRequest, noul } from "../lib/questions.mjs";

test("costUsd() charges $42 per billion input tokens and nothing for output", () => {
  assert.equal(PRICING.usdPerBillionInputTokens, 42);
  assert.ok(Math.abs(costUsd({ input_tokens: 1_000_000, output_tokens: 500 }) - 0.042) < 1e-12);
  assert.equal(costUsd({ input_tokens: 0, output_tokens: 9999 }), 0);
});

test("costUsd() tolerates a missing usage object", () => {
  assert.equal(costUsd(undefined), 0);
});

test("formatUsd() keeps tiny amounts readable", () => {
  assert.equal(formatUsd(0), "$0");
  assert.equal(formatUsd(0.000042), "$0.000042");
  assert.equal(formatUsd(0.042), "$0.042");
  assert.equal(formatUsd(1.5), "$1.50");
});

test("estimateTokens() is a rough four-characters-per-token estimate", () => {
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens("abcd".repeat(10)), 10);
  assert.equal(estimateTokens("abcde"), 2);
});

test("estimateRequestTokens() counts the state and the questions", () => {
  const small = buildRequest({ state: "hi", questions: { q: noul("q?") } });
  const big = buildRequest({ state: "hi ".repeat(500), questions: { q: noul("q?") } });
  assert.ok(estimateRequestTokens(big) > estimateRequestTokens(small));
});

test("fitsContext() respects the 64k token window", () => {
  assert.equal(fitsContext(64_000), true);
  assert.equal(fitsContext(64_001), false);
});
