import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "../lib/env.mjs";

test("parseEnv() reads KEY=VALUE lines and skips comments and blanks", () => {
  const env = parseEnv("# comment\n\nTYPESAFE_API_KEY=abc123\nPORT=4173\n");
  assert.deepEqual(env, { TYPESAFE_API_KEY: "abc123", PORT: "4173" });
});

test("parseEnv() strips matching quotes and surrounding spaces", () => {
  const env = parseEnv('A = "quoted value" \nB=\'single\'\nC= plain ');
  assert.deepEqual(env, { A: "quoted value", B: "single", C: "plain" });
});

test("parseEnv() keeps equals signs inside values and handles CRLF", () => {
  const env = parseEnv("TOKEN=a=b=c\r\nOTHER=1\r\n");
  assert.deepEqual(env, { TOKEN: "a=b=c", OTHER: "1" });
});

test("parseEnv() ignores lines without a key", () => {
  assert.deepEqual(parseEnv("=novalue\njust text\n"), {});
});
