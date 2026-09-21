import { h, mount } from "./dom.mjs";
import { getStatus } from "./api.mjs";
import { HomeView } from "./home.mjs";
import { ExampleView } from "./example-view.mjs";
import { PlaygroundView } from "./playground.mjs";
import { LearnView } from "./learn.mjs";
import { t, getLang, setLang, onLangChange } from "./i18n-state.mjs";
import { getExample } from "/lib/examples.mjs";
import { SUPPORTED_LANGS } from "/lib/i18n.mjs";

const app = document.getElementById("app");
const status = await getStatus();

// Language names are fixed: each one is shown in its own language in every UI language.
const LANG_NAMES = { en: "English", es: "Español" };

// The shell is rebuilt on every language change, so these always point at the live elements.
let nav;
let main;
let themeButton;

// --- Theme (explicit choice, otherwise the system theme applies) ----------------------

const darkQuery = matchMedia("(prefers-color-scheme: dark)");

function effectiveTheme() {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return darkQuery.matches ? "dark" : "light";
}

function syncThemeButton() {
  if (!themeButton) return;
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  themeButton.textContent = next === "dark" ? t("theme.dark") : t("theme.light");
  themeButton.setAttribute("aria-label", next === "dark" ? t("theme.switchToDark") : t("theme.switchToLight"));
}

function toggleTheme() {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("jev-theme", next);
  } catch {
    /* storage unavailable: the choice lasts for this page load */
  }
  syncThemeButton();
}

// One listener for the page lifetime: the shell rebuild never re-registers it.
darkQuery.addEventListener("change", syncThemeButton);

// --- Shell -----------------------------------------------------------------------------

function LanguageSwitch() {
  const current = getLang();
  return h(
    "div",
    { class: "langswitch", role: "group", "aria-label": t("lang.label") },
    SUPPORTED_LANGS.map((code) =>
      h(
        "button",
        {
          class: "langbtn",
          type: "button",
          lang: code,
          "data-lang": code,
          "aria-pressed": code === current ? "true" : "false",
          "aria-label": LANG_NAMES[code],
          title: LANG_NAMES[code],
          onclick: () => setLang(code),
        },
        code.toUpperCase(),
      ),
    ),
  );
}

function buildShell() {
  const live = status.mode === "live";

  nav = h(
    "nav",
    { class: "nav", "aria-label": t("nav.aria") },
    [
      ["#/", t("nav.examples"), "home"],
      ["#/playground", t("nav.playground"), "playground"],
      ["#/learn", t("nav.learn"), "learn"],
    ].map(([href, label, key]) => h("a", { href, "data-key": key }, label)),
  );

  themeButton = h("button", { class: "iconbtn", type: "button", onclick: toggleTheme });
  syncThemeButton();

  main = h("main", { id: "main", tabindex: "-1" });

  mount(
    app,
    h(
      "header",
      { class: "topbar" },
      h(
        "div",
        { class: "wrap topbar-in" },
        h("a", { class: "brand", href: "#/" }, h("span", { class: "brand-mark", "aria-hidden": "true" }, h("i"), h("i"), h("i")), "Jev Lab"),
        nav,
        h(
          "div",
          { class: "topbar-tools" },
          h(
            "span",
            { class: `pill${live ? " pill-live" : ""}`, title: live ? t("pill.live.title") : t("pill.demo.title") },
            live ? t("pill.live") : t("pill.demo"),
          ),
          LanguageSwitch(),
          themeButton,
        ),
      ),
    ),
    h("div", { class: "wrap" }, main),
  );

  document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.description"));
}

// --- Router ------------------------------------------------------------------------------

/** @param {{ keepScroll?: boolean }} [options] */
function route({ keepScroll = false } = {}) {
  const path = location.hash.replace(/^#/, "") || "/";
  const [, section, id] = path.split("/");
  let view;
  let key = "home";
  let title = t("title.home");

  if (section === "examples" && getExample(id)) {
    const example = getExample(id);
    view = ExampleView(example, status);
    title = t("title.example", { title: example.title });
  } else if (section === "playground") {
    view = PlaygroundView(status);
    key = "playground";
    title = t("title.playground");
  } else if (section === "learn") {
    view = LearnView();
    key = "learn";
    title = t("title.learn");
  } else {
    view = HomeView(status);
  }

  document.title = title;
  for (const a of nav.querySelectorAll("a")) {
    if (a.dataset.key === key) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  mount(main, view);
  if (!keepScroll) window.scrollTo(0, 0);
}

// A language change rebuilds the shell and the current view in place (no reload). The
// scroll position is kept, and focus returns to the switcher button that was used.
onLangChange(() => {
  const focusedLang = document.activeElement?.closest?.(".langswitch") ? document.activeElement.dataset.lang : null;
  const { scrollX, scrollY } = window;
  buildShell();
  route({ keepScroll: true });
  window.scrollTo(scrollX, scrollY);
  if (focusedLang) app.querySelector(`.langbtn[data-lang="${focusedLang}"]`)?.focus({ preventScroll: true });
});

addEventListener("hashchange", () => route());
buildShell();
route();
