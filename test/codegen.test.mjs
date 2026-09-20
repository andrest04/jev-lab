import { test } from "node:test";
import assert from "node:assert/strict";
import { toCurl, toFetch, toPython, pyLiteral } from "../lib/codegen.mjs";
import { buildRequest, noul, choice, score } from "../lib/questions.mjs";

const request = buildRequest({
  state: { ticket: "I'm being charged twice — please fix ASAP", flags: [true, null] },
  questions: {
    team: choice("Which team?", { billing: "Payments", other: null }),
    angry: score("How angry?", ["Calm", "Angry"]),
    refund: noul("Is a refund requested?"),
  },
});

test("toCurl() posts the exact request body to the systemone endpoint", () => {
  const out = toCurl(request);
  assert.match(out, /https:\/\/api\.typesafe\.ai\/v1\/systemone/);
  assert.match(out, /Authorization: Bearer \$TYPESAFE_API_KEY/);
  const body = out.split("<<'EOF'\n")[1].split("\nEOF")[0];
  assert.deepEqual(JSON.parse(body), request);
});

test("toCurl() survives single quotes in the state", () => {
  const out = toCurl(request);
  assert.ok(out.includes("I'm being charged twice"));
});

test("toFetch() reads the key from the environment and never inlines one", () => {
  const out = toFetch(request);
  assert.match(out, /process\.env\.TYPESAFE_API_KEY/);
  assert.match(out, /https:\/\/api\.typesafe\.ai\/v1\/systemone/);
  assert.doesNotMatch(out, /Bearer [A-Za-z0-9]{8,}/);
});

test("pyLiteral() renders JSON values as valid Python literals", () => {
  assert.equal(pyLiteral(null), "None");
  assert.equal(pyLiteral(true), "True");
  assert.equal(pyLiteral(false), "False");
  assert.equal(pyLiteral(3), "3");
  assert.equal(pyLiteral("it's"), '"it\'s"');
  assert.equal(pyLiteral([1, null]), "[1, None]");
  assert.equal(pyLiteral({ a: true }), '{"a": True}');
});

test("toPython() imports only the question classes it uses", () => {
  const out = toPython(request);
  assert.match(out, /from typesafe_sdk import Choice, Noul, Score, TypeSafeClient/);
  const noulOnly = toPython(buildRequest({ state: "x", questions: { q: noul("q?") } }));
  assert.match(noulOnly, /from typesafe_sdk import Noul, TypeSafeClient/);
  assert.doesNotMatch(noulOnly, /Choice|Score/);
});

test("toPython() maps each question to its SDK class with keyword arguments", () => {
  const out = toPython(request);
  assert.match(out, /"team": Choice\(instructions="Which team\?", criteria=\{"billing": "Payments", "other": None\}\)/);
  assert.match(out, /"angry": Score\(instructions="How angry\?", criteria=\["Calm", "Angry"\]\)/);
  assert.match(out, /"refund": Noul\(instructions="Is a refund requested\?"\)/);
  assert.match(out, /"flags": \[True, None\]/);
});
