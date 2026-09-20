import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXAMPLES,
  getExample,
  DEFAULT_POLICY,
  PHISH_DEFAULTS,
  phishVerdict,
  rankLines,
} from "../lib/examples.mjs";
import { expandSample } from "../lib/fixtures.mjs";
import { buildRequest } from "../lib/questions.mjs";
import { validateRequest } from "../lib/questions.mjs";

const answersFor = (exampleId, presetId) => {
  const example = getExample(exampleId);
  const preset = example.presets.find((p) => p.id === presetId);
  assert.ok(preset, `missing preset ${exampleId}/${presetId}`);
  return expandSample(example.questions(preset.state), preset.sample).answers;
};

const decideFor = (exampleId, presetId, policy = DEFAULT_POLICY) => {
  const example = getExample(exampleId);
  const preset = example.presets.find((p) => p.id === presetId);
  return example.decide(answersFor(exampleId, presetId), { policy, state: preset.state });
};

// Resolve a path like `lines.L3` or `ticket.messages[0].text` inside a state value.
function resolves(state, pathText) {
  let cursor = state;
  for (const part of pathText.match(/[^.[\]]+/g) ?? []) {
    if (cursor === null || typeof cursor !== "object" || !(part in cursor)) return false;
    cursor = cursor[part];
  }
  return true;
}

test("there are six examples with unique ids", () => {
  assert.equal(EXAMPLES.length, 6);
  assert.equal(new Set(EXAMPLES.map((e) => e.id)).size, EXAMPLES.length);
});

