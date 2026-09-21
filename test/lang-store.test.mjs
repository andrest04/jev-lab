import { test } from "node:test";
import assert from "node:assert/strict";
import { createLangStore, LANG_STORAGE_KEY } from "../lib/lang-store.mjs";

/** In-memory Storage double. */
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    data,
  };
}

const brokenStorage = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
};

test("uses the saved language over the browser languages", () => {
  const root = { lang: "en" };
  const store = createLangStore({
    storage: memoryStorage({ [LANG_STORAGE_KEY]: "es" }),
    navigatorLanguages: ["en-US"],
    root,
  });
  assert.equal(store.getLang(), "es");
  assert.equal(root.lang, "es");
});

test("falls back to browser languages, then english", () => {
  assert.equal(createLangStore({ storage: memoryStorage(), navigatorLanguages: ["es-AR"], root: {} }).getLang(), "es");
  assert.equal(createLangStore({ storage: memoryStorage(), navigatorLanguages: ["fr"], root: {} }).getLang(), "en");
  assert.equal(createLangStore({ storage: memoryStorage(), root: {} }).getLang(), "en");
});

test("ignores an invalid saved value", () => {
  const store = createLangStore({
    storage: memoryStorage({ [LANG_STORAGE_KEY]: "klingon" }),
    navigatorLanguages: ["es"],
    root: {},
  });
  assert.equal(store.getLang(), "es");
});

test("survives storage that throws on read and write", () => {
  const store = createLangStore({ storage: brokenStorage, navigatorLanguages: ["es"], root: {} });
  assert.equal(store.getLang(), "es");
  assert.doesNotThrow(() => store.setLang("en"));
  assert.equal(store.getLang(), "en");
});

test("works with no storage at all", () => {
  const store = createLangStore({ navigatorLanguages: ["en"], root: {} });
  store.setLang("es");
  assert.equal(store.getLang(), "es");
});

test("setLang persists, updates root.lang and notifies subscribers", () => {
  const storage = memoryStorage();
  const root = { lang: "en" };
  const store = createLangStore({ storage, navigatorLanguages: ["en"], root });
  const seen = [];
  store.onLangChange((lang) => seen.push(lang));
  store.setLang("es");
  assert.equal(storage.data.get(LANG_STORAGE_KEY), "es");
  assert.equal(root.lang, "es");
  assert.deepEqual(seen, ["es"]);
});

test("setLang ignores unsupported languages and no-op changes", () => {
  const root = { lang: "en" };
  const store = createLangStore({ storage: memoryStorage(), navigatorLanguages: ["en"], root });
  const seen = [];
  store.onLangChange((lang) => seen.push(lang));
  store.setLang("fr");
  store.setLang("en");
  assert.deepEqual(seen, []);
  assert.equal(store.getLang(), "en");
  assert.equal(root.lang, "en");
});

test("onLangChange returns an unsubscribe", () => {
  const store = createLangStore({ storage: memoryStorage(), navigatorLanguages: ["en"], root: {} });
  const seen = [];
  const off = store.onLangChange((lang) => seen.push(lang));
  store.setLang("es");
  off();
  store.setLang("en");
  assert.deepEqual(seen, ["es"]);
});

test("a throwing subscriber does not block the others", () => {
  const store = createLangStore({ storage: memoryStorage(), navigatorLanguages: ["en"], root: {} });
  const seen = [];
  store.onLangChange(() => {
    throw new Error("boom");
  });
  store.onLangChange((lang) => seen.push(lang));
  store.setLang("es");
  assert.deepEqual(seen, ["es"]);
});

test("t always uses the latest language", () => {
  const store = createLangStore({ storage: memoryStorage(), navigatorLanguages: ["en"], root: {} });
  const t = store.t;
  assert.equal(t("nav.examples"), "Examples");
  store.setLang("es");
  assert.equal(t("nav.examples"), "Ejemplos");
});
