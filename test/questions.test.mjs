import { test } from "node:test";
import assert from "node:assert/strict";
import {
  noul,
  choice,
  score,
  validateRequest,
  buildRequest,
  LIMITS,
  DEFAULT_MODEL,
} from "../lib/questions.mjs";

test("noul() builds a typed question and omits criteria when none are given", () => {
  assert.deepEqual(noul("Does this convey urgency?"), {
    type: "noul",
    instructions: "Does this convey urgency?",
  });
});

test("noul() keeps explicit true/false criteria", () => {
  const q = noul("Is it urgent?", { true: "Time-sensitive", false: "No deadline" });
  assert.deepEqual(q.criteria, { true: "Time-sensitive", false: "No deadline" });
});

test("choice() keeps options, including options without a description", () => {
  const q = choice("Which team?", { billing: "Refunds", other: null });
  assert.equal(q.type, "choice");
  assert.deepEqual(q.criteria, { billing: "Refunds", other: null });
});

test("score() keeps ordered levels", () => {
  const q = score("How frustrated?", ["Calm", "Frustrated", "Very angry"]);
  assert.equal(q.type, "score");
  assert.deepEqual(q.criteria, ["Calm", "Frustrated", "Very angry"]);
});

test("buildRequest() defaults the model to jev-latest and keeps question order", () => {
  const req = buildRequest({
    state: "hello",
    questions: { b: noul("b?"), a: noul("a?") },
  });
  assert.equal(req.model, DEFAULT_MODEL);
  assert.equal(DEFAULT_MODEL, "jev-latest");
  assert.deepEqual(Object.keys(req.questions), ["b", "a"]);
});

test("validateRequest() accepts a well-formed request", () => {
  const req = buildRequest({
    state: { ticket: "I was charged twice" },
    questions: {
      team: choice("Which team?", { billing: null, technical: null }),
      angry: score("How angry?", ["Calm", "Angry"]),
      refund: noul("Is a refund requested?"),
    },
  });
  assert.deepEqual(validateRequest(req), { ok: true, errors: [] });
});

for (const [label, state] of [
  ["undefined", undefined],
  ["null", null],
  ["blank string", "   "],
]) {
  test(`validateRequest() rejects state that is ${label}`, () => {
    const res = validateRequest({ state, model: "jev-latest", questions: { q: noul("q?") } });
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.path === "state"));
  });
}

test("validateRequest() rejects a missing model and an empty question map", () => {
  const res = validateRequest({ state: "x", questions: {} });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.path === "model"));
  assert.ok(res.errors.some((e) => e.path === "questions"));
});

test("validateRequest() rejects unknown types and blank instructions", () => {
  const res = validateRequest({
    state: "x",
    model: "jev-latest",
    questions: { a: { type: "essay", instructions: "write" }, b: noul("  ") },
  });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.path === "questions.a.type"));
  assert.ok(res.errors.some((e) => e.path === "questions.b.instructions"));
});

test("validateRequest() requires at least two choice options", () => {
  const res = validateRequest(
    buildRequest({ state: "x", questions: { q: choice("Pick", { only: null }) } }),
  );
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.path === "questions.q.criteria"));
});

test("validateRequest() enforces the 255 option cap on choices", () => {
  const options = Object.fromEntries(
    Array.from({ length: LIMITS.maxChoiceOptions + 1 }, (_, i) => [`o${i}`, null]),
  );
  const res = validateRequest(buildRequest({ state: "x", questions: { q: choice("Pick", options) } }));
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.path === "questions.q.criteria"));
  assert.equal(LIMITS.maxChoiceOptions, 255);
});

test("validateRequest() enforces 2 to 10 score levels", () => {
  const tooFew = validateRequest(buildRequest({ state: "x", questions: { q: score("s", ["one"]) } }));
  const tooMany = validateRequest(
    buildRequest({
      state: "x",
      questions: { q: score("s", Array.from({ length: 11 }, (_, i) => `level ${i}`)) },
    }),
  );
  const ok = validateRequest(
    buildRequest({
      state: "x",
      questions: { q: score("s", Array.from({ length: 10 }, (_, i) => `level ${i}`)) },
    }),
  );
  assert.equal(tooFew.ok, false);
  assert.equal(tooMany.ok, false);
  assert.equal(ok.ok, true);
});

test("validateRequest() rejects non-object requests without throwing", () => {
  assert.equal(validateRequest(null).ok, false);
  assert.equal(validateRequest("nope").ok, false);
});

test("validateRequest() adds stable codes without changing English messages", () => {
  const state = validateRequest({ state: "  ", model: "jev-latest", questions: { q: noul("q?") } });
  const stateErr = state.errors.find((e) => e.path === "state");
  assert.equal(stateErr.code, "state_required");
  assert.equal(
    stateErr.message,
    "State is required. Give the model the text or JSON it should judge.",
  );

  const empty = validateRequest({ state: "x", model: "jev-latest", questions: {} });
  const questionsErr = empty.errors.find((e) => e.path === "questions");
  assert.equal(questionsErr.code, "questions_empty");
  assert.equal(questionsErr.message, "Add at least one question.");

  const few = validateRequest(
    buildRequest({ state: "x", questions: { q: choice("Pick", { only: null }) } }),
  );
  const choiceErr = few.errors.find((e) => e.path === "questions.q.criteria");
  assert.equal(choiceErr.code, "choice_too_few");
  assert.equal(choiceErr.message, `A choice needs at least ${LIMITS.minChoiceOptions} options.`);
});
