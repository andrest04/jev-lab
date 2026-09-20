import { test } from "node:test";
import assert from "node:assert/strict";
import {
  confidenceTier,
  thresholdsForRisk,
  noulVerdict,
  compositeScore,
  rankBy,
} from "../lib/routing.mjs";

test("confidenceTier() acts, confirms or escalates with the default thresholds", () => {
  assert.equal(confidenceTier(0.9), "act");
  assert.equal(confidenceTier(0.8), "act");
  assert.equal(confidenceTier(0.6), "confirm");
  assert.equal(confidenceTier(0.5), "confirm");
  assert.equal(confidenceTier(0.3), "escalate");
});

test("confidenceTier() honors custom thresholds", () => {
  const t = { act: 0.95, escalate: 0.7 };
  assert.equal(confidenceTier(0.94, t), "confirm");
  assert.equal(confidenceTier(0.95, t), "act");
  assert.equal(confidenceTier(0.69, t), "escalate");
});

test("thresholdsForRisk() gets stricter as the consequences grow", () => {
  const read = thresholdsForRisk("read");
  const write = thresholdsForRisk("write");
  const destructive = thresholdsForRisk("destructive");
  assert.ok(read.act < write.act && write.act < destructive.act);
  assert.ok(read.escalate <= write.escalate && write.escalate <= destructive.escalate);
});

test("thresholdsForRisk() fails closed on an unknown risk level", () => {
  assert.deepEqual(thresholdsForRisk("mystery"), thresholdsForRisk("destructive"));
});

test("noulVerdict() treats 0.4 to 0.6 as uncertain, not as medium intensity", () => {
  assert.equal(noulVerdict(0.95), "yes");
  assert.equal(noulVerdict(0.05), "no");
  assert.equal(noulVerdict(0.5), "uncertain");
  assert.equal(noulVerdict(0.4), "uncertain");
  assert.equal(noulVerdict(0.6), "uncertain");
  assert.equal(noulVerdict(0.61), "yes");
  assert.equal(noulVerdict(0.39), "no");
});

test("noulVerdict() accepts a custom band", () => {
  assert.equal(noulVerdict(0.7, [0.2, 0.8]), "uncertain");
  assert.equal(noulVerdict(0.85, [0.2, 0.8]), "yes");
});

test("compositeScore() is the weighted sum of signals", () => {
  const value = compositeScore(
    { credentials: 1, mismatch: 0, reward: 1 },
    { credentials: 0.45, mismatch: 0.3, reward: 0.25 },
  );
  assert.ok(Math.abs(value - 0.7) < 1e-9);
});

test("compositeScore() normalizes weights so the result stays in 0..1", () => {
  assert.equal(compositeScore({ a: 1, b: 0 }, { a: 2, b: 2 }), 0.5);
});

test("compositeScore() returns 0 when every weight is zero", () => {
  assert.equal(compositeScore({ a: 1 }, { a: 0 }), 0);
});

test("compositeScore() throws when a weighted signal is missing", () => {
  assert.throws(() => compositeScore({ a: 1 }, { a: 1, b: 1 }), /missing signal "b"/);
});

test("rankBy() sorts descending and keeps ties in input order", () => {
  const items = [
    { id: "a", s: 0.2 },
    { id: "b", s: 0.9 },
    { id: "c", s: 0.2 },
    { id: "d", s: 0.5 },
  ];
  assert.deepEqual(
    rankBy(items, (x) => x.s).map((x) => x.id),
    ["b", "d", "a", "c"],
  );
  assert.deepEqual(items.map((x) => x.id), ["a", "b", "c", "d"]);
});
