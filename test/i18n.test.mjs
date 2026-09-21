import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  createT,
  detectLang,
  isSupported,
} from "../lib/i18n.mjs";
import en from "../lib/i18n/en.mjs";
import es from "../lib/i18n/es.mjs";

const PLACEHOLDER = /\{(\w+)\}/g;

/** @param {string} value */
function placeholders(value) {
  return [...value.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();
}

// A dictionary is injected through createT's second argument so behavior is
// tested without depending on the real copy.
const dicts = {
  en: {
    "greet": "Hello {name}",
    "twice": "{x} and {x}",
    "missing": "Hi {who}, you have {n} items",
    "only.en": "English only",
  },
  es: {
    "greet": "Hola {name}",
    "twice": "{x} y {x}",
    "missing": "Hola {who}, tienes {n} elementos",
  },
};

test("SUPPORTED_LANGS is frozen and DEFAULT_LANG is english", () => {
  assert.deepEqual([...SUPPORTED_LANGS], ["en", "es"]);
  assert.ok(Object.isFrozen(SUPPORTED_LANGS));
  assert.equal(DEFAULT_LANG, "en");
});

test("isSupported() accepts only known language codes", () => {
  assert.equal(isSupported("en"), true);
  assert.equal(isSupported("es"), true);
  assert.equal(isSupported("fr"), false);
  assert.equal(isSupported("es-AR"), false);
  assert.equal(isSupported(undefined), false);
  assert.equal(isSupported(null), false);
  assert.equal(isSupported(42), false);
});

test("t() interpolates a single placeholder", () => {
  const t = createT("en", dicts);
  assert.equal(t("greet", { name: "Ana" }), "Hello Ana");
});

test("t() interpolates repeated placeholders", () => {
  const t = createT("en", dicts);
  assert.equal(t("twice", { x: "a" }), "a and a");
});

test("t() leaves a placeholder as-is when its param is missing", () => {
  const t = createT("en", dicts);
  assert.equal(t("missing", { n: 3 }), "Hi {who}, you have 3 items");
  assert.equal(t("greet"), "Hello {name}");
});

test("t() interpolates numbers, including zero", () => {
  const t = createT("en", dicts);
  assert.equal(t("missing", { who: "Ana", n: 0 }), "Hi Ana, you have 0 items");
  assert.equal(t("missing", { who: "Ana", n: 2.5 }), "Hi Ana, you have 2.5 items");
});

test("t() does not re-interpolate values that look like placeholders", () => {
  const t = createT("en", dicts);
  assert.equal(t("greet", { name: "{name}" }), "Hello {name}");
});

test("t() uses the requested language first", () => {
  const t = createT("es", dicts);
  assert.equal(t("greet", { name: "Ana" }), "Hola Ana");
});

test("t() falls back es -> en -> key without throwing", () => {
  const t = createT("es", dicts);
  assert.equal(t("only.en"), "English only");
  assert.equal(t("nope.nothing"), "nope.nothing");
});

test("t() falls back to english for an unsupported language", () => {
  const t = createT("fr", dicts);
  assert.equal(t("greet", { name: "Ana" }), "Hello Ana");
  assert.equal(t.lang, "en");
});

test("t.lang exposes the resolved language", () => {
  assert.equal(createT("es", dicts).lang, "es");
  assert.equal(createT("en", dicts).lang, "en");
});

test("createT() with the bundled dictionaries translates the seed keys", () => {
  assert.equal(createT("en")("nav.examples"), "Examples");
  assert.equal(createT("es")("nav.examples"), "Ejemplos");
  assert.equal(createT("es").lang, "es");
});

test("detectLang() prefers a supported saved language", () => {
  assert.equal(detectLang("es", ["en-US"]), "es");
  assert.equal(detectLang("en", ["es-AR"]), "en");
});

test("detectLang() ignores an invalid saved language", () => {
  assert.equal(detectLang("fr", ["es-AR"]), "es");
  assert.equal(detectLang("", ["en-US"]), "en");
  assert.equal(detectLang(null, undefined), "en");
});

test("detectLang() maps a regional tag to its primary subtag", () => {
  assert.equal(detectLang(undefined, ["es-AR"]), "es");
  assert.equal(detectLang(undefined, ["EN-us"]), "en");
});

test("detectLang() picks the first supported navigator language", () => {
  assert.equal(detectLang(undefined, ["fr-FR", "es-ES"]), "es");
  assert.equal(detectLang(undefined, ["es-ES", "en-US"]), "es");
});

test("detectLang() falls back to english when nothing is supported", () => {
  assert.equal(detectLang(undefined, ["fr-FR", "de"]), "en");
});

test("detectLang() handles empty or missing input", () => {
  assert.equal(detectLang(), "en");
  assert.equal(detectLang(undefined, []), "en");
  assert.equal(detectLang(null, null), "en");
  assert.equal(detectLang(undefined, [undefined, 5, "es"]), "es");
});

// Parity: generic on purpose, so any key added later is checked automatically.
test("parity: en and es define exactly the same keys", () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
});

test("parity: every key keeps the same {placeholders} in en and es", () => {
  for (const key of Object.keys(en)) {
    assert.deepEqual(
      placeholders(es[key] ?? ""),
      placeholders(en[key]),
      `placeholders differ for "${key}"`,
    );
  }
});

test("parity: values are non-empty strings in every language", () => {
  for (const [lang, dict] of Object.entries({ en, es })) {
    for (const [key, value] of Object.entries(dict)) {
      assert.equal(typeof value, "string", `${lang}:${key} must be a string`);
      assert.ok(value.trim().length > 0, `${lang}:${key} must not be empty`);
    }
  }
});

test("parity: keys are flat dotted strings", () => {
  for (const key of Object.keys(en)) {
    assert.match(key, /^[a-z0-9]+(\.[A-Za-z0-9_-]+)*$/, `bad key "${key}"`);
  }
});
