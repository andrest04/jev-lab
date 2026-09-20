import { test } from "node:test";
import assert from "node:assert/strict";
import { runDemo, DEMO_MODEL } from "../lib/demo.mjs";
import { buildRequest, noul, choice, score } from "../lib/questions.mjs";

const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);

test("runDemo() never pretends to be Jev", () => {
  const res = runDemo(buildRequest({ state: "hello", questions: { q: noul("Is this a greeting?") } }));
  assert.equal(DEMO_MODEL, "demo-heuristic");
  assert.equal(res.model, DEMO_MODEL);
  assert.doesNotMatch(res.model, /jev/i);
});

test("runDemo() answers every question with the documented shape", () => {
  const res = runDemo(
    buildRequest({
      state: { text: "I was charged twice and I am furious" },
      questions: {
        team: choice("Which team?", { billing: "charged, refund, invoice", technical: "bug, error" }),
        angry: score("How angry?", ["Calm", "Annoyed", "Furious"]),
        refund: noul("Is a refund requested?"),
      },
    }),
  );
  assert.deepEqual(Object.keys(res.answers), ["team", "angry", "refund"]);
  assert.equal(res.answers.team.type, "choice");
  assert.equal(res.answers.angry.type, "score");
  assert.equal(res.answers.refund.type, "noul");
  assert.ok(res.usage.input_tokens > 0);
});

test("runDemo() picks the choice whose words appear in the state", () => {
  const res = runDemo(
    buildRequest({
      state: "I was charged twice, please refund the invoice",
      questions: {
        team: choice("Which team?", {
          billing: "charged, refund, invoice, payment",
          technical: "bug, error, crash, outage",
        }),
      },
    }),
  );
  const a = res.answers.team;
  assert.equal(a.choice, "billing");
  assert.ok(Math.abs(sum(a.probabilities) - 1) < 1e-9);
  assert.ok(a.probabilities.billing > a.probabilities.technical);
  assert.ok(a.confidence >= 0 && a.confidence <= 1);
});

test("runDemo() spreads probability and reports low confidence when nothing matches", () => {
  const res = runDemo(
    buildRequest({
      state: "zzz qqq",
      questions: { team: choice("Which team?", { billing: "invoice", technical: "bug" }) },
    }),
  );
  const a = res.answers.team;
  assert.ok(Math.abs(a.probabilities.billing - a.probabilities.technical) < 1e-9);
  assert.ok(a.confidence < 0.05);
});

test("runDemo() gives a noul more probability when more of its keywords are present", () => {
  const ask = (state) =>
    runDemo(
      buildRequest({
        state,
        questions: { q: noul("Does the message request a refund for a duplicate charge?") },
      }),
    ).answers.q.noul;
  const none = ask("The weather is nice today");
  const some = ask("Please refund me");
  const many = ask("Please refund this duplicate charge, I was charged twice");
  assert.ok(none > 0 && none < some && some < many && many < 1);
});

test("runDemo() returns a fractional score with a legend and probabilities", () => {
  const levels = ["Calm", "Annoyed", "Furious"];
  const ask = (state) =>
    runDemo(buildRequest({ state, questions: { q: score("How angry is the customer?", levels) } })).answers.q;
  const calm = ask("Thanks, everything works fine.");
  const angry = ask("This is UNACCEPTABLE!!! I am furious and want to cancel ASAP.");
  assert.deepEqual(angry.legend, { 0: "Calm", 1: "Annoyed", 2: "Furious" });
  assert.ok(Math.abs(sum(angry.probabilities) - 1) < 1e-9);
  assert.ok(angry.score > calm.score);
  assert.ok(angry.score >= 0 && angry.score <= 2);
});

test("runDemo() is deterministic", () => {
  const req = buildRequest({
    state: "Reset my password please",
    questions: { q: choice("Intent?", { account: "password, login", billing: "invoice" }) },
  });
  assert.deepEqual(runDemo(req), runDemo(req));
});
