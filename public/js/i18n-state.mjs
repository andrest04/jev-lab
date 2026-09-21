// Browser wiring for the language store (logic and tests live in /lib/lang-store.mjs).
// Merely touching `localStorage` can throw when site data is blocked, hence the guard.

import { createLangStore } from "/lib/lang-store.mjs";

/** @type {Storage | undefined} */
let storage;
try {
  storage = localStorage;
} catch {
  /* storage blocked: the store falls back to browser languages */
}

const store = createLangStore({
  storage,
  navigatorLanguages: navigator.languages,
  root: document.documentElement,
});

export const { getLang, setLang, t, onLangChange } = store;
