// Tiny DOM helper. Everything is built with createElement and text nodes, so user
// content can never be interpreted as markup.

import { t } from "./i18n-state.mjs";

const PROPERTIES = new Set(["value", "checked", "disabled", "hidden", "selected", "readOnly", "open"]);

/**
 * @param {string} tag
 * @param {Record<string, any> | null} [props]
 * @param {...any} children
 * @returns {HTMLElement}
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "style" && typeof value === "object") {
      for (const [name, v] of Object.entries(value)) {
        if (name.startsWith("--")) el.style.setProperty(name, String(v));
        else el.style[name] = v;
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (PROPERTIES.has(key)) el[key] = value;
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** Replace all children of an element. */
export function mount(el, ...children) {
  el.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

/** Text with `backticked` segments rendered as <code>. */
export function rich(text) {
  const parts = String(text).split(/`([^`]+)`/);
  return parts.map((part, i) => (i % 2 === 1 ? h("code", null, part) : part));
}

/** Copy text to the clipboard. Resolves to true on success. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** A code block with a copy button. */
export function codeBlock(text, { label = t("copy.button") } = {}) {
  const button = h("button", { class: "btn btn-small btn-quiet copy", type: "button" }, label);
  button.addEventListener("click", async () => {
    const ok = await copyText(text);
    button.textContent = ok ? t("copy.copied") : t("copy.failed");
    setTimeout(() => (button.textContent = label), 1400);
  });
  return h("div", { class: "code-wrap" }, button, h("pre", { class: "code" }, text));
}
