// Applies saved explicit preferences before first paint: the theme, and the document
// language. Without a saved theme, the system theme applies.
(function () {
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem("jev-theme");
    if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  } catch (e) {
    /* storage unavailable: keep the system theme */
  }

  // Language. Classic script (no imports), so this duplicates detectLang() from
  // /lib/i18n.mjs: keep the supported list and the order (saved, then navigator) in sync.
  try {
    var supported = ["en", "es"];
    var lang = "en";
    var choice = null;
    try {
      choice = localStorage.getItem("jev-lang");
    } catch (e) {
      /* storage unavailable: detect from the browser */
    }
    if (supported.indexOf(choice) !== -1) {
      lang = choice;
    } else {
      var tags = navigator.languages || [];
      for (var i = 0; i < tags.length; i++) {
        var primary = String(tags[i]).split("-")[0].toLowerCase();
        if (supported.indexOf(primary) !== -1) {
          lang = primary;
          break;
        }
      }
    }
    root.lang = lang;
  } catch (e) {
    /* keep the default lang from the markup */
  }
})();
