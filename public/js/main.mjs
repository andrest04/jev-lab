import { h, mount } from "./dom.mjs";
import { getStatus } from "./api.mjs";
import { HomeView } from "./home.mjs";
import { ExampleView } from "./example-view.mjs";
import { PlaygroundView } from "./playground.mjs";
import { LearnView } from "./learn.mjs";
import { getExample } from "/lib/examples.mjs";

const app = document.getElementById("app");
const status = await getStatus();

// --- Theme (explicit choice, otherwise the system theme applies) ----------------------

function effectiveTheme() {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const themeButton = h("button", { class: "iconbtn", type: "button" });

function syncThemeButton() {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  themeButton.textContent = next === "dark" ? "Dark" : "Light";
  themeButton.setAttribute("aria-label", `Switch to ${next} theme`);
}

themeButton.addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("jev-theme", next);
  } catch {
    /* storage unavailable: the choice lasts for this page load */
  }
  syncThemeButton();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncThemeButton);
syncThemeButton();

// --- Shell -----------------------------------------------------------------------------

const live = status.mode === "live";
const nav = h(
  "nav",
  { class: "nav", "aria-label": "Main" },
  [
    ["#/", "Examples", "home"],
    ["#/playground", "Playground", "playground"],
    ["#/learn", "Learn", "learn"],
  ].map(([href, label, key]) => h("a", { href, dataset: { key } }, label)),
);

const main = h("main", { id: "main", tabindex: "-1" });

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
          { class: `pill${live ? " pill-live" : ""}`, title: live ? "Requests go to api.typesafe.ai through this server." : "No TYPESAFE_API_KEY found. Examples replay hand-written samples; the playground uses a keyword heuristic, not Jev." },
          live ? "Live · Jev" : "Demo mode · no key",
        ),
        themeButton,
      ),
    ),
  ),
  h("div", { class: "wrap" }, main),
);

// --- Router ------------------------------------------------------------------------------

function route() {
  const path = location.hash.replace(/^#/, "") || "/";
  const [, section, id] = path.split("/");
  let view;
  let key = "home";
  let title = "Jev Lab";

  if (section === "examples" && getExample(id)) {
    const example = getExample(id);
    view = ExampleView(example, status);
    title = `${example.title} · Jev Lab`;
  } else if (section === "playground") {
    view = PlaygroundView(status);
    key = "playground";
    title = "Playground · Jev Lab";
  } else if (section === "learn") {
    view = LearnView();
    key = "learn";
    title = "Learn · Jev Lab";
  } else {
    view = HomeView(status);
  }

  document.title = title;
  for (const a of nav.querySelectorAll("a")) {
    if (a.dataset.key === key) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  mount(main, view);
  window.scrollTo(0, 0);
}

addEventListener("hashchange", route);
route();
