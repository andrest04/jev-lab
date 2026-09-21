// English dictionary: the source of truth. Flat dotted keys, string values only.
// Product vocabulary (Jev, noul, choice, score, ...) stays English in every language.

/** @type {Record<string, string>} */
export default {
  // App shell
  "nav.aria": "Main",
  "nav.examples": "Examples",
  "nav.playground": "Playground",
  "nav.learn": "Learn",
  "pill.live": "Live · Jev",
  "pill.live.title": "Requests go to api.typesafe.ai through this server.",
  "pill.demo": "Demo mode · no key",
  "pill.demo.title":
    "No TYPESAFE_API_KEY found. Examples replay hand-written samples; the playground uses a keyword heuristic, not Jev.",
  "theme.dark": "Dark",
  "theme.light": "Light",
  "theme.switchToDark": "Switch to dark theme",
  "theme.switchToLight": "Switch to light theme",
  "lang.label": "Language",
  // Document
  "title.home": "Jev Lab",
  "title.playground": "Playground · Jev Lab",
  "title.learn": "Learn · Jev Lab",
  "title.example": "{title} · Jev Lab",
  "meta.description": "A local lab for learning and testing TypeSafe's Jev model.",
};
