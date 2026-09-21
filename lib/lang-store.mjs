// Language state: the current UI language, its persistence and change notifications.
// Pure and isomorphic: storage, browser languages and the <html> element are injected,
// so it runs (and is tested) in Node and is wired to the real browser in public/js/i18n-state.mjs.

import { createT, detectLang, isSupported } from "./i18n.mjs";

/** @typedef {import("./i18n.mjs").Lang} Lang */
/** @typedef {import("./i18n.mjs").Translator} Translator */

export const LANG_STORAGE_KEY = "jev-lang";

/**
 * @param {object} deps
 * @param {{ getItem(key: string): string | null, setItem(key: string, value: string): void }} [deps.storage]
 * @param {readonly unknown[] | null} [deps.navigatorLanguages]
 * @param {{ lang: string }} deps.root The <html> element (anything with a settable `lang`).
 */
export function createLangStore({ storage, navigatorLanguages, root }) {
  /** @type {Set<(lang: Lang) => void>} */
  const listeners = new Set();

  /** @type {string | null} */
  let saved = null;
  try {
    saved = storage?.getItem(LANG_STORAGE_KEY) ?? null;
  } catch {
    /* storage unavailable: detect from the browser */
  }

  /** @type {Lang} */
  let lang = detectLang(saved, navigatorLanguages);
  /** @type {Translator} */
  let translator = createT(lang);
  root.lang = lang;

  return {
    getLang: () => lang,

    /**
     * Always resolves against the latest language, so it is safe to hold on to.
     * @type {(key: string, params?: import("./i18n.mjs").Params) => string}
     */
    t: (key, params) => translator(key, params),

    /** @param {string} next */
    setLang(next) {
      if (!isSupported(next) || next === lang) return;
      lang = next;
      translator = createT(lang);
      root.lang = lang;
      try {
        storage?.setItem(LANG_STORAGE_KEY, lang);
      } catch {
        /* storage unavailable: the choice lasts for this page load */
      }
      for (const listener of [...listeners]) {
        try {
          listener(lang);
        } catch {
          /* one failing subscriber must not block the others */
        }
      }
    },

    /**
     * @param {(lang: Lang) => void} callback
     * @returns {() => void} unsubscribe
     */
    onLangChange(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}
