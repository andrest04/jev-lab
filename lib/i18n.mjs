// Isomorphic translator: runs in the browser (served under /lib/) and in Node.
// Dictionaries are flat objects keyed by dotted strings. English is the source of truth.

import en from "./i18n/en.mjs";
import es from "./i18n/es.mjs";

/** @typedef {"en" | "es"} Lang */
/** @typedef {Record<string, string>} Dictionary */
/** @typedef {Record<string, string | number>} Params */
/** @typedef {((key: string, params?: Params) => string) & { lang: Lang }} Translator */

export const SUPPORTED_LANGS = Object.freeze(/** @type {const} */ (["en", "es"]));
export const DEFAULT_LANG = "en";

/** @type {Record<string, Dictionary>} */
const DICTIONARIES = { en, es };

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * @param {unknown} lang
 * @returns {lang is Lang}
 */
export function isSupported(lang) {
  return typeof lang === "string" && SUPPORTED_LANGS.includes(/** @type {Lang} */ (lang));
}

/**
 * Builds a translator. Lookup order: requested language, then English, then the key
 * itself, so a missing string never throws and never renders as undefined.
 * @param {string} lang
 * @param {Record<string, Dictionary>} [dictionaries]
 * @returns {Translator}
 */
export function createT(lang, dictionaries = DICTIONARIES) {
  const resolved = isSupported(lang) ? lang : DEFAULT_LANG;
  const primary = dictionaries[resolved] ?? {};
  const fallback = dictionaries[DEFAULT_LANG] ?? {};

  /** @type {Translator} */
  const t = Object.assign(
    /** @param {string} key @param {Params} [params] */
    (key, params) => {
      const template = primary[key] ?? fallback[key] ?? key;
      if (!params) return template;
      // Single pass, so a param value that looks like {x} is never expanded again.
      return template.replace(PLACEHOLDER, (match, name) =>
        Object.hasOwn(params, name) && params[name] != null ? String(params[name]) : match,
      );
    },
    { lang: resolved },
  );
  return t;
}

/**
 * Like interpolation, but returns the pieces so a value can be a DOM node (a link, a
 * code span). Text between placeholders stays in the template, so each language keeps
 * its own word order. An unknown or null value leaves its `{name}` in place.
 * @param {string} template
 * @param {Record<string, unknown>} [values]
 * @returns {unknown[]}
 */
export function fillParts(template, values = {}) {
  /** @type {unknown[]} */
  const parts = [];
  let last = 0;
  for (const match of template.matchAll(PLACEHOLDER)) {
    if (match.index > last) parts.push(template.slice(last, match.index));
    const name = match[1];
    parts.push(Object.hasOwn(values, name) && values[name] != null ? values[name] : match[0]);
    last = match.index + match[0].length;
  }
  if (last < template.length) parts.push(template.slice(last));
  return parts;
}

/**
 * Chooses between `${base}.one` and `${base}.other` for a count, so sentences with a
 * number are written whole in each language instead of glued from fragments. Every
 * plural category other than "one" (e.g. Spanish "many") maps to `.other`.
 * @param {string} lang
 * @param {string} base
 * @param {number} count
 * @returns {string}
 */
export function pluralKey(lang, base, count) {
  let category = "other";
  try {
    category = new Intl.PluralRules(lang).select(count);
  } catch {
    /* unknown language tag: only exactly 1 is singular */
    if (count === 1) category = "one";
  }
  return `${base}.${category === "one" ? "one" : "other"}`;
}

/**
 * Picks the UI language: a valid saved choice wins, then the first browser language
 * whose primary subtag is supported, then the default.
 * @param {unknown} [saved]
 * @param {readonly unknown[] | null} [navigatorLanguages] BCP47 tags such as "es-AR".
 * @returns {Lang}
 */
export function detectLang(saved, navigatorLanguages) {
  if (isSupported(saved)) return saved;
  for (const tag of navigatorLanguages ?? []) {
    if (typeof tag !== "string") continue;
    const primary = tag.split("-")[0].toLowerCase();
    if (isSupported(primary)) return primary;
  }
  return DEFAULT_LANG;
}