for (const example of EXAMPLES) {
  test(`${example.id}: metadata, presets and logic are complete`, () => {
    assert.ok(example.title && example.tagline && example.pattern && example.lesson);
    assert.ok(example.primitives.length >= 1);
    assert.ok(example.presets.length >= 3, "needs at least three presets");
    assert.ok(example.logic.trim().length > 20, "needs an illustrative logic snippet");
    assert.equal(new Set(example.presets.map((p) => p.id)).size, example.presets.length);
  });

  test(`${example.id}: every preset builds a valid request that its sample fully answers`, () => {
    for (const preset of example.presets) {
      const questions = example.questions(preset.state);
      const request = buildRequest({ state: preset.state, questions });
      const check = validateRequest(request);
      assert.deepEqual(check.errors, [], `${preset.id} produced an invalid request`);
      const { answers } = expandSample(questions, preset.sample);
      assert.deepEqual(Object.keys(answers), Object.keys(questions));
      const decision = example.decide(answers, { policy: DEFAULT_POLICY, state: preset.state });
      assert.ok(decision.headline && decision.tone && Array.isArray(decision.rows));
    }
  });

  test(`${example.id}: backticked state paths in instructions exist in the state`, () => {
    for (const preset of example.presets) {
      for (const q of Object.values(example.questions(preset.state))) {
        const text = typeof q.instructions === "string" ? q.instructions : JSON.stringify(q.instructions);
        for (const [, ref] of text.matchAll(/`([^`]+)`/g)) {
          assert.ok(resolves(preset.state, ref), `"${ref}" does not resolve in ${preset.id}`);
        }
      }
    }
  });
}

test("ticket desk: a clear billing ticket goes to billing with the refund macro", () => {
  const d = decideFor("ticket-desk", "double-charge");
  assert.equal(d.headline, "Route to billing");
  assert.equal(d.tone, "act");
  assert.match(JSON.stringify(d.rows), /refund macro/i);
});

test("ticket desk: a vague ticket escalates to a human instead of guessing a team", () => {
  const d = decideFor("ticket-desk", "vague-ping");
  assert.equal(d.tone, "escalate");
  assert.match(d.headline, /human triage/i);
});

test("ticket desk: a churn threat is high priority and notifies retention", () => {
  const d = decideFor("ticket-desk", "threat-to-leave");
  const text = JSON.stringify(d.rows);
  assert.match(text, /High/);
  assert.match(text, /retention/i);
});

test("ticket desk: a stricter policy changes the decision without new answers", () => {
  const lenient = decideFor("ticket-desk", "double-charge", { act: 0.5, escalate: 0.2 });
  const strict = decideFor("ticket-desk", "double-charge", { act: 0.99, escalate: 0.95 });
  assert.equal(lenient.tone, "act");
  assert.notEqual(strict.tone, "act");
});

test("phish check: default weights separate phishing from a legitimate invoice", () => {
  const verdict = (presetId) => {
    const a = answersFor("phish-check", presetId);
    const signals = Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v.noul]));
    return phishVerdict(signals, PHISH_DEFAULTS.weights, PHISH_DEFAULTS.threshold);
  };
  assert.equal(verdict("bank-alert").verdict, "phishing");
  assert.equal(verdict("prize-draw").verdict, "phishing");
  assert.equal(verdict("real-invoice").verdict, "safe");
});

test("phish check: re-weighting changes the verdict with the same signals", () => {
  const signals = { credentials: 0.35, mismatch: 0.7, reward: 0.98, urgency: 0.9 };
  const rewardOnly = { credentials: 0, mismatch: 0, reward: 1, urgency: 0 };
  const credentialsOnly = { credentials: 1, mismatch: 0, reward: 0, urgency: 0 };
  assert.equal(phishVerdict(signals, rewardOnly, 0.5).verdict, "phishing");
  // credentials = 0.35 sits in the "suspicious" band: at least 60% of the threshold, below it.
  assert.equal(phishVerdict(signals, credentialsOnly, 0.5).verdict, "suspicious");
  assert.equal(phishVerdict(signals, credentialsOnly, 0.9).verdict, "safe");
});

test("smart home: a clear thermostat command executes and extracts the temperature in code", () => {
  const d = decideFor("smart-home", "warm-bedroom");
  assert.equal(d.tone, "act");
  assert.match(d.headline, /set_temperature/);
  assert.match(d.headline, /22/);
  assert.match(d.headline, /bedroom/);
});

test("smart home: unlocking a door needs confirmation even when the model leans confident", () => {
  const d = decideFor("smart-home", "unlock-door");
  assert.notEqual(d.tone, "act");
  assert.match(d.headline, /unlock/);
});

test("smart home: an ambiguous command escalates", () => {
  assert.equal(decideFor("smart-home", "cozy").tone, "escalate");
});

test("semantic find: ranks the clause about exporting data first for the export query", () => {
  const ranked = rankLines(answersFor("semantic-find", "leave-export"));
  assert.equal(ranked[0].id, "L6");
  assert.equal(ranked.length, 12);
  assert.ok(ranked[0].score >= ranked[1].score);
});

test("semantic find: each query surfaces a different top clause", () => {
  const top = (presetId) => rankLines(answersFor("semantic-find", presetId))[0].id;
  assert.equal(top("payment-fails"), "L4");
  assert.equal(top("private-notes"), "L5");
});

test("citation check: maps each verdict to a clear headline", () => {
  assert.equal(decideFor("citation-check", "supported").headline, "Citation holds");
  assert.equal(decideFor("citation-check", "flipped-number").headline, "Contradicts the source");
  assert.match(decideFor("citation-check", "overreach").headline, /not supported|overstated/i);
});

test("guardrails: allows benign text, blocks injection, redacts personal data", () => {
  assert.match(decideFor("guardrails", "benign").headline, /^Allow/);
  assert.match(decideFor("guardrails", "injection").headline, /^Block/);
  assert.match(decideFor("guardrails", "pii-paste").headline, /^Redact/);
});

test("guardrails: a borderline noul near 0.5 is sent to review, not decided", () => {
  const d = decideFor("guardrails", "borderline-rant");
  assert.match(d.headline, /^Review/);
  assert.equal(d.tone, "confirm");
});
