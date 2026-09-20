import { test } from "node:test";
import assert from "node:assert/strict";
import { expandSample, SAMPLE_MODEL } from "../lib/fixtures.mjs";
import { concentration } from "../lib/confidence.mjs";
import { buildRequest, noul, choice, score } from "../lib/questions.mjs";

const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);

test("concentration() is 0 for a uniform spread and 1 for certainty", () => {
  assert.equal(concentration([1 / 3, 1 / 3, 1 / 3]), 0);
  assert.equal(concentration([1, 0, 0]), 1);
  assert.equal(concentration([0.5, 0.5]), 0);
});

test("concentration() matches the documented three-option formula", () => {
  const p = 0.88;
  assert.ok(Math.abs(concentration([p, 0.12, 0]) - (3 * p - 1) / 2) < 1e-12);
});

test("expandSample() never claims to be Jev", () => {
  assert.equal(SAMPLE_MODEL, "sample");
  const res = expandSample({ q: noul("q?") }, { q: 0.9 });
  assert.equal(res.model, SAMPLE_MODEL);
});

test("expandSample() turns a number into a noul answer", () => {
  const res = expandSample({ q: noul("q?") }, { q: 0.93 });
  assert.deepEqual(res.answers.q, { type: "noul", noul: 0.93 });
});

test("expandSample() normalizes a choice distribution and picks the argmax", () => {
  const res = expandSample(
    { team: choice("Which?", { billing: null, technical: null, other: null }) },
    { team: { billing: 0.86, technical: 0.1 } },
  );
  const a = res.answers.team;
  assert.equal(a.choice, "billing");
  assert.ok(Math.abs(sum(a.probabilities) - 1) < 1e-9);
  assert.deepEqual(Object.keys(a.probabilities), ["billing", "technical", "other"]);
  assert.equal(a.probabilities.other, 0);
  assert.ok(a.confidence > 0.5 && a.confidence <= 1);
});

test("expandSample() spreads a fractional score between its two neighbouring levels", () => {
  const levels = ["Calm", "Annoyed", "Furious"];
  const a = expandSample({ s: score("How angry?", levels) }, { s: 1.25 }).answers.s;
  assert.deepEqual(a.legend, { 0: "Calm", 1: "Annoyed", 2: "Furious" });
  assert.ok(Math.abs(a.probabilities[1] - 0.75) < 1e-9);
  assert.ok(Math.abs(a.probabilities[2] - 0.25) < 1e-9);
  assert.ok(Math.abs(a.score - 1.25) < 1e-9);
});

test("expandSample() keeps an integer score concentrated on its level", () => {
  const a = expandSample({ s: score("How angry?", ["A", "B", "C"]) }, { s: 1 }).answers.s;
  assert.ok(a.probabilities[1] >= 0.9);
  assert.ok(Math.abs(sum(a.probabilities) - 1) < 1e-9);
  assert.ok(a.score > 0.9 && a.score < 1.1);
});

test("expandSample() accepts an explicit probability list for a score", () => {
  const a = expandSample({ s: score("x", ["A", "B"]) }, { s: [0.2, 0.8] }).answers.s;
  assert.ok(Math.abs(a.score - 0.8) < 1e-9);
});

test("expandSample() fails loudly when a question has no sample", () => {
  assert.throws(
    () => expandSample(buildRequest({ state: "x", questions: { q: noul("q?") } }).questions, {}),
    /no sample for question "q"/,
  );
});
